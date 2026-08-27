'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Registration {
  id: string;
  studentName: string;
  studentEmail: string;
  opportunityTitle: string;
  opportunityType: string;
  status: string;
  registeredAt: string;
}

export default function RegistrationsAdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRegistrations = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      // Fetch registrations from the dashboard API (which resolves registrations list)
      const res = await axios.get('/api/super-admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistrations(res.data.data.recentRegistrations || []);
    } catch {
      setError('Failed to fetch registrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Student Registrations</h1>
          <p className="mt-1 text-gray-500">View student sign-ups for campus jobs and hackathons</p>
        </div>
        <Button onClick={fetchRegistrations} className="border border-gray-200 hover:bg-gray-50 p-2.5 rounded-xl">
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </Button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <Card className="border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No student registrations recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-semibold">
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Opportunity</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-semibold text-gray-900">{r.studentName}</td>
                    <td className="p-4 text-gray-600">{r.studentEmail}</td>
                    <td className="p-4 text-gray-700 font-medium">{r.opportunityTitle}</td>
                    <td className="p-4 text-gray-600 uppercase text-xs font-semibold">{r.opportunityType}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'REGISTERED' || r.status === 'Registered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 font-medium">
                      {new Date(r.registeredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
