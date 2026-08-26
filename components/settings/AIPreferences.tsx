'use client';
import React, { useState } from 'react';

export function AIPreferences({ data, onSave }: { data: any; onSave: (d: any) => void }) {
  const [prefs, setPrefs] = useState<any>(data.aiPreferences || {
    recommendations: true, resume: true, jobMatching: true, skillGap: true
  });

  const toggle = (id: string) => {
    setPrefs({ ...prefs, [id]: !prefs[id] });
  };

  const handleSubmit = () => {
    onSave({ aiPreferences: prefs });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Career Assistant</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">CareerAI uses your profile, skills, resume, and preferences to recommend relevant opportunities. You can customize how the AI assistant helps you.</p>
      
      <div className="space-y-4 max-w-2xl mb-8">
        {[
          { id: 'recommendations', label: 'AI Recommendations' },
          { id: 'resume', label: 'AI Resume Suggestions' },
          { id: 'jobMatching', label: 'AI Job Matching' },
          { id: 'skillGap', label: 'AI Skill Gap Analysis' },
        ].map(t => (
          <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <p className="font-medium text-gray-900">{t.label}</p>
            <button
              onClick={() => toggle(t.id)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${prefs[t.id] ? 'bg-kit-600' : 'bg-gray-200'}`}
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
