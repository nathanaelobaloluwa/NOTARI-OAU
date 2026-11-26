/**
 * NOTARI 2.0 — Branded Toast Notification System
 * Lightweight, accessible, zero-dependency event emitter for application-wide notifications.
 */

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  id?: string;
  description?: string;
  duration?: number; // milliseconds, default 4500ms
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  title: string;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private maxToasts = 5;

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = [...this.toasts];
    this.listeners.forEach((listener) => listener(copy));
  }

  public show(type: ToastType, title: string, options?: ToastOptions): string {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Remove existing toast with the same id to avoid duplicates
    this.toasts = this.toasts.filter((t) => t.id !== id);

    const newToast: ToastItem = {
      id,
      type,
      title,
      description: options?.description,
      duration: options?.duration ?? (type === "loading" ? 0 : 4500),
      action: options?.action,
      createdAt: Date.now(),
    };

    // Prepend new toast and enforce maximum visible toasts
    this.toasts = [newToast, ...this.toasts].slice(0, this.maxToasts);
    this.notify();
    return id;
  }

  public dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  public dismissAll() {
    this.toasts = [];
    this.notify();
  }

  public update(id: string, updates: Partial<Omit<ToastItem, "id">>) {
    this.toasts = this.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t));
    this.notify();
  }
}

export const toastManager = new ToastManager();

export const toast = {
  success: (title: string, options?: ToastOptions) =>
    toastManager.show("success", title, options),
  error: (title: string, options?: ToastOptions) =>
    toastManager.show("error", title, options),
  warning: (title: string, options?: ToastOptions) =>
    toastManager.show("warning", title, options),
  info: (title: string, options?: ToastOptions) =>
    toastManager.show("info", title, options),
  loading: (title: string, options?: ToastOptions) =>
    toastManager.show("loading", title, options),
  dismiss: (id: string) => toastManager.dismiss(id),
  dismissAll: () => toastManager.dismissAll(),

  /**
   * Promise toast helper: tracks asynchronous operations through pending, success, and error states.
   */
  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
    options?: ToastOptions
  ): Promise<T> => {
    const toastId = toastManager.show("loading", messages.loading, options);
    try {
      const data = await promise;
      const successTitle =
        typeof messages.success === "function" ? messages.success(data) : messages.success;
      toastManager.update(toastId, {
        type: "success",
        title: successTitle,
        duration: 4500,
      });
      return data;
    } catch (err) {
      const errorTitle =
        typeof messages.error === "function" ? messages.error(err) : messages.error;
      toastManager.update(toastId, {
        type: "error",
        title: errorTitle,
        duration: 5500,
      });
      throw err;
    }
  },
};
