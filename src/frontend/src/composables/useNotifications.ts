import { ref, Ref } from "vue";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  duration?: number;
}

// Global notification state
const notifications: Ref<Notification[]> = ref([]);
let notificationIdCounter = 0;

export function useNotifications() {
  // Add a notification
  const addNotification = (
    type: NotificationType,
    message: string,
    duration: number = 5000,
  ): void => {
    const id = ++notificationIdCounter;
    const notification: Notification = {
      id,
      type,
      message,
      duration,
    };

    notifications.value.push(notification);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  // Remove a notification
  const removeNotification = (id: number): void => {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  };

  // Convenience methods
  const success = (message: string, duration?: number): void => {
    addNotification("success", message, duration);
  };

  const error = (message: string, duration?: number): void => {
    addNotification("error", message, duration);
  };

  const info = (message: string, duration?: number): void => {
    addNotification("info", message, duration);
  };

  const warning = (message: string, duration?: number): void => {
    addNotification("warning", message, duration);
  };

  // Clear all notifications
  const clearAll = (): void => {
    notifications.value = [];
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info,
    warning,
    clearAll,
  };
}
