/**
 * NOTARI 2.0 — Branded Browser & Desktop Web Notifications
 * 
 * Provides native desktop notification delivery using the official NOTARI 2.0
 * brand icon (never the generic Google Chrome icon).
 */

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Checks whether the current environment supports Web Notifications
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns the current notification permission state
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Requests permission from the student/user to display native desktop notifications
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch (err) {
    console.warn("⚠️ Error requesting notification permission:", err);
    return Notification.permission as NotificationPermissionState;
  }
}

/**
 * Displays a branded desktop notification with the official NOTARI emblem
 * (guarantees the Chrome browser default icon is replaced with the NOTARI brand logo).
 */
export function showBrowserNotification(
  options: BrowserNotificationOptions
): Notification | null {
  if (!isBrowserNotificationSupported()) {
    return null;
  }

  if (Notification.permission !== "granted") {
    return null;
  }

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const iconUrl = `${origin}/icons/notari-notification-icon.png`;
    const badgeUrl = `${origin}/icons/badge-72x72.png`;

    const notification = new Notification(options.title, {
      body: options.body,
      icon: iconUrl,
      badge: badgeUrl,
      tag: options.tag || "notari-campus-notification",
      data: {
        url: options.url || "/",
        ...options.data,
      },
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn("⚠️ Failed to trigger browser notification:", err);
    return null;
  }
}
