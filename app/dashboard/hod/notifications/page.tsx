'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Bell, Check, Loader2 } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function HODNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/notifications/${id}`, { isRead: true }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-kit-600" /> HOD Notification Center
        </h1>
        <p className="text-sm text-gray-500 mt-1">Department alerts, mentor review updates, and student milestones</p>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
              No unread notifications.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between rounded-2xl border p-5 transition-all ${
                  n.isRead ? 'border-gray-200 bg-white' : 'border-kit-200 bg-kit-50/40 ring-1 ring-kit-500/20'
                }`}
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900 text-sm">{n.title}</h3>
                  <p className="text-xs text-gray-600">{n.message}</p>
                  <p className="text-[11px] text-gray-400 pt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                  >
                    <Check className="h-3.5 w-3.5 text-kit-600" /> Mark Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
