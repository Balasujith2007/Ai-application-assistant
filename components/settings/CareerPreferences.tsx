'use client';
import React, { useState } from 'react';

const ROLES = ['Software Engineer', 'Data Scientist', 'AI/ML Engineer', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer', 'Data Analyst', 'DevOps Engineer'];
const LOCATIONS = ['Chennai', 'Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Remote', 'Anywhere'];
const WORK_TYPES = ['Full Time', 'Internship', 'Part Time', 'Remote'];

export function CareerPreferences({ data, onSave }: { data: any; onSave: (d: any) => void }) {
  const prefs = data.profile?.careerPreferences || {};
  const [selectedRoles, setSelectedRoles] = useState<string[]>(prefs.roles || []);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(prefs.locations || []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(prefs.workTypes || []);
  const [expectedSalary, setExpectedSalary] = useState(prefs.expectedSalary || '');

  const toggleArray = (arr: string[], val: string, setArr: any) => {
    setArr(arr.includes(val) ? arr.filter(i => i !== val) : [...arr, val]);
  };

  const handleSubmit = () => {
    onSave({ careerPreferences: { roles: selectedRoles, locations: selectedLocations, workTypes: selectedTypes, expectedSalary } });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Career Preferences</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Preferred Job Roles</h3>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(role => (
              <button key={role} onClick={() => toggleArray(selectedRoles, role, setSelectedRoles)} className={`px-3 py-1.5 rounded-full text-sm font-medium ${selectedRoles.includes(role) ? 'bg-kit-100 text-kit-700 border border-kit-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
                {role}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Preferred Locations</h3>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map(loc => (
              <button key={loc} onClick={() => toggleArray(selectedLocations, loc, setSelectedLocations)} className={`px-3 py-1.5 rounded-full text-sm font-medium ${selectedLocations.includes(loc) ? 'bg-kit-100 text-kit-700 border border-kit-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
                {loc}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Expected Salary / Stipend</h3>
          <input type="text" value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} placeholder="e.g. 12 LPA or 40k/month" className="w-full max-w-sm rounded-lg border border-gray-300 p-2" />
        </div>

        <button onClick={handleSubmit} className="px-4 py-2 bg-kit-600 text-white rounded-lg hover:bg-kit-700 font-medium">Save Preferences</button>
      </div>
    </div>
  );
}
