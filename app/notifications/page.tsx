'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Bell, Briefcase, Calendar, Info, Trophy } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'APPLICATION_UPDATE',
    title: 'Application Update',
    message: 'Your application at Google has moved to Interview stage.',
    time: new Date().toISOString(),
    read: false,
    icon: <Briefcase className="h-5 w-5 text-indigo-600" />,
    color: 'bg-indigo-50',
  },
  {
    id: '2',
    type: 'DEADLINE_REMINDER',
    title: 'Deadline Reminder',
    message: 'Amazon SDE-1 application deadline is in 3 days.',
    time: new Date(Date.now() - 86400000).toISOString(),
    read: false,
    icon: <Calendar className="h-5 w-5 text-amber-600" />,
    color: 'bg-amber-50',
  },
  {
    id: '3',
    type: 'HACKATHON',
    title: 'Hackathon Update',
    message: 'Smart India Hackathon — You have been shortlisted!',
    time: new Date(Date.now() - 2 * 86400000).toISOString(),
    read: true,
    icon: <Trophy className="h-5 w-5 text-amber-500" />,
    color: 'bg-amber-50',
  },
  {
    id: '4',
    type: 'SYSTEM',
    title: 'Profile Reminder',
    message: 'Your profile is 70% complete. Add your experience to improve visibility.',
    time: new Date(Date.now() - 3 * 86400000).toISOString(),
    read: true,
    icon: <Info className="h-5 w-5 text-blue-600" />,
    color: 'bg-blue-50',
  },
];

export default function NotificationsPage() {
  return (
    <DashboardLayout title="Notifications" subtitle="Stay updated with your career activity">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {MOCK_NOTIFICATIONS.filter((n) => !n.read).length} unread notifications
          </p>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Mark all as read
          </button>
        </div>

        <div className="space-y-3">
          {MOCK_NOTIFICATIONS.map((notif) => (
            <div
              key={notif.id}
              className={`flex gap-4 rounded-xl border p-4 transition-all ${
                notif.read
                  ? 'border-gray-200 bg-white'
                  : 'border-indigo-100 bg-indigo-50/50'
              }`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${notif.color}`}>
                {notif.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{notif.title}</p>
                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-600">{notif.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(notif.time)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            Backend notification system coming in Phase 2 with email reminders, deadline alerts, and more.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
