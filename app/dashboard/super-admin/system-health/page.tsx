'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, RefreshCw, Database, Key, Bell, Laptop, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface HealthStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  message: string;
  activeSessions24h?: number;
}

interface SystemHealth {
  database: HealthStatus;
  authentication: HealthStatus;
  notifications: HealthStatus;
  autoFillAgent: HealthStatus;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/system-health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHealth(res.data.data);
    } catch {
      setError('Failed to fetch system health status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const renderStatusBadge = (status: 'UP' | 'DOWN' | 'DEGRADED') => {
    if (status === 'UP') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> ONLINE
        </span>
      );
    }
    if (status === 'DEGRADED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <AlertTriangle className="h-3 w-3" /> DEGRADED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <XCircle className="h-3 w-3" /> OFFLINE
      </span>
    );
  };

  const getHealthIcon = (key: string) => {
    switch (key) {
      case 'database': return <Database className="h-6 w-6" />;
      case 'authentication': return <Key className="h-6 w-6" />;
      case 'notifications': return <Bell className="h-6 w-6" />;
      case 'autoFillAgent': return <Laptop className="h-6 w-6" />;
      default: return <Database className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Health Monitor</h1>
          <p className="mt-1 text-gray-500">Live checks on the database connectivity, authentication flow, and notification queues</p>
        </div>
        <Button onClick={fetchHealth} className="border border-gray-200 hover:bg-gray-50 p-2.5 rounded-xl">
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </Button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : !health ? (
        <div className="text-center py-12 text-gray-500">No health data available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(health).map(([key, data]) => (
            <Card key={key} className="border-gray-200 shadow-sm p-6 bg-white flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      data.status === 'UP' ? 'bg-emerald-50 text-emerald-600' : data.status === 'DEGRADED' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {getHealthIcon(key)}
                    </div>
                    <h3 className="font-bold text-gray-900 capitalize text-sm">{key.replace('autoFillAgent', 'Apply AI Agent')}</h3>
                  </div>
                  {renderStatusBadge(data.status)}
                </div>

                <p className="text-xs text-gray-500 pt-1 leading-relaxed">{data.message}</p>
                {data.activeSessions24h !== undefined && (
                  <p className="text-xs font-semibold text-kit-700">
                    Extension Sessions (24h): {data.activeSessions24h}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
