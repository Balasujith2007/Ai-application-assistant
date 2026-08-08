'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/Card';
import { Users, Briefcase, Star, CheckCircle } from 'lucide-react';

export default function HODDashboard() {
  return (
    <DashboardLayout title="HOD Dashboard" subtitle="Department performance overview">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Dept. Students" value={142} icon={<Users className="h-5 w-5" />} color="indigo" />
        <StatCard title="Applications" value={312} icon={<Briefcase className="h-5 w-5" />} color="blue" />
        <StatCard title="Interviews" value={48} icon={<Star className="h-5 w-5" />} color="purple" />
        <StatCard title="Offers" value={36} icon={<CheckCircle className="h-5 w-5" />} color="emerald" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Department Performance</h3>
          {[
            { label: 'Placement Rate', value: 87, color: 'bg-emerald-500' },
            { label: 'Avg Package (LPA)', value: 72, color: 'bg-indigo-500' },
            { label: 'Internship Rate', value: 65, color: 'bg-blue-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="mb-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium">{value}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Year-wise Overview</h3>
          <div className="space-y-3">
            {[
              { year: '4th Year', placed: 30, total: 33 },
              { year: '3rd Year', placed: 28, total: 36 },
              { year: '2nd Year', placed: 12, total: 38 },
            ].map(({ year, placed, total }) => (
              <div key={year} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{year}</span>
                <span className="font-medium text-gray-900">{placed}/{total} placed</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
