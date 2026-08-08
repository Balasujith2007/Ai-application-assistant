'use client';
import React, { useState } from 'react';
import { Download, Trash2, AlertTriangle } from 'lucide-react';

export function DataSettings({ data }: { data: any }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Data & Account</h2>
      
      <div className="space-y-6 max-w-2xl">
        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Download My Data</h3>
            <p className="text-sm text-gray-500 mt-1">Get a copy of all your profile data, applications, and settings.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            <Download className="h-4 w-4" /> Download
          </button>
        </div>

        <div className="border border-red-200 rounded-lg p-4 flex items-center justify-between bg-red-50/50">
          <div>
            <h3 className="font-medium text-red-900">Delete Account</h3>
            <p className="text-sm text-red-700 mt-1">Permanently remove your account and all associated data.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
            <Trash2 className="h-4 w-4" /> Delete Account
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete your CareerAI account? This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={() => { alert('Account deletion requested.'); setShowModal(false); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Delete Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
