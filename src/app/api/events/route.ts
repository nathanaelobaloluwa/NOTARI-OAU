import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api-response";
import { createEventSchema, eventFilterSchema } from "@/validators/event";
import { MOCK_EVENTS } from "@/lib/mock-data";

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

    return apiSuccess(filtered, "Events retrieved successfully", 200, {
      page: validated.page,
      limit: validated.limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / validated.limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events
 * Submit a new event for approval (Validates input with Zod)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createEventSchema.parse(body);

    // Foundation scaffold mock response
    const newEvent = {
      id: `evt-${Date.now()}`,
      ...validated,
      organizer: "Campus Organizer",
      registered: 0,
      available: validated.ticketTiers.reduce((acc, t) => acc + t.capacity, 0),
      createdAt: new Date().toISOString(),
    };

    return apiSuccess(newEvent, "Event submitted successfully for review", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
