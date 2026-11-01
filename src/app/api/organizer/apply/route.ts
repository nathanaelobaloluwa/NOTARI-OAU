import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { OrganizerApplication } from "@/models/OrganizerApplication";
import { OrganizerProfile } from "@/models/OrganizerProfile";
import { organizerApplicationSchema } from "@/validators/organizer";
import { APPLICATION_STATUS } from "@/constants/organizer";
import { USER_ROLES } from "@/constants/roles";
import { notificationService } from "@/services/notification.service";

/**
 * GET /api/organizer/apply
 * Retrieve current authenticated user's organizer application and profile status
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required to access application status." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const [latestApplication, profile] = await Promise.all([
      OrganizerApplication.findOne({ userId: session.user.id }).sort({ createdAt: -1 }).lean(),
      OrganizerProfile.findOne({ userId: session.user.id }).lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        application: latestApplication || null,
        hasProfile: !!profile,
        profileStatus: profile?.status || null,
        isOrganizer: Boolean(session.user.isOrganizer || profile?.status === "approved"),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error fetching organizer application:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while fetching your application." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizer/apply
 * Submit a new application or resubmit revisions if changes were requested
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be signed in to submit an organizer application." },
        { status: 401 }
      );
    }

    if (session.user.role === USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Administrators cannot submit organizer applications." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = organizerApplicationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please complete all required fields correctly.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = validation.data;
    await connectToDatabase();

    // 1. Check if user already has an active or approved profile
    const existingProfile = await OrganizerProfile.findOne({
      userId: session.user.id,
      status: "approved",
    });
    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is already an accredited organizer on NOTARI 2.0.",
        },
        { status: 400 }
      );
    }

    // 2. Check existing applications
    const activeApp = await OrganizerApplication.findOne({
      userId: session.user.id,
      status: {
        $in: [
          APPLICATION_STATUS.PENDING,
          APPLICATION_STATUS.APPROVED,
          APPLICATION_STATUS.CHANGES_REQUESTED,
        ],
      },
    }).sort({ createdAt: -1 });

    if (activeApp) {
      if (activeApp.status === APPLICATION_STATUS.PENDING) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You already have an active organizer application pending review by Superadmin. Duplicate submissions are not permitted.",
          },
          { status: 409 }
        );
      }

      if (activeApp.status === APPLICATION_STATUS.APPROVED) {
        return NextResponse.json(
          {
            success: false,
            message: "Your organizer application has already been approved.",
          },
          { status: 400 }
        );
      }

      // If status is CHANGES_REQUESTED -> This is a secure resubmission
      if (activeApp.status === APPLICATION_STATUS.CHANGES_REQUESTED) {
        activeApp.applicantType = payload.applicantType;
        if (payload.applicantType === "individual") {
          activeApp.applicantName = payload.applicantName;
          activeApp.applicantEmail = payload.applicantEmail;
          activeApp.applicantMatricNumber = payload.applicantMatricNumber;
          activeApp.faculty = payload.faculty;
          activeApp.department = payload.department;
          activeApp.phone = payload.phone;
          activeApp.displayName = payload.displayName;
          activeApp.description = payload.description;
          activeApp.reason = payload.reason;
          activeApp.experience = payload.experience;
          activeApp.supportingLinks = payload.supportingLinks;
        } else {
          activeApp.organizationName = payload.organizationName;
          activeApp.organizationCategory = payload.organizationCategory;
          activeApp.organizationDescription = payload.organizationDescription;
          activeApp.faculty = payload.faculty;
          activeApp.department = payload.department;
          activeApp.contactPersonName = payload.contactPersonName;
          activeApp.contactPersonEmail = payload.contactPersonEmail;
          activeApp.contactPersonMatric = payload.contactPersonMatric;
          activeApp.contactPersonPhone = payload.contactPersonPhone;
          activeApp.officialEmail = payload.officialEmail;
          activeApp.reason = payload.reason;
          activeApp.supportingLinks = payload.supportingLinks;
        }

        activeApp.status = APPLICATION_STATUS.PENDING;
        activeApp.submissionCount += 1;
        activeApp.history.push({
          action: "resubmitted",
          timestamp: new Date(),
          notes: "Applicant updated and resubmitted application following requested changes.",
        });

        await activeApp.save();

        const targetEmail =
          payload.applicantType === "individual"
            ? payload.applicantEmail
            : payload.contactPersonEmail;
        const brandName =
          payload.applicantType === "individual"
            ? payload.displayName
            : payload.organizationName;

        await notificationService.notifyApplicationSubmitted({
          applicationId: activeApp._id.toString(),
          recipientEmail: targetEmail,
          applicantName:
            payload.applicantType === "individual"
              ? payload.applicantName
              : payload.contactPersonName,
          applicantType: payload.applicantType,
          organizationOrBrandName: brandName,
        });

        return NextResponse.json(
          {
            success: true,
            message: "Revisions submitted successfully! Your application is now back under review.",
            application: activeApp,
          },
          { status: 200 }
        );
      }
    }

    // 3. New Application Creation
    const newApplicationData: Record<string, unknown> = {
      userId: session.user.id,
      applicantType: payload.applicantType,
      status: APPLICATION_STATUS.PENDING,
      submissionCount: 1,
      history: [
        {
          action: "submitted",
          timestamp: new Date(),
          notes: "Initial organizer application submitted.",
        },
      ],
    };

    if (payload.applicantType === "individual") {
      Object.assign(newApplicationData, {
        applicantName: payload.applicantName,
        applicantEmail: payload.applicantEmail,
        applicantMatricNumber: payload.applicantMatricNumber,
        faculty: payload.faculty,
        department: payload.department,
        phone: payload.phone,
        displayName: payload.displayName,
        description: payload.description,
        reason: payload.reason,
        experience: payload.experience,
        supportingLinks: payload.supportingLinks,
      });
    } else {
      Object.assign(newApplicationData, {
        organizationName: payload.organizationName,
        organizationCategory: payload.organizationCategory,
        organizationDescription: payload.organizationDescription,
        faculty: payload.faculty,
        department: payload.department,
        contactPersonName: payload.contactPersonName,
        contactPersonEmail: payload.contactPersonEmail,
        contactPersonMatric: payload.contactPersonMatric,
        contactPersonPhone: payload.contactPersonPhone,
        officialEmail: payload.officialEmail,
        reason: payload.reason,
        supportingLinks: payload.supportingLinks,
      });
    }

    const application = await OrganizerApplication.create(newApplicationData);

    const targetEmail =
      payload.applicantType === "individual"
        ? payload.applicantEmail
        : payload.contactPersonEmail;
    const brandName =
      payload.applicantType === "individual"
        ? payload.displayName
        : payload.organizationName;

    await notificationService.notifyApplicationSubmitted({
      applicationId: application._id.toString(),
      recipientEmail: targetEmail,
      applicantName:
        payload.applicantType === "individual"
          ? payload.applicantName
          : payload.contactPersonName,
      applicantType: payload.applicantType,
      organizationOrBrandName: brandName,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your organizer application has been submitted successfully for Superadmin review.",
        application,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Organizer application submission error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while processing your application." },
      { status: 500 }
    );
  }
}

