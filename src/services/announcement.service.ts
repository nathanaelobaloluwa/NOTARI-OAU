import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import {
  Announcement,
  IAnnouncementDocument,
  AnnouncementCategory,
  AnnouncementPriority,
  AudienceType,
} from "@/models/Announcement";
import { User, IUserDocument } from "@/models/User";
import { Event } from "@/models/Event";
import { Ticket } from "@/models/Ticket";
import { Booking } from "@/models/Booking";
import { USER_ROLES } from "@/constants/roles";
import { notificationService } from "./notification.service";
import { reminderService } from "./reminder.service";
import {
  AnnouncementCreateInput,
  AnnouncementUpdateInput,
  AnnouncementReviewInput,
  OrganizerBroadcastInput,
  AnnouncementQueryInput,
} from "@/validators/announcement";

export interface AnnouncementListResult {
  announcements: Array<Record<string, unknown>>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class AnnouncementService {
  /**
   * Creates a campus announcement or organizer broadcast.
   * Enforces server-side role and ownership restrictions.
   */
  async createAnnouncement(
    user: { id: string; role: string; name?: string },
    input: AnnouncementCreateInput
  ): Promise<{ success: boolean; status: number; message: string; announcement?: IAnnouncementDocument }> {
    await connectToDatabase();

    const isSuperOrAdmin = user.role === USER_ROLES.ADMIN;
    const isOrganizer = user.role === USER_ROLES.ORGANIZER || (user as { isOrganizer?: boolean }).isOrganizer;

    if (!isSuperOrAdmin && !isOrganizer) {
      return {
        success: false,
        status: 403,
        message: "Forbidden: Only authorized administrators and campus organizers can post announcements.",
      };
    }

    const targetAudience = input.targetAudience || { type: "all_students" };

    // Organizers must scope announcements to an event they own
    if (!isSuperOrAdmin && isOrganizer) {
      if (targetAudience.type !== "event_attendees" || !targetAudience.eventId) {
        return {
          success: false,
          status: 400,
          message: "Organizers can only post announcements targeted to attendees of their own events.",
        };
      }

      const event = await Event.findById(targetAudience.eventId);
      if (!event) {
        return { success: false, status: 404, message: "Target event not found." };
      }

      if (event.organizerId.toString() !== user.id) {
        return {
          success: false,
          status: 403,
          message: "Forbidden: You cannot post announcements for events you do not own.",
        };
      }
    }

    // Status assignment
    let finalStatus = input.status || "draft";
    let publishedAt: Date | undefined;
    let scheduledFor: Date | undefined;

    if (input.scheduledFor) {
      const scheduledDate = new Date(input.scheduledFor);
      if (scheduledDate > new Date()) {
        finalStatus = "scheduled";
        scheduledFor = scheduledDate;
      } else {
        finalStatus = "published";
        publishedAt = new Date();
      }
    } else if (finalStatus === "published") {
      publishedAt = new Date();
    }

    // Organizers' general announcements may require admin approval unless direct event broadcast
    if (!isSuperOrAdmin && finalStatus === "published" && targetAudience.type !== "event_attendees") {
      finalStatus = "pending_review";
      publishedAt = undefined;
    }

    const announcement = await Announcement.create({
      title: input.title,
      summary: input.summary,
      content: input.content,
      category: input.category,
      coverImage: input.coverImage,
      priority: input.priority || "normal",
      targetAudience: {
        type: targetAudience.type,
        faculty: targetAudience.faculty,
        department: targetAudience.department,
        level: targetAudience.level,
        eventId: targetAudience.eventId
          ? new mongoose.Types.ObjectId(targetAudience.eventId)
          : undefined,
      },
      status: finalStatus,
      scheduledFor,
      publishedAt,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      authorId: new mongoose.Types.ObjectId(user.id),
      authorRole: isSuperOrAdmin ? "admin" : "organizer",
      authorName: user.name || (isSuperOrAdmin ? "OAU Administration" : "Event Organizer"),
      isPinned: Boolean(input.isPinned),
      tags: input.tags || [],
    });

    // If published immediately, trigger background notification dispatches
    if (finalStatus === "published") {
      // Fire-and-forget notification broadcast to prevent blocking API response
      this.broadcastAnnouncementNotifications(announcement._id.toString()).catch((err) =>
        console.error("❌ Error in background announcement broadcast:", err)
      );
    }

    return {
      success: true,
      status: 201,
      message:
        finalStatus === "published"
          ? "Announcement published successfully."
          : finalStatus === "scheduled"
          ? "Announcement scheduled successfully."
          : "Announcement draft created successfully.",
      announcement,
    };
  }

  /**
   * Broadcasts organizer announcement to attendees of an event.
   */
  async createOrganizerBroadcast(
    organizerId: string,
    input: OrganizerBroadcastInput
  ): Promise<{ success: boolean; status: number; message: string; announcement?: IAnnouncementDocument }> {
    await connectToDatabase();

    const event = await Event.findById(input.eventId);
    if (!event) {
      return { success: false, status: 404, message: "Target event not found." };
    }

    if (event.organizerId.toString() !== organizerId) {
      return {
        success: false,
        status: 403,
        message: "Forbidden: You can only broadcast notices to attendees of your own events.",
      };
    }

    // Rate limiting: max 5 organizer broadcasts per event in 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBroadcastCount = await Announcement.countDocuments({
      "targetAudience.eventId": event._id,
      createdAt: { $gte: twentyFourHoursAgo },
    });

