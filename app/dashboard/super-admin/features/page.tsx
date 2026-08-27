'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Check, X, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AppFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  roles: string[];
}

const ALL_ROLES = ['STUDENT', 'MENTOR', 'HOD', 'SUPER_ADMIN'];

export default function FeatureManagementPage() {
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFeatures = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/features', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeatures(res.data.data);
    } catch {
      setError('Failed to fetch app features list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleToggleEnable = async (featureName: string, currentVal: boolean) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/super-admin/features', {
        name: featureName,
        enabled: !currentVal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(`Updated feature ${featureName} status.`);
      fetchFeatures();
    } catch {
      setError('Failed to update feature state.');
    }
  };

  const handleRoleToggle = async (featureName: string, currentRoles: string[], targetRole: string) => {
    setError('');
    setSuccess('');
    let updatedRoles = [];
    if (currentRoles.includes(targetRole)) {
      updatedRoles = currentRoles.filter(r => r !== targetRole);
    } else {
      updatedRoles = [...currentRoles, targetRole];
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/super-admin/features', {
        name: featureName,
        roles: updatedRoles
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(`Updated allowed roles for feature ${featureName}.`);
      fetchFeatures();
    } catch {
      setError('Failed to update feature allowed roles.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Feature Toggle Management</h1>
        <p className="mt-1 text-gray-500">Globally enable or disable major system modules and restrict role visibility</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      {/* Features List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : features.length === 0 ? (
        <Card className="p-6 text-center border-gray-200">No features found in database.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {features.map((f) => (
            <Card key={f.name} className="border-gray-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white">
              <div className="space-y-1 max-w-lg">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 capitalize">{f.name.replace('-', ' ')}</h3>
                  <span className="text-xs text-gray-400 font-mono">({f.name})</span>
                </div>
                <p className="text-sm text-gray-500">{f.description}</p>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Roles allowed */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Allowed Roles</span>
                  <div className="flex flex-wrap gap-3">
                    {ALL_ROLES.map(r => {
                      const isAllowed = f.roles.includes(r);
                      return (
                        <button
                          key={r}
                          onClick={() => handleRoleToggle(f.name, f.roles, r)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            isAllowed
                              ? 'bg-kit-100 text-kit-700 border border-kit-200'
                              : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                          }`}
                        >
                          {r.toLowerCase().replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block h-10 w-px bg-gray-200" />

                {/* Global Status Switch */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Global State</span>
                  <button
                    onClick={() => handleToggleEnable(f.name, f.enabled)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold cursor-pointer transition-all ${
                      f.enabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'
                    }`}
                  >
                    {f.enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {f.enabled ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
