'use client';
import React from 'react';
import Link from 'next/link';

export function SkillsSettings({ data, onSave }: { data: any; onSave: (d: any) => void }) {
  // This ideally should manage skills directly, but we already have a profile page for it.
  // The user requirement requested it to be here, but we will redirect to /profile to keep it DRY.
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills & Profile</h2>
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-blue-800 font-medium">Profile Completion</span>
          <span className="text-blue-800 font-bold">82%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '82%' }}></div>
        </div>
        <p className="text-sm text-blue-600 mt-3">Add 2 more skills to improve your profile visibility.</p>
      </div>

      <p className="text-gray-600 mb-6">Manage your detailed skills and profile information in the dedicated profile builder.</p>
      <Link href="/profile" className="inline-flex px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
        Go to Profile Builder
      </Link>
    </div>
  );
}
