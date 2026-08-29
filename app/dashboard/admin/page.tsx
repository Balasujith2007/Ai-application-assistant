'use client';

import { StatCard } from '@/components/ui/Card';
import { Users, GraduationCap, Briefcase, Shield } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">System overview and user management</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Users" value={1024} icon={<Users className="h-5 w-5" />} color="indigo" />
        <StatCard title="Students" value={856} icon={<GraduationCap className="h-5 w-5" />} color="blue" />
        <StatCard title="Faculty/HOD" value={142} icon={<Shield className="h-5 w-5" />} color="amber" />
        <StatCard title="Applications" value={4821} icon={<Briefcase className="h-5 w-5" />} color="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">User Management</h3>
          <div className="space-y-2">
            {[
              { role: 'STUDENT', count: 856, color: 'bg-kit-100 text-kit-700' },
              { role: 'MENTOR', count: 48, color: 'bg-blue-100 text-blue-700' },
              { role: 'FACULTY', count: 86, color: 'bg-amber-100 text-amber-700' },
              { role: 'HOD', count: 8, color: 'bg-kit-100 text-kit-700' },
              { role: 'PLACEMENT_CELL', count: 6, color: 'bg-emerald-100 text-emerald-700' },
              { role: 'ADMIN', count: 4, color: 'bg-red-100 text-red-700' },
            ].map(({ role, count, color }) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{role}</span>
                <span className="font-medium text-gray-900">{count} users</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">System Overview</h3>
          <div className="space-y-4">
            {[
              { label: 'Total Resumes Uploaded', value: 642 },
              { label: 'Total Applications', value: 4821 },
              { label: 'Active Users (this month)', value: 723 },
              { label: 'New Registrations (this week)', value: 28 },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