    if (recentBroadcastCount >= 5) {
      return {
        success: false,
        status: 429,
        message: "Rate limit reached: You can send at most 5 broadcasts per event within 24 hours.",
      };
    }

    const priority: AnnouncementPriority =
      input.updateType === "cancellation" ? "urgent" : input.updateType === "general" ? "normal" : "high";

    const announcement = await Announcement.create({
      title: input.subjectLine,
      summary: input.message.slice(0, 150),
      content: input.message,
      category: "campus_events",
      priority,
      targetAudience: {
        type: "event_attendees",
        eventId: event._id,
      },
      status: "published",
      publishedAt: new Date(),
      authorId: new mongoose.Types.ObjectId(organizerId),
      authorRole: "organizer",
      authorName: event.organizerName || "Event Organizer",
      tags: ["event_update", input.updateType],
    });

    // Dispatch attendee notifications
    this.broadcastOrganizerBroadcast(announcement._id.toString(), input).catch((err) =>
      console.error("❌ Error broadcasting organizer notice to attendees:", err)
    );

    return {
      success: true,
      status: 201,
      message: "Event announcement broadcast to registered attendees successfully.",
      announcement,
    };
  }

  /**
   * Broadcasts campus announcement notifications (in-app and email) based on targeting.
   */
  async broadcastAnnouncementNotifications(announcementId: string): Promise<void> {
    await connectToDatabase();
    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.status !== "published") return;

    let recipients: Array<{ id: string; name: string; email: string }> = [];

    const audience = announcement.targetAudience;

    if (audience.type === "event_attendees" && audience.eventId) {
      const attendees = await reminderService.getEligibleAttendees(audience.eventId);
      recipients = attendees.map((a) => ({ id: a.userId, name: a.name, email: a.email }));
    } else {
      const userQuery: Record<string, unknown> = {
        role: USER_ROLES.STUDENT,
      };

      if (audience.type === "faculty" && audience.faculty) {
        userQuery.faculty = new RegExp(`^${audience.faculty.trim()}$`, "i");
      } else if (audience.type === "department" && audience.department) {
        userQuery.department = new RegExp(`^${audience.department.trim()}$`, "i");
      } else if (audience.type === "academic_level" && audience.level) {
        userQuery.level = audience.level.trim();
      }

      const users = await User.find(userQuery).select("name email").limit(500).lean();
      recipients = users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email }));
    }

    let inAppSent = 0;
    let emailsQueued = 0;
    let emailsDelivered = 0;
    let emailsFailed = 0;

    for (const recipient of recipients) {
      try {
        inAppSent++;
        const res = await notificationService.notifyCampusAnnouncement({
          userId: recipient.id,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          announcementId: announcement._id,
          title: announcement.title,
          summary: announcement.summary,
          content: announcement.content,
          category: announcement.category,
          priority: announcement.priority,
          authorName: announcement.authorName,
        });

        if (res.delivered) {
          emailsDelivered++;
        } else if (res.success) {
          emailsQueued++;
        } else {
          emailsFailed++;
        }
      } catch (err) {
        emailsFailed++;
        console.error(`❌ Error sending announcement notice to ${recipient.email}:`, err);
      }
    }

    // Update announcement notification metrics
    announcement.notificationStats = {
      inAppSentCount: inAppSent,
      emailsQueuedCount: emailsQueued,
      emailsDeliveredCount: emailsDelivered,
      emailsFailedCount: emailsFailed,
    };
    await announcement.save();
  }

  /**
   * Broadcasts organizer event update notice to all registered attendees.
   */
  async broadcastOrganizerBroadcast(
    announcementId: string,
    broadcast: OrganizerBroadcastInput
  ): Promise<void> {
    await connectToDatabase();
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) return;

    const event = await Event.findById(broadcast.eventId);
    if (!event) return;

    const attendees = await reminderService.getEligibleAttendees(event._id);
    let inAppSent = 0;
    let emailsDelivered = 0;
    let emailsQueued = 0;
    let emailsFailed = 0;

    for (const attendee of attendees) {
      try {
        inAppSent++;
        const res = await notificationService.notifyOrganizerEventBroadcast({
          userId: attendee.userId,
          attendeeName: attendee.name,
          attendeeEmail: attendee.email,
          eventId: event._id,
          eventTitle: event.title,
          broadcastId: announcement._id.toString(),
          updateType: broadcast.updateType,
          subjectLine: broadcast.subjectLine,
          message: broadcast.message,
          organizerName: event.organizerName || "Event Organizer",
          newVenue: broadcast.newVenue,
          newTime: broadcast.newTime,
        });

        if (res.delivered) {
          emailsDelivered++;
        } else if (res.success) {
          emailsQueued++;
        } else {
          emailsFailed++;
        }
      } catch (err) {
        emailsFailed++;
        console.error(`❌ Error dispatching broadcast notice to ${attendee.email}:`, err);
      }
    }

    announcement.notificationStats = {
      inAppSentCount: inAppSent,
      emailsQueuedCount: emailsQueued,
      emailsDeliveredCount: emailsDelivered,
      emailsFailedCount: emailsFailed,
    };
    await announcement.save();
  }

  /**
   * Superadmin/Admin review and moderation of campus announcements.
   */
  async reviewAnnouncement(
    announcementId: string,
    reviewerId: string,
    input: AnnouncementReviewInput
  ): Promise<{ success: boolean; status: number; message: string; announcement?: IAnnouncementDocument }> {
    await connectToDatabase();

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return { success: false, status: 404, message: "Announcement not found." };
    }

    const reviewerObjId = new mongoose.Types.ObjectId(reviewerId);

    if (input.action === "approve") {
      if (announcement.scheduledFor && new Date(announcement.scheduledFor) > new Date()) {
        announcement.status = "scheduled";
      } else {
        announcement.status = "published";
        announcement.publishedAt = new Date();
      }
      announcement.reviewedBy = reviewerObjId;
      announcement.reviewedAt = new Date();
      announcement.rejectionReason = undefined;

      await announcement.save();

      if (announcement.status === "published") {
        this.broadcastAnnouncementNotifications(announcement._id.toString()).catch((err) =>
          console.error("❌ Error broadcasting approved announcement:", err)
        );
      }

      return {
        success: true,
        status: 200,
        message:
          announcement.status === "scheduled"
            ? "Announcement approved and scheduled for automated publication."
            : "Announcement approved and published successfully.",
        announcement,
      };
    } else if (input.action === "reject") {
      if (!input.rejectionReason || input.rejectionReason.trim().length < 5) {
        return {
          success: false,
          status: 400,
          message: "A detailed rejection reason (at least 5 characters) is required when rejecting an announcement.",
        };
      }

      announcement.status = "rejected";
      announcement.reviewedBy = reviewerObjId;
      announcement.reviewedAt = new Date();
      announcement.rejectionReason = input.rejectionReason.trim();

      await announcement.save();

      return {
        success: true,
        status: 200,
        message: "Announcement rejected.",
        announcement,
      };
    } else if (input.action === "archive") {
      announcement.status = "archived";
      await announcement.save();

      return {
        success: true,
        status: 200,
        message: "Announcement archived.",
        announcement,
      };
    }

    return { success: false, status: 400, message: "Invalid moderation action." };
  }

  /**
   * Automated cron publisher: finds scheduled announcements due for release.
   */
  async publishDueScheduledAnnouncements(): Promise<{ publishedCount: number; errors: string[] }> {
    await connectToDatabase();
    const now = new Date();

    const dueAnnouncements = await Announcement.find({
      status: "scheduled",
      scheduledFor: { $lte: now },
    });

    let publishedCount = 0;
    const errors: string[] = [];

    for (const announcement of dueAnnouncements) {
      try {
        announcement.status = "published";
        announcement.publishedAt = now;
        await announcement.save();
        publishedCount++;

        // Broadcast notifications
        await this.broadcastAnnouncementNotifications(announcement._id.toString());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error publishing scheduled announcement ${announcement._id}:`, msg);
        errors.push(`Announcement ${announcement._id}: ${msg}`);
      }
    }

    return { publishedCount, errors };
  }

  /**
   * Student feed: returns announcements filtered strictly by the student's audience eligibility.
   */
  async getStudentFeed(
    studentId: string,
    query: AnnouncementQueryInput
  ): Promise<AnnouncementListResult> {
    await connectToDatabase();

    const student = await User.findById(studentId).lean();
    if (!student) {
      return { announcements: [], pagination: { total: 0, page: query.page, limit: query.limit, totalPages: 0 } };
    }

    // Find all events for which the student holds an active confirmed ticket
    const activeTickets = await Ticket.find({
      userId: new mongoose.Types.ObjectId(studentId),
      isInvalidated: { $ne: true },
    }).select("eventId").lean();

    const eventIds = activeTickets.map((t) => t.eventId);

    const now = new Date();

    // Audience targeting filter: matches all_students, or student's faculty, department, level, or registered events
    const audienceFilters: Array<Record<string, unknown>> = [{ "targetAudience.type": "all_students" }];

    if (student.faculty) {
      audienceFilters.push({
        "targetAudience.type": "faculty",
        "targetAudience.faculty": new RegExp(`^${student.faculty.trim()}$`, "i"),
      });
    }

    if (student.department) {
      audienceFilters.push({
        "targetAudience.type": "department",
        "targetAudience.department": new RegExp(`^${student.department.trim()}$`, "i"),
      });
    }

    if (student.level) {
      audienceFilters.push({
        "targetAudience.type": "academic_level",
        "targetAudience.level": student.level.trim(),
      });
    }

    if (eventIds.length > 0) {
      audienceFilters.push({
        "targetAudience.type": "event_attendees",
        "targetAudience.eventId": { $in: eventIds },
      });
    }

    const mongoFilter: Record<string, unknown> = {
      status: "published",
      $or: audienceFilters,
      $and: [
        {
          $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
        },
      ],
    };

    if (query.category && query.category !== "all") {
      mongoFilter.category = query.category;
    }

    if (query.priority && query.priority !== "all") {
      mongoFilter.priority = query.priority;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), "i");
      (mongoFilter.$and as Array<Record<string, unknown>>).push({
        $or: [{ title: searchRegex }, { summary: searchRegex }, { content: searchRegex }],
      });
    }

    const total = await Announcement.countDocuments(mongoFilter);
    const skip = (query.page - 1) * query.limit;

    const docs = await Announcement.find(mongoFilter)
      .sort({ isPinned: -1, publishedAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean();

    const announcements = docs.map((doc) => {
      const isRead = doc.readBy
        ? doc.readBy.some((id) => id.toString() === studentId)
        : false;

      return {
        id: doc._id.toString(),
        title: doc.title,
        summary: doc.summary,
        content: doc.content,
        category: doc.category,
        priority: doc.priority,
        coverImage: doc.coverImage,
        targetAudience: doc.targetAudience,
        publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : new Date(doc.createdAt).toISOString(),
        authorName: doc.authorName || "OAU Administration",
        authorRole: doc.authorRole,
        isPinned: Boolean(doc.isPinned),
        isRead,
        tags: doc.tags || [],
      };
    });

    return {
      announcements,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  /**
   * Marks an announcement as read by a student.
   */
  async markAsRead(announcementId: string, studentId: string): Promise<boolean> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(announcementId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return false;
    }

    await Announcement.findByIdAndUpdate(announcementId, {
      $addToSet: { readBy: new mongoose.Types.ObjectId(studentId) },
    });

    return true;
  }

  /**
   * Superadmin/Admin list query across all announcement statuses.
   */
  async getAdminAnnouncements(query: AnnouncementQueryInput): Promise<AnnouncementListResult> {
    await connectToDatabase();

    const mongoFilter: Record<string, unknown> = {};

    if (query.status && query.status !== "all") {
      mongoFilter.status = query.status;
    }

    if (query.category && query.category !== "all") {
      mongoFilter.category = query.category;
    }

    if (query.priority && query.priority !== "all") {
      mongoFilter.priority = query.priority;
    }

    if (query.authorId) {
      mongoFilter.authorId = new mongoose.Types.ObjectId(query.authorId);
    }

    if (query.eventId) {
      mongoFilter["targetAudience.eventId"] = new mongoose.Types.ObjectId(query.eventId);
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), "i");
      mongoFilter.$or = [{ title: searchRegex }, { summary: searchRegex }, { content: searchRegex }];
    }

    const total = await Announcement.countDocuments(mongoFilter);
    const skip = (query.page - 1) * query.limit;

    const docs = await Announcement.find(mongoFilter)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean();

    const announcements = docs.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      summary: doc.summary,
      content: doc.content,
      category: doc.category,
      priority: doc.priority,
      status: doc.status,
      targetAudience: doc.targetAudience,
      authorName: doc.authorName,
      authorRole: doc.authorRole,
      authorId: doc.authorId?.toString(),
      scheduledFor: doc.scheduledFor?.toISOString(),
      publishedAt: doc.publishedAt?.toISOString(),
      expiresAt: doc.expiresAt?.toISOString(),
      isPinned: Boolean(doc.isPinned),
      notificationStats: doc.notificationStats || {
        inAppSentCount: 0,
        emailsQueuedCount: 0,
        emailsDeliveredCount: 0,
        emailsFailedCount: 0,
      },
      readCount: doc.readBy?.length || 0,
      rejectionReason: doc.rejectionReason,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    }));

    return {
      announcements,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  /**
   * Superadmin announcement and reminder KPI metrics.
   */
  async getAdminStats(): Promise<{
    totalAnnouncements: number;
    published: number;
    scheduled: number;
    draft: number;
    pendingReview: number;
    archived: number;
    notifications: {
      inAppTotal: number;
      emailsQueuedTotal: number;
      emailsDeliveredTotal: number;
      emailsFailedTotal: number;
    };
  }> {
    await connectToDatabase();

    const [
      totalAnnouncements,
      published,
      scheduled,
      draft,
      pendingReview,
      archived,
      aggStats,
    ] = await Promise.all([
      Announcement.countDocuments(),
      Announcement.countDocuments({ status: "published" }),
      Announcement.countDocuments({ status: "scheduled" }),
      Announcement.countDocuments({ status: "draft" }),
      Announcement.countDocuments({ status: "pending_review" }),
      Announcement.countDocuments({ status: "archived" }),
      Announcement.aggregate([
        {
          $group: {
            _id: null,
            inAppTotal: { $sum: "$notificationStats.inAppSentCount" },
            emailsQueuedTotal: { $sum: "$notificationStats.emailsQueuedCount" },
            emailsDeliveredTotal: { $sum: "$notificationStats.emailsDeliveredCount" },
            emailsFailedTotal: { $sum: "$notificationStats.emailsFailedCount" },
          },
        },
      ]),
    ]);

    const statRow = aggStats[0] || {
      inAppTotal: 0,
      emailsQueuedTotal: 0,
      emailsDeliveredTotal: 0,
      emailsFailedTotal: 0,
    };

    return {
      totalAnnouncements,
      published,
      scheduled,
      draft,
      pendingReview,
      archived,
      notifications: {
        inAppTotal: statRow.inAppTotal || 0,
        emailsQueuedTotal: statRow.emailsQueuedTotal || 0,
        emailsDeliveredTotal: statRow.emailsDeliveredTotal || 0,
        emailsFailedTotal: statRow.emailsFailedTotal || 0,
      },
    };
  }
}

export const announcementService = new AnnouncementService();
