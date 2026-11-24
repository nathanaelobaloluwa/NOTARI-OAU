import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { USER_ROLES } from "@/constants/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user || role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Superadmin access required." },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const roleFilter = searchParams.get("role")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { matricNumber: searchRegex },
        { faculty: searchRegex },
        { department: searchRegex },
      ];
    }

    if (roleFilter && roleFilter !== "all") {
      query.role = roleFilter;
    }

    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -passwordResetToken -passwordResetExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Admin users API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve users." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    const currentRole = (session?.user as { role?: string })?.role;

    if (!session?.user || currentRole !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Superadmin access required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { userId, role, status, isOrganizer } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid target userId is required." },
        { status: 400 }
      );
    }

    // Guard: Superadmin cannot demote or suspend themselves
    if (userId === currentUserId) {
      return NextResponse.json(
        { success: false, message: "You cannot modify your own administrative role or status." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Target user not found." },
        { status: 404 }
      );
    }

    if (role !== undefined) {
      if (!Object.values(USER_ROLES).includes(role)) {
        return NextResponse.json(
          { success: false, message: `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(", ")}` },
          { status: 400 }
        );
      }
      targetUser.role = role;
      if (role === USER_ROLES.ORGANIZER) {
        targetUser.isOrganizer = true;
      }
    }

    if (status !== undefined) {
      if (status !== "active" && status !== "suspended") {
        return NextResponse.json(
          { success: false, message: "Invalid status. Must be 'active' or 'suspended'." },
          { status: 400 }
        );
      }
      targetUser.status = status;
    }

    if (isOrganizer !== undefined) {
      targetUser.isOrganizer = Boolean(isOrganizer);
    }

    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.name} updated successfully.`,
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
        isOrganizer: targetUser.isOrganizer,
      },
    });
  } catch (error) {
    console.error("❌ Admin user update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user." },
      { status: 500 }
    );
  }
}
