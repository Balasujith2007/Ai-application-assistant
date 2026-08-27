'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Briefcase, Calendar, MapPin, Building, Trophy, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Opportunity {
  id: string;
  title: string;
  organization: string;
  type: string;
  location: string;
  mode: string;
  deadline: string;
  registrationCount: number;
}

export default function OpportunitiesAdminPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOpportunities = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/opportunities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOpportunities(res.data.data);
    } catch {
      setError('Failed to fetch opportunities list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Campus Opportunities</h1>
          <p className="mt-1 text-gray-500">Monitor and track job postings, internships, and hackathons</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : opportunities.length === 0 ? (
        <Card className="p-6 text-center border-gray-200">No opportunities created yet.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {opportunities.map((opp) => (
            <Card key={opp.id} className="border-gray-200 shadow-sm p-6 bg-white hover:shadow-md transition-shadow flex flex-col justify-between h-full">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-gray-900">{opp.title}</h3>
                    <p className="text-sm font-semibold text-kit-700 flex items-center gap-1">
                      <Building className="h-4 w-4" /> {opp.organization}
                    </p>
                  </div>
                  <span className="inline-flex rounded-md bg-kit-50 px-2 py-1 text-xs font-semibold text-kit-700 uppercase">
                    {opp.type}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1.5 text-sm text-gray-500 pt-2">
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-400" /> {opp.location} ({opp.mode.toLowerCase()})</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-gray-400" /> Deadline: {new Date(opp.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between items-center text-xs font-semibold text-gray-500">
                <span>{opp.registrationCount} Registered Students</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
