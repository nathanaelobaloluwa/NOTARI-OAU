import { NextRequest, NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { createEventSchema, organizerEventFilterSchema } from "@/validators/event";
import { EVENT_STATUS } from "@/constants/oau";

/**
 * GET /api/organizer/events
 * List events belonging to the authenticated organizer with filtering and metrics
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApprovedOrganizer(false);

    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const filter = organizerEventFilterSchema.parse(queryParams);

    await connectToDatabase();

    const query: Record<string, unknown> = {
      organizerId: user.id,
    };

    if (filter.status && filter.status !== "all") {
      query.status = filter.status;
    }

    if (filter.category && filter.category !== "all") {
      query.category = filter.category;
    }

    if (filter.search && filter.search.trim().length > 0) {
      const escaped = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      query.$or = [{ title: searchRegex }, { venue: searchRegex }, { description: searchRegex }];
    }

    const skip = (filter.page - 1) * filter.limit;

    const [events, total, stats] = await Promise.all([
      Event.find(query).sort({ createdAt: -1 }).skip(skip).limit(filter.limit).lean(),
      Event.countDocuments(query),
      Event.aggregate([
        { $match: { organizerId: new (require("mongoose").Types.ObjectId)(user.id) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            registered: { $sum: "$registeredCount" },
          },
        },
      ]),
    ]);

    const metrics = {
      total: 0,
      published: 0,
      pending: 0,
      draft: 0,
      rejected: 0,
      cancelled: 0,
      totalAttendees: 0,
    };

    for (const s of stats) {
      const count = Number(s.count) || 0;
      metrics.total += count;
      metrics.totalAttendees += Number(s.registered) || 0;
      if (s._id === EVENT_STATUS.PUBLISHED) metrics.published = count;
      else if (s._id === EVENT_STATUS.PENDING_APPROVAL) metrics.pending = count;
      else if (s._id === EVENT_STATUS.DRAFT) metrics.draft = count;
      else if (s._id === EVENT_STATUS.REJECTED) metrics.rejected = count;
      else if (s._id === EVENT_STATUS.CANCELLED) metrics.cancelled = count;
    }

    return NextResponse.json(
      {
        success: true,
        events,
        pagination: {
          page: filter.page,
          limit: filter.limit,
          total,
          totalPages: Math.ceil(total / filter.limit) || 1,
        },
        metrics,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 401 });
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    console.error("❌ Error fetching organizer events:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve organizer events." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizer/events
 * Create a new event draft or submit for Superadmin approval
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify approved organizer in MongoDB
    const userWithProfile = await requireApprovedOrganizer(true);

    // 2. Parse & validate request payload
    const body = await req.json();
    const validation = createEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please complete all required event fields correctly.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = validation.data;
    await connectToDatabase();

    // 3. Generate a clean, collision-resistant slug
    const cleanSlugBase = payload.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${cleanSlugBase}-${randomSuffix}`;

    // 4. Calculate total capacity and initialize ticket tier availability
    const totalCapacity = payload.ticketTiers.reduce((sum, t) => sum + t.capacity, 0);
    const preparedTicketTiers = payload.ticketTiers.map((t) => ({
      name: t.name,
      price: t.price,
      capacity: t.capacity,
      available: t.capacity,
      description: t.description || "",
      maxPerOrder: t.maxPerOrder || 5,
      salesStartDate: t.salesStartDate ? new Date(t.salesStartDate) : undefined,
      salesEndDate: t.salesEndDate ? new Date(t.salesEndDate) : undefined,
    }));

    // 5. Determine display organizer name
    const orgProfile = userWithProfile.organizerProfile;
    const organizerDisplayName =
      orgProfile?.displayName ||
      orgProfile?.organizationName ||
      userWithProfile.name ||
      "Campus Organizer";

    // 6. Security rule: Organizers can never directly publish events
    const initialStatus =
      payload.status === EVENT_STATUS.PENDING_APPROVAL
        ? EVENT_STATUS.PENDING_APPROVAL
        : EVENT_STATUS.DRAFT;

    const eventData = {
      title: payload.title,
      slug,
      summary: payload.summary,
      description: payload.description,
      organizerId: userWithProfile.id,
      organizerName: organizerDisplayName,
      category: payload.category,
      eventType: payload.eventType,
      faculty: payload.faculty || undefined,
      department: payload.department || undefined,
      venue: payload.venue,
      address: payload.address || undefined,
      onlineDetails: payload.onlineDetails,
      targetAudience: payload.targetAudience,
      tags: payload.tags || [],
      contactEmail: payload.contactEmail || userWithProfile.email,
      contactPhone: payload.contactPhone || undefined,
      instructions: payload.instructions,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      salesStartDate: payload.salesStartDate ? new Date(payload.salesStartDate) : undefined,
      salesEndDate: payload.salesEndDate ? new Date(payload.salesEndDate) : undefined,
      flyerUrl: payload.flyerUrl || undefined,
      galleryUrls: payload.galleryUrls || [],
      isFree: payload.isFree,
      ticketTiers: preparedTicketTiers,
      totalCapacity,
      registeredCount: 0,
      status: initialStatus,
      isFeatured: false,
      submittedAt: initialStatus === EVENT_STATUS.PENDING_APPROVAL ? new Date() : undefined,
    };

    const newEvent = await Event.create(eventData);

    const message =
      initialStatus === EVENT_STATUS.PENDING_APPROVAL
        ? "Event created and submitted for Superadmin review."
        : "Event saved as draft successfully.";

    return NextResponse.json(
      {
        success: true,
        message,
        event: newEvent,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 401 });
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    console.error("❌ Error creating organizer event:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create event." },
      { status: 500 }
    );
  }
}

