import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import { createEventSchema, eventFilterSchema } from "@/validators/event";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { EVENT_STATUS } from "@/constants/oau";

/**
 * GET /api/events
 * Fetch public events with search, category, and pagination filters from MongoDB.
 * Strictly filters by status: EVENT_STATUS.PUBLISHED.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validated = eventFilterSchema.parse(queryParams);

    await connectToDatabase();

    // 1. Strict public visibility rule: only approved and published events
    const mongoQuery: Record<string, unknown> = {
      status: EVENT_STATUS.PUBLISHED,
    };

    // 2. Keyword search
    if (validated.search) {
      const escaped = validated.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      mongoQuery.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { organizerName: searchRegex },
        { venue: searchRegex },
      ];
    }

    // 3. Category filter
    if (validated.category) {
      mongoQuery.category = validated.category;
    }

    // 4. Faculty filter
    if (validated.faculty) {
      mongoQuery.faculty = validated.faculty;
    }

    // 5. Free / Paid filter
    if (validated.isFree !== undefined) {
      mongoQuery.isFree = validated.isFree === "true";
    }

    // 6. Date filtering
    if (validated.date) {
      const now = new Date();
      if (validated.date === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        mongoQuery.startDate = { $gte: startOfDay, $lte: endOfDay };
      } else if (validated.date === "this_week") {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        mongoQuery.startDate = { $gte: now, $lte: endOfWeek };
      } else if (validated.date === "this_month") {
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        mongoQuery.startDate = { $gte: now, $lte: endOfMonth };
      }
    }

    const skip = (validated.page - 1) * validated.limit;

    const [events, total] = await Promise.all([
      Event.find(mongoQuery)
        .select("-rejectionReason")
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(validated.limit)
        .lean(),
      Event.countDocuments(mongoQuery),
    ]);

    return apiSuccess(events, "Events retrieved successfully", 200, {
      page: validated.page,
      limit: validated.limit,
      total,
      totalPages: Math.ceil(total / validated.limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events
 * Submit a new event for approval (Validates input with Zod and enforces role authorization)
 */
export async function POST(request: NextRequest) {
  try {
    // Enforce server-side authorization: only verified approved organizers or admins can submit events
    const authUser = await requireApprovedOrganizer(true);

    const body = await request.json();
    const validated = createEventSchema.parse(body);

    await connectToDatabase();

    const slug = validated.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .concat(`-${Date.now().toString().slice(-4)}`);

    const totalCapacity = validated.ticketTiers.reduce((acc, t) => acc + t.capacity, 0);

    const ticketTiers = validated.ticketTiers.map((t) => ({
      ...t,
      available: t.capacity,
    }));

    const orgDisplayName =
      authUser.organizerProfile?.displayName ||
      authUser.organizerProfile?.organizationName ||
      authUser.name ||
      "Campus Organizer";

    const newEvent = await Event.create({
      ...validated,
      slug,
      organizerId: authUser.id,
      organizerName: orgDisplayName,
      ticketTiers,
      totalCapacity,
      registeredCount: 0,
      status: validated.status || EVENT_STATUS.DRAFT,
      submittedAt: validated.status === EVENT_STATUS.PENDING_APPROVAL ? new Date() : undefined,
    });

    return apiSuccess(newEvent, "Event submitted successfully for review", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
