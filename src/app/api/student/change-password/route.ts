import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { changePasswordSchema } from "@/validators/student";
import { changeStudentPassword } from "@/lib/student/service";

/**
 * POST /api/student/change-password
 * Change password for authenticated student
 */
export async function POST(req: NextRequest) {
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await changeStudentPassword(session.user.id, validation.data);
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("❌ Error changing student password:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while updating your password" },
      { status: 500 }
    );
  }
}
