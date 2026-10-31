import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { studentProfileUpdateSchema } from "@/validators/student";
import {
  getStudentProfile,
  updateStudentProfile,
} from "@/lib/student/service";

/**
 * GET /api/student/profile
 * Retrieve authenticated student's profile
 */
export async function GET() {
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

    const result = await getStudentProfile(session.user.id);
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("❌ Error retrieving student profile:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while fetching your profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/student/profile
 * Update authenticated student's editable profile fields
 */
export async function PATCH(req: NextRequest) {
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

    const validation = studentProfileUpdateSchema.safeParse(body);
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

    const result = await updateStudentProfile(session.user.id, validation.data);
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("❌ Error updating student profile:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while updating your profile" },
      { status: 500 }
    );
  }
}
