'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Check, Trash2, ExternalLink, Loader2, Megaphone,
  FileText, CheckSquare, Calendar, Briefcase, User, Sparkles, CheckCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch (err: any) {
      if (err.response) {
        console.error('Failed to load notifications:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/notifications', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const getIcon = (title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('📢') || titleLower.includes('announcement')) return <Megaphone className="h-5 w-5 text-kit-600" />;
    if (titleLower.includes('resume')) return <FileText className="h-5 w-5 text-emerald-600" />;
    if (titleLower.includes('task')) return <CheckSquare className="h-5 w-5 text-amber-600" />;
    if (titleLower.includes('interview')) return <Calendar className="h-5 w-5 text-kit-600" />;
    if (titleLower.includes('application')) return <Briefcase className="h-5 w-5 text-blue-600" />;
    if (titleLower.includes('profile')) return <User className="h-5 w-5 text-green-600" />;
    return <Sparkles className="h-5 w-5 text-kit-500" />;
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'READ') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-kit-600" /> Notification Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with announcements, task assignments, resume reviews, and status updates
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="inline-flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-kit-700 disabled:opacity-60 shadow-sm transition-colors"
          >
            {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Mark all as read
          </button>
        )}
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            filter === 'ALL' ? 'bg-kit-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            filter === 'UNREAD' ? 'bg-kit-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('READ')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            filter === 'READ' ? 'bg-kit-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Notifications Grid/List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-4 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <Bell className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-800">
            {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            When you receive announcements, task updates, or resume reviews, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`group flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border p-5 transition-all cursor-pointer hover:shadow-md ${
                !n.isRead
                  ? 'border-kit-200 bg-kit-50/40 ring-1 ring-kit-500/20'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className={`shrink-0 rounded-2xl p-3 mt-0.5 ${!n.isRead ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                  {getIcon(n.title)}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </h3>
                    {!n.isRead && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-kit-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-gray-400 font-medium pt-1">
                    {new Date(n.createdAt).toLocaleString(undefined, {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                {n.link && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-kit-50 px-3 py-1.5 text-xs font-semibold text-kit-700 hover:bg-kit-100 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </span>
                )}

                {!n.isRead && (
                  <button
                    onClick={(e) => markAsRead(n.id, e)}
                    title="Mark as Read"
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    <Check className="h-3.5 w-3.5 text-kit-600" /> Mark Read
                  </button>
                )}

                <button
                  onClick={(e) => deleteNotification(n.id, e)}
                  title="Delete notification"
                  className="rounded-xl p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
