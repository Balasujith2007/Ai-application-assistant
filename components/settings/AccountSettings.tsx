'use client';
import React, { useState } from 'react';

export function AccountSettings({ data, onSave }: { data: any; onSave: (d: any) => void }) {
  const [formData, setFormData] = useState({
    name: data.name || '',
    email: data.email || '',
    phone: data.profile?.phone || '',
    college: data.profile?.college || '',
    department: data.profile?.department || '',
    year: data.profile?.year || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name: formData.name }); 
    // Usually profile updates go to /api/profiles/me, but for now we just show it.
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-gray-300 p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={formData.email} disabled className="w-full rounded-lg border border-gray-300 p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="text" value={formData.phone} disabled className="w-full rounded-lg border border-gray-300 p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
            <input type="text" value={formData.college} disabled className="w-full rounded-lg border border-gray-300 p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
        </div>
        <div className="pt-4 flex gap-3">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Save Changes</button>
        </div>
      </form>
    </div>
  );
}
