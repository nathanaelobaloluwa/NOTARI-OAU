import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import { createEventSchema, eventFilterSchema } from "@/validators/event";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { requireRole } from "@/lib/auth/rbac";
import { USER_ROLES } from "@/constants/roles";

/**
 * GET /api/events
 * Fetch public events with search, category, and pagination filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const validated = eventFilterSchema.parse(query);

    let filtered = [...MOCK_EVENTS];

    if (validated.search) {
      const s = validated.search.toLowerCase();
      filtered = filtered.filter(
        (e) => e.title.toLowerCase().includes(s) || e.organizer.toLowerCase().includes(s)
      );
    }

    if (validated.category) {
      filtered = filtered.filter((e) => e.category === validated.category);
    }

    if (validated.faculty) {
      filtered = filtered.filter((e) => e.faculty === validated.faculty);
    }

    const total = filtered.length;
    const startIndex = (validated.page - 1) * validated.limit;
    const paginated = filtered.slice(startIndex, startIndex + validated.limit);

    return apiSuccess(paginated, "Events retrieved successfully", 200, {
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
    // Enforce server-side authorization: only organizers or admins can submit events
    const authUser = await requireRole([USER_ROLES.ORGANIZER, USER_ROLES.ADMIN]);

    const body = await request.json();
    const validated = createEventSchema.parse(body);

    // Foundation scaffold response with authenticated organizer identity
    const newEvent = {
      id: `evt-${Date.now()}`,
      ...validated,
      organizerId: authUser.id,
      organizer: authUser.name,
      registered: 0,
      available: validated.ticketTiers.reduce((acc, t) => acc + t.capacity, 0),
      createdAt: new Date().toISOString(),
    };

    return apiSuccess(newEvent, "Event submitted successfully for review", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
