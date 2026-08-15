'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Bell, Megaphone, Loader2, Calendar, User } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnnouncements() {
      setLoading(true);
      try {
        const res = await api.get('/notifications');
        const list = res.data.data || [];
        setAnnouncements(list);
      } catch (err) {
        console.error('Failed to load announcements:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnnouncements();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Announcements" subtitle="Loading department notices...">
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Announcements" subtitle="Stay updated with official placement drive announcements, HOD notices, and mentor reminders.">
      <div className="space-y-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-indigo-600" /> Department Announcements & Reminders
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Official announcements broadcasted by HODs, Placement Coordinators, and your assigned Mentor.
          </p>
        </motion.div>

        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center text-gray-400 font-medium">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700">No active announcements</p>
            <p className="text-xs text-gray-400 mt-1">Check back later for placement drive updates and class notices.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-200 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                      <Bell className="h-4 w-4" />
                    </span>
                    <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed font-normal">{item.message}</p>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400 font-medium">
                  <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                    <User className="h-3.5 w-3.5" />
                    HOD / Mentor Announcement
                  </span>
                  <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
