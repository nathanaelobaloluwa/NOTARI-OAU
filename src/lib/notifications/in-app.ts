import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Notification, NotificationType, INotificationDocument } from "@/models/Notification";

export interface CreateInAppNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type?: NotificationType;
  linkUrl?: string;
}

/**
 * Creates an in-app notification record in MongoDB.
 */
export async function createInAppNotification(
  params: CreateInAppNotificationParams
): Promise<INotificationDocument> {
  await connectToDatabase();

  const userObjectId =
    typeof params.userId === "string"
      ? new mongoose.Types.ObjectId(params.userId)
      : params.userId;

  const doc = await Notification.create({
    userId: userObjectId,
    title: params.title.trim(),
    message: params.message.trim(),
    type: params.type || "system",
    linkUrl: params.linkUrl?.trim(),
    isRead: false,
  });

  return doc;
}

/**
 * Fetches user notifications sorted newest first.
 */
export async function getUserNotifications(
  userId: string | mongoose.Types.ObjectId,
  limit = 20
) {
  await connectToDatabase();

  const userObjectId =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({
      userId: userObjectId,
      isRead: false,
    }),
  ]);

  const serialized = items.map((n) => ({
    id: n._id.toString(),
    title: n.title,
    message: n.message,
    type: n.type,
    linkUrl: n.linkUrl,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return {
    items: serialized,
    unreadCount,
  };
}

/**
 * Marks an individual notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string | mongoose.Types.ObjectId
): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return false;
  }

  await connectToDatabase();

  const userObjectId =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const updated = await Notification.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: userObjectId,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
    { new: true }
  );

  return Boolean(updated);
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(
  userId: string | mongoose.Types.ObjectId
): Promise<number> {
  await connectToDatabase();

  const userObjectId =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const result = await Notification.updateMany(
    {
      userId: userObjectId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}

