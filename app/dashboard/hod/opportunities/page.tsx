'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone, Plus, Building, Calendar, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OpportunityBroadcastModal } from '@/components/opportunities/OpportunityBroadcastModal';
import api from '@/lib/api';

export default function HODOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/opportunities');
      setOpportunities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          HOD Opportunities & Broadcast System
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Publish organization-wide opportunities & broadcast targeted notifications
        </p>
      </div>
        {/* Banner Alert */}
        {notice && (
          <div className={`rounded-2xl p-4 text-sm font-semibold flex items-center justify-between shadow-sm border ${
            notice.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} className="text-xs font-bold opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* Top Actions Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-kit-600" /> Active Campus Opportunities
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">HOD Broadcasts are sent directly to student and mentor notification feeds</p>
          </div>

          <Button variant="primary" onClick={() => setShowCreateModal(true)} className="font-bold flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Broadcast Opportunity
          </Button>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
            No active opportunities posted. Click Broadcast Opportunity to publish one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opp) => (
              <div key={opp.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-kit-700 bg-kit-50 px-2.5 py-1 rounded-md">
                    {opp.type}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Target: {opp.targetAudience || 'ALL'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900">{opp.title}</h3>
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-gray-400" /> {opp.organization}
                </p>

                <p className="text-xs text-gray-600 line-clamp-2">{opp.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <span>📅 {new Date(opp.applicationDeadline).toLocaleDateString()}</span>
                  <span className="font-bold text-kit-600">{opp.registrationCount} Registrations</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reusable Broadcast Modal */}
        <OpportunityBroadcastModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setNotice({ type: 'success', message: 'Opportunity broadcasted successfully to all target users!' });
            fetchOpportunities();
          }}
          mode="hod"
        />
      </div>
    );
  }
