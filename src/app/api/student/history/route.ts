import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { studentHistoryQuerySchema } from "@/validators/student";
import { getStudentHistory } from "@/lib/student/service";

/**
 * GET /api/student/history
 * Retrieve booking & attendance history for authenticated student
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== USER_ROLES.STUDENT) {
      return NextResponse.json(
        { success: false, message: "Access restricted to student accounts" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const queryValidation = studentHistoryQuerySchema.safeParse({
      tab: searchParams.get("tab") || undefined,
    });

    const tab = queryValidation.success ? queryValidation.data.tab : "all";

    const result = await getStudentHistory(session.user.id, tab);
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("❌ Error retrieving student history:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while fetching your history" },
      { status: 500 }
    );
  }
}
