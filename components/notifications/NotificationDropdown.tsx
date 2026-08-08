'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Briefcase, Calendar, CheckSquare, User, Bot, AlertCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string;
  link?: string;
  createdAt: string;
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Polling every minute
    return () => clearInterval(interval);
  }, []);

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

  const markAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put('/notifications', {});
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markAsReadAndNavigate = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification.id}`, {});
        setNotifications(notifications.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      }
      setIsOpen(false);
      
      let targetRoute = notification.link;
      // Infer route from type or title if link is missing
      if (!targetRoute) {
        const titleLower = notification.title.toLowerCase();
        if (titleLower.includes('application')) targetRoute = '/applications';
        else if (titleLower.includes('interview')) targetRoute = '/interviews';
        else if (titleLower.includes('task')) targetRoute = '/tasks';
        else if (titleLower.includes('profile')) targetRoute = '/profile';
        else if (titleLower.includes('opportunity') || titleLower.includes('job') || titleLower.includes('hackathon')) targetRoute = '/dashboard/student';
        else targetRoute = '/dashboard/student';
      }
      router.push(targetRoute);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const getIcon = (title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('application')) return <Briefcase className="h-5 w-5 text-blue-500" />;
    if (titleLower.includes('interview')) return <Calendar className="h-5 w-5 text-purple-500" />;
    if (titleLower.includes('task')) return <CheckSquare className="h-5 w-5 text-orange-500" />;
    if (titleLower.includes('profile')) return <User className="h-5 w-5 text-green-500" />;
    if (titleLower.includes('deadline')) return <AlertCircle className="h-5 w-5 text-red-500" />;
    return <Sparkles className="h-5 w-5 text-indigo-500" />;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <Bell className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No new notifications</p>
                <p className="text-xs text-gray-500 mt-1">You're all caught up.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => markAsReadAndNavigate(notification)}
                    className={cn(
                      "w-full text-left flex items-start gap-4 p-4 transition-colors hover:bg-gray-50",
                      !notification.isRead ? "bg-indigo-50/30" : "bg-white"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 mt-0.5 rounded-full p-2",
                      !notification.isRead ? "bg-white shadow-sm" : "bg-gray-50"
                    )}>
                      {getIcon(notification.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          !notification.isRead ? "text-gray-900" : "text-gray-700"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 h-2 w-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-2 font-medium">
                        {new Date(notification.createdAt).toLocaleDateString(undefined, {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
