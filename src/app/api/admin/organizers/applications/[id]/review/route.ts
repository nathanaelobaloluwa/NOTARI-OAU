import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { OrganizerApplication } from "@/models/OrganizerApplication";
import { OrganizerProfile } from "@/models/OrganizerProfile";
import { User } from "@/models/User";
import { applicationReviewSchema } from "@/validators/organizer";
import { USER_ROLES, ORGANIZER_STATUS } from "@/constants/roles";
import { APPLICATION_STATUS } from "@/constants/organizer";
import { notificationService } from "@/services/notification.service";
import mongoose from "mongoose";

/**
 * POST /api/admin/organizers/applications/[id]/review
 * Superadmin decision execution: Approve, Reject, or Request Changes
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Superadmin credentials required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid application ID format." }, { status: 400 });
    }

    const body = await req.json();
    const validation = applicationReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { action, reason, reviewNotes } = validation.data;

    await connectToDatabase();

    const application = await OrganizerApplication.findById(id);
    if (!application) {
      return NextResponse.json({ success: false, message: "Organizer application not found." }, { status: 404 });
    }

    if (application.status === APPLICATION_STATUS.APPROVED) {
      return NextResponse.json(
        { success: false, message: "This application has already been approved." },
        { status: 400 }
      );
    }

    const reviewerOid = new mongoose.Types.ObjectId(session.user.id);
    const now = new Date();

    if (action === "approve") {
      // 1. Update application status
      application.status = APPLICATION_STATUS.APPROVED;
      application.reviewerId = reviewerOid;
      application.reviewerName = session.user.name || "Super Administrator";
      application.reviewedAt = now;
      application.reviewNotes = reviewNotes || "Accreditation approved by Superadmin.";
      application.history.push({
        action: "approved",
        actorId: reviewerOid,
        actorRole: "admin",
        notes: reviewNotes || "Approved accreditation.",
        timestamp: now,
      });
      await application.save();

      // 2. Grant organizer capability on user account without stripping student role
      await User.findByIdAndUpdate(application.userId, {
        isOrganizer: true,
      });

      // 3. Create or activate persistent OrganizerProfile
      const orgName =
        application.applicantType === "individual"
          ? application.displayName || application.applicantName || "Student Organizer"
          : application.organizationName || "Campus Organization";

      const category =
        application.applicantType === "individual"
          ? "Individual Student Organizer"
          : application.organizationCategory || "Campus Organization";

      const description =
        application.applicantType === "individual"
          ? application.description || "Student event organizer"
          : application.organizationDescription || "Campus organization";

      const contactEmail =
        application.applicantType === "individual"
          ? application.applicantEmail || ""
          : application.officialEmail || application.contactPersonEmail || "";

      const contactPhone =
        application.applicantType === "individual"
          ? application.phone || ""
          : application.contactPersonPhone || "";

      const profile = await OrganizerProfile.findOneAndUpdate(
        { userId: application.userId },
        {
          userId: application.userId,
          organizerType: application.applicantType,
          organizationName: orgName,
          displayName: orgName,
          category,
          description,
          contactEmail,
          contactPhone,
          faculty: application.faculty,
          department: application.department,
          status: ORGANIZER_STATUS.APPROVED,
          approvedAt: now,
          approvedBy: reviewerOid,
          approvalNotes: reviewNotes || "Accredited by Superadmin",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // 4. Notify applicant
      await notificationService.notifyApplicationApproved({
        applicationId: application._id.toString(),
        recipientEmail: contactEmail,
        applicantName:
          application.applicantType === "individual"
            ? application.applicantName || ""
            : application.contactPersonName || "",
        brandOrOrgName: orgName,
        reviewerName: session.user.name || "Superadmin",
      });

      return NextResponse.json(
        {
          success: true,
          message: `Organizer application for ${orgName} approved successfully.`,
          application,
          profile,
        },
        { status: 200 }
      );
    }

    if (action === "reject") {
      application.status = APPLICATION_STATUS.REJECTED;
      application.reviewerId = reviewerOid;
      application.reviewerName = session.user.name || "Super Administrator";
      application.reviewedAt = now;
      application.rejectionReason = reason;
      application.history.push({
        action: "rejected",
        actorId: reviewerOid,
        actorRole: "admin",
        notes: reason,
        timestamp: now,
      });
      await application.save();

      const recipientEmail =
        application.applicantType === "individual"
          ? application.applicantEmail || ""
          : application.officialEmail || application.contactPersonEmail || "";

      await notificationService.notifyApplicationRejected({
        applicationId: application._id.toString(),
        recipientEmail,
        applicantName:
          application.applicantType === "individual"
            ? application.applicantName || ""
            : application.contactPersonName || "",
        reason: reason || "Does not meet current university event hosting criteria.",
        reviewerName: session.user.name || "Superadmin",
      });

      return NextResponse.json(
        {
          success: true,
          message: "Organizer application rejected.",
          application,
        },
        { status: 200 }
      );
    }

    if (action === "request_changes") {
      application.status = APPLICATION_STATUS.CHANGES_REQUESTED;
      application.reviewerId = reviewerOid;
      application.reviewerName = session.user.name || "Super Administrator";
      application.reviewedAt = now;
      application.changesRequestedReason = reason;
      application.history.push({
        action: "changes_requested",
        actorId: reviewerOid,
        actorRole: "admin",
        notes: reason,
        timestamp: now,
      });
      await application.save();

      const recipientEmail =
        application.applicantType === "individual"
          ? application.applicantEmail || ""
          : application.officialEmail || application.contactPersonEmail || "";

      await notificationService.notifyChangesRequested({
        applicationId: application._id.toString(),
        recipientEmail,
        applicantName:
          application.applicantType === "individual"
            ? application.applicantName || ""
            : application.contactPersonName || "",
        reason: reason || "Additional information needed.",
        reviewerName: session.user.name || "Superadmin",
      });

      return NextResponse.json(
        {
          success: true,
          message: "Changes requested from applicant.",
          application,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: false, message: "Invalid review action." }, { status: 400 });
  } catch (error) {
    console.error("❌ Error reviewing organizer application:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process application review." },
      { status: 500 }
    );
  }
}

