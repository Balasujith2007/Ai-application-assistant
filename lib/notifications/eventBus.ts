import { EventEmitter } from 'events';

export type NotificationEventType =
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATIONS_ALL_READ'
  | 'NOTIFICATIONS_SYNC';

export interface NotificationPayload {
  id: string;
  userId: string;
  senderId?: string | null;
  type?: string | null;
  title: string;
  message: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  isRead: boolean;
  link?: string | null;
  createdAt: string | Date;
}

export interface NotificationEvent {
  type: NotificationEventType;
  userId: string;
  notification?: NotificationPayload;
  notificationId?: string;
  unreadCount: number;
  timestamp: string;
}

// Preserve EventEmitter across Next.js dev server hot reloads
const globalForNotifications = globalThis as unknown as {
  notificationEmitter?: EventEmitter;
};

export function getNotificationEmitter(): EventEmitter {
  if (!globalForNotifications.notificationEmitter) {
    const emitter = new EventEmitter();
    // Allow many concurrent SSE client listeners without warning
    emitter.setMaxListeners(500);
    globalForNotifications.notificationEmitter = emitter;
  }
  return globalForNotifications.notificationEmitter;
}

/**
 * Dispatch a real-time notification event to all active SSE streams for a user.
 */
export function dispatchNotificationEvent(userId: string, event: Omit<NotificationEvent, 'userId' | 'timestamp'>): void {
  const emitter = getNotificationEmitter();
  const fullEvent: NotificationEvent = {
    ...event,
    userId,
    timestamp: new Date().toISOString(),
  };

  emitter.emit(`user:${userId}`, fullEvent);
}
