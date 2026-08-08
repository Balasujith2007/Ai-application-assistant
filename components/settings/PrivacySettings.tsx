'use client';
import React, { useState } from 'react';

export function PrivacySettings({ data, onSave }: { data: any; onSave: (d: any) => void }) {
  const [prefs, setPrefs] = useState<any>(data.privacySettings || {
    visibility: 'College Only', recruiters: true, mentors: true
  });

  const toggle = (id: string) => {
    setPrefs({ ...prefs, [id]: !prefs[id] });
  };

  const handleSubmit = () => {
    onSave({ privacySettings: prefs });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Privacy & Security</h2>
      
      <div className="space-y-6 max-w-2xl mb-8">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Account Visibility</h3>
          <select value={prefs.visibility} onChange={e => setPrefs({...prefs, visibility: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border">
            <option>Public</option>
            <option>College Only</option>
            <option>Private</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-gray-900">Allow recruiters to view profile</p>
          </div>
          <button onClick={() => toggle('recruiters')} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${prefs.recruiters ? 'bg-indigo-600' : 'bg-gray-200'}`}>
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${prefs.recruiters ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-gray-900">Allow mentors to view profile</p>
          </div>
          <button onClick={() => toggle('mentors')} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${prefs.mentors ? 'bg-indigo-600' : 'bg-gray-200'}`}>
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${prefs.mentors ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Security</h3>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Change Password</button>
        </div>
      </div>

      <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Save Settings</button>
    </div>
  );
}
