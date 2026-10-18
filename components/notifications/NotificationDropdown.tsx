'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Briefcase,
  Calendar,
  CheckSquare,
  User,
  AlertCircle,
  Sparkles,
  Megaphone,
  RotateCw,
  CheckCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNotifications, NotificationItem } from '@/context/NotificationContext';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    status,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      setIsOpen(false);

      let targetRoute = notification.link;
      if (!targetRoute) {
        const titleLower = notification.title.toLowerCase();
        if (titleLower.includes('opportunity') || titleLower.includes('internship') || titleLower.includes('hackathon')) {
          targetRoute = '/dashboard/student/opportunities';
        } else if (titleLower.includes('application')) {
          targetRoute = '/dashboard/student/opportunities';
        } else if (titleLower.includes('interview')) {
          targetRoute = '/dashboard/student';
        } else if (titleLower.includes('task')) {
          targetRoute = '/dashboard/student';
        } else if (titleLower.includes('profile')) {
          targetRoute = '/dashboard/settings';
        } else {
          targetRoute = '/dashboard/notifications';
        }
      }
      router.push(targetRoute);
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const getIcon = (title: string, type?: string | null) => {
    const text = `${title} ${type || ''}`.toLowerCase();
    if (text.includes('📢') || text.includes('announcement') || text.includes('hod')) {
      return <Megaphone className="h-4 w-4 text-kit-600" />;
    }
    if (text.includes('opportunity') || text.includes('internship') || text.includes('hackathon') || text.includes('application')) {
      return <Briefcase className="h-4 w-4 text-blue-600" />;
    }
    if (text.includes('interview')) {
      return <Calendar className="h-4 w-4 text-purple-600" />;
    }
    if (text.includes('task') || text.includes('verified')) {
      return <CheckSquare className="h-4 w-4 text-emerald-600" />;
    }
    if (text.includes('profile') || text.includes('mentor')) {
      return <User className="h-4 w-4 text-green-600" />;
    }
    if (text.includes('deadline') || text.includes('rejected') || text.includes('urgent')) {
      return <AlertCircle className="h-4 w-4 text-rose-600" />;
    }
    return <Sparkles className="h-4 w-4 text-kit-600" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kit-400"
        title="View Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {/* Authoritative unread badge — ONLY rendered when unread count > 0 */}
        {unreadCount > 0 && (
          <span
            id="header-notification-badge"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-kit-600 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-in zoom-in duration-150"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gray-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-kit-100 px-2 py-0.5 text-xs font-bold text-kit-700 border border-kit-200">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                  Caught up
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-kit-600 hover:text-kit-800 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {/* 1. Loading State */}
            {status === 'loading' && notifications.length === 0 && (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded w-full" />
                      <div className="h-2 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Error State with Retry Button */}
            {status === 'error' && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="h-11 w-11 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-2.5 border border-rose-100">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-gray-900">Failed to load notifications</p>
                <p className="text-xs text-gray-500 mt-1 mb-3 max-w-[240px]">
                  {error || 'Unable to connect to the notification service.'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            )}

            {/* 3. Empty State (Only after confirmed successful response) */}
            {status === 'success' && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3 border border-gray-100">
                  <Bell className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900">No new notifications</p>
                <p className="text-xs text-gray-500 mt-1">You're all caught up with your announcements and tasks.</p>
              </div>
            )}

            {/* 4. Notification Items List */}
            {notifications.slice(0, 15).map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-3.5 transition-colors hover:bg-gray-50/80 group",
                  !notification.isRead ? "bg-rose-50/30" : "bg-white"
                )}
              >
                {/* Icon avatar */}
                <div
                  className={cn(
                    "shrink-0 mt-0.5 rounded-full p-2 border transition-colors",
                    !notification.isRead
                      ? "bg-rose-50 border-rose-100"
                      : "bg-gray-50 border-gray-100"
                  )}
                >
                  {getIcon(notification.title, notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-xs font-bold truncate leading-tight group-hover:text-kit-700 transition-colors",
                        !notification.isRead ? "text-gray-900" : "text-gray-700"
                      )}
                    >
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <span
                        className="shrink-0 h-2 w-2 rounded-full bg-kit-600 ring-2 ring-rose-200"
                        title="Unread notification"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                    {new Date(notification.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-2.5 bg-gray-50/50 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/dashboard/notifications');
              }}
              className="text-xs font-semibold text-kit-600 hover:text-kit-800 transition-colors py-1"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
