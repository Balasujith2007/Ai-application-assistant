import prisma from '@/lib/prisma';
import { dispatchNotificationEvent, NotificationPayload } from './eventBus';

export interface CreateNotificationInput {
  userId: string;
  senderId?: string | null;
  type?: string | null;
  title: string;
  message: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  link?: string | null;
}

/**
 * Persists a single notification to the database and dispatches a real-time event to the recipient.
 */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationPayload> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      senderId: input.senderId ?? null,
      type: input.type ?? null,
      title: input.title,
      message: input.message,
      relatedEntityId: input.relatedEntityId ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      link: input.link ?? null,
      isRead: false,
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: input.userId, isRead: false },
  });

  dispatchNotificationEvent(input.userId, {
    type: 'NOTIFICATION_CREATED',
    notification: {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    },
    unreadCount,
  });

  return {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  };
}

/**
 * Persists multiple notifications and dispatches real-time events to all affected users.
 */
export async function createManyNotifications(inputs: CreateNotificationInput[]): Promise<number> {
  if (!inputs.length) return 0;

  await prisma.notification.createMany({
    data: inputs.map((item) => ({
      userId: item.userId,
      senderId: item.senderId ?? null,
      type: item.type ?? null,
      title: item.title,
      message: item.message,
      relatedEntityId: item.relatedEntityId ?? null,
      relatedEntityType: item.relatedEntityType ?? null,
      link: item.link ?? null,
      isRead: false,
    })),
  });

  // Notify each affected user in real time
  const distinctUserIds = Array.from(new Set(inputs.map((i) => i.userId)));
  for (const userId of distinctUserIds) {
    try {
      const [unreadCount, latest] = await Promise.all([
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.notification.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      if (latest) {
        dispatchNotificationEvent(userId, {
          type: 'NOTIFICATION_CREATED',
          notification: {
            ...latest,
            createdAt: latest.createdAt.toISOString(),
          },
          unreadCount,
        });
      }
    } catch (err) {
      console.error(`[NotificationService] Error dispatching real-time event for user ${userId}:`, err);
    }
  }

  return inputs.length;
}

/**
 * Marks a single notification as read and dispatches a real-time update event.
 */
export async function markNotificationRead(id: string, userId: string): Promise<NotificationPayload | null> {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  dispatchNotificationEvent(userId, {
    type: 'NOTIFICATION_READ',
    notificationId: id,
    unreadCount,
  });

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * Marks all notifications for a user as read and dispatches a real-time update event.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  dispatchNotificationEvent(userId, {
    type: 'NOTIFICATIONS_ALL_READ',
    unreadCount: 0,
  });

  return result.count;
}

/**
 * Deletes a notification and reconciles unread count.
 */
export async function deleteNotification(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return false;
  }

  await prisma.notification.delete({ where: { id } });

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  dispatchNotificationEvent(userId, {
    type: 'NOTIFICATIONS_SYNC',
    unreadCount,
  });

  return true;
}

/**
 * Fetches the authoritative unread count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
