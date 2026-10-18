'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getToken, getStoredUser } from '@/lib/auth';
import api from '@/lib/api';

export interface NotificationItem {
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
  createdAt: string;
}

export type NotificationFetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  status: NotificationFetchStatus;
  error: string | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [status, setStatus] = useState<NotificationFetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Authoritative fetch from database APIs
  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (typeof window === 'undefined') return;
    const token = getToken();
    const activeUser = user || getStoredUser();
    if (!token || !activeUser) {
      setNotifications([]);
      setUnreadCount(0);
      setStatus('idle');
      return;
    }

    setStatus((prev) => (isInitial || prev === 'idle' ? 'loading' : prev));
    setError(null);

    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count').catch(() => null),
      ]);

      const items: NotificationItem[] = listRes.data?.data || [];
      const derivedUnread = items.filter((n) => !n.isRead).length;
      const verifiedCount = typeof countRes?.data?.count === 'number' ? countRes.data.count : derivedUnread;

      setNotifications(items);
      setUnreadCount(verifiedCount);
      setStatus('success');
    } catch (err: any) {
      console.error('[NotificationContext] Fetch error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load notifications');
      setStatus('error');
    }
  }, [user]);

  // Initial fetch when authenticated user changes or session restores
  useEffect(() => {
    const activeUser = user || getStoredUser();
    if (activeUser?.id && getToken()) {
      fetchNotifications(true);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setStatus('idle');
      setError(null);
    }
  }, [user, fetchNotifications]);

  // 2. Cross-tab synchronization via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    try {
      const channel = new BroadcastChannel('careerai_notifications_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'SYNC_READ') {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.id ? { ...n, isRead: true } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } else if (type === 'SYNC_ALL_READ') {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          setUnreadCount(0);
        } else if (type === 'SYNC_REFETCH') {
          fetchNotifications(false);
        }
      };

      return () => {
        channel.close();
      };
    } catch {
      // BroadcastChannel unsupported or blocked
    }
  }, [fetchNotifications]);

  // 3. Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = getToken();
    const activeUser = user || getStoredUser();
    if (!token || !activeUser?.id) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Connect to SSE stream passing the authenticated user's token
    const sseUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.addEventListener('connected', () => {
      setIsConnected(true);
    });

    es.addEventListener('notification', (e) => {
      try {
        const eventData = JSON.parse(e.data);
        const { type, notification, notificationId, unreadCount: count } = eventData;

        if (type === 'NOTIFICATION_CREATED' && notification) {
          setNotifications((prev) => {
            // Deduplicate: avoid adding if already present
            if (prev.some((n) => n.id === notification.id)) return prev;
            return [notification, ...prev];
          });
          if (typeof count === 'number') {
            setUnreadCount(count);
          } else {
            setUnreadCount((prev) => prev + 1);
          }
        } else if (type === 'NOTIFICATION_READ' && notificationId) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
          );
          if (typeof count === 'number') {
            setUnreadCount(count);
          } else {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        } else if (type === 'NOTIFICATIONS_ALL_READ') {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          setUnreadCount(0);
        } else if (type === 'NOTIFICATIONS_SYNC') {
          if (typeof count === 'number') {
            setUnreadCount(count);
          }
        }
      } catch (parseErr) {
        console.error('[NotificationContext] Error parsing SSE payload:', parseErr);
      }
    });

    es.onerror = () => {
      setIsConnected(false);
      // Auto-reconnect is handled natively by EventSource. Reconcile on reconnect:
      setTimeout(() => {
        fetchNotifications(false);
      }, 3000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [user?.id, fetchNotifications]);

  // 4. Mark single notification as read
  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await api.patch(`/notifications/${id}/read`);
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_READ',
        payload: { id },
      });
    } catch (err) {
      console.error('[NotificationContext] Failed to mark notification as read:', err);
      // Revert/reconcile on failure
      fetchNotifications(false);
    }
  };

  // 5. Mark all as read
  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await api.put('/notifications', {});
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_ALL_READ',
      });
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all notifications as read:', err);
      fetchNotifications(false);
    }
  };

  // 6. Delete notification
  const deleteNotification = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await api.delete(`/notifications/${id}`);
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_REFETCH',
      });
    } catch (err) {
      console.error('[NotificationContext] Failed to delete notification:', err);
      fetchNotifications(false);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        status,
        error,
        isConnected,
        refetch: () => fetchNotifications(false),
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
