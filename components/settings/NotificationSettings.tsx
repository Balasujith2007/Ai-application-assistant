'use client';
import React, { useState } from 'react';

const TOGGLES = [
  { id: 'appUpdates', label: 'Application Updates', desc: 'Get notified when your application status changes.' },
  { id: 'interviews', label: 'Interview Reminders', desc: 'Alerts for upcoming scheduled interviews.' },
  { id: 'deadlines', label: 'Application Deadlines', desc: 'Reminders for approaching job application deadlines.' },
  { id: 'jobs', label: 'New Job Opportunities', desc: 'Matches based on your skills and preferences.' },
  { id: 'hackathons', label: 'Hackathon Opportunities', desc: 'Alerts for new hackathons and competitions.' },
  { id: 'mentor', label: 'Mentor Messages', desc: 'Messages and feedback from mentors.' },
  { id: 'tasks', label: 'Task Reminders', desc: 'Reminders for assigned tasks and tests.' },
  { id: 'profile', label: 'Profile Improvement Suggestions', desc: 'Tips to make your profile stand out.' },
  { id: 'email', label: 'Email Notifications', desc: 'Receive summaries and important alerts via email.' },
  { id: 'push', label: 'Push Notifications', desc: 'Browser push notifications.' },
];

export function NotificationSettings({ data, onSave }: { data: any; onSave: (d: any) => void }) {
  const [prefs, setPrefs] = useState<any>(data.notificationPreferences || {
    appUpdates: true, interviews: true, deadlines: true, jobs: true, hackathons: true, mentor: true, tasks: true, profile: true, email: false, push: false
  });

  const toggle = (id: string) => {
    setPrefs({ ...prefs, [id]: !prefs[id] });
  };

  const handleSubmit = () => {
    onSave({ notificationPreferences: prefs });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
      
      <div className="space-y-4 max-w-2xl mb-8">
        {TOGGLES.map(t => (
          <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <p className="font-medium text-gray-900">{t.label}</p>
              <p className="text-sm text-gray-500">{t.desc}</p>
            </div>
            <button
              onClick={() => toggle(t.id)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-kit-600 focus:ring-offset-2 ${prefs[t.id] ? 'bg-kit-600' : 'bg-gray-200'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${prefs[t.id] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} className="px-4 py-2 bg-kit-600 text-white rounded-lg hover:bg-kit-700 font-medium">Save Preferences</button>
    </div>
  );
}
