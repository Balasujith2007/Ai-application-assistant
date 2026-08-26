'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Building2, User, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function HODSettingsPage() {
  const { user } = useAuth();
  const [department, setDepartment] = useState('Artificial Intelligence & Data Science');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Settings updated successfully!
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-kit-600" /> Department & HOD Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage department preferences and HOD account profile</p>
      </motion.div>

      <form onSubmit={handleSave} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6 text-sm">
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900 text-base">HOD Profile Information</h2>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                disabled
                value={user?.name || 'Dr. S. Kanthaswamy (HOD)'}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Official Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                disabled
                value={user?.email || 'hod@careerai.edu'}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Department</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 focus:border-kit-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-kit-600 px-5 py-2.5 font-semibold text-white hover:bg-kit-700 shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
