'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/Card';
import { Users, Laptop, Trophy, Briefcase } from 'lucide-react';

export default function FacultyDashboard() {
  return (
    <DashboardLayout title="Faculty Dashboard" subtitle="Department student overview">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Students" value={142} icon={<Users className="h-5 w-5" />} color="indigo" />
        <StatCard title="Internships" value={38} icon={<Laptop className="h-5 w-5" />} color="blue" />
        <StatCard title="Hackathons" value={24} icon={<Trophy className="h-5 w-5" />} color="amber" />
        <StatCard title="Applications" value={186} icon={<Briefcase className="h-5 w-5" />} color="emerald" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Department Statistics</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { year: '1st Year', students: 35, placed: 0 },
            { year: '2nd Year', students: 38, placed: 12 },
            { year: '3rd Year', students: 36, placed: 28 },
            { year: '4th Year', students: 33, placed: 30 },
          ].map(({ year, students, placed }) => (
            <div key={year} className="rounded-lg border border-gray-100 p-4">
              <p className="font-medium text-gray-800">{year}</p>
              <p className="text-sm text-gray-500">{students} students · {placed} internships/placements</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(placed / students) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
