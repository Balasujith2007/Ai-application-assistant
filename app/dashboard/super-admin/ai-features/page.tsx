'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, BrainCircuit, Check, X, ShieldAlert, Cpu, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AppFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  roles: string[];
}

export default function AIFeaturesPage() {
  const [aiFeatures, setAiFeatures] = useState<AppFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAIFeatures = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/features', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter for AI related features
      const list = res.data.data as AppFeature[];
      const aiList = list.filter(f => 
        f.name.includes('ai') || 
        f.name.includes('skill') || 
        f.name.includes('readiness')
      );
      setAiFeatures(aiList);
    } catch {
      setError('Failed to fetch AI features.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIFeatures();
  }, []);

  const handleToggleEnable = async (name: string, currentVal: boolean) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/super-admin/features', {
        name,
        enabled: !currentVal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(`Updated global state for ${name}`);
      fetchAIFeatures();
    } catch {
      setError('Failed to toggle AI feature.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <BrainCircuit className="h-8 w-8 text-kit-600 animate-pulse" /> AI Assistant Controls
        </h1>
        <p className="mt-1 text-gray-500">Enable or disable artificial intelligence features, resume checker utilities, and skill analysis pipelines</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : aiFeatures.length === 0 ? (
        <Card className="p-6 text-center border-gray-200">No AI-specific feature controls discovered.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aiFeatures.map((f) => (
            <Card key={f.name} className="border-gray-200 shadow-sm p-6 bg-white flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kit-50 text-kit-600">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 capitalize text-sm">{f.name.replace('-', ' ').replace('ai', 'AI')}</h3>
                      <p className="text-[10px] text-gray-400 font-mono">({f.name})</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEnable(f.name, f.enabled)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-all ${
                      f.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {f.enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {f.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <p className="text-xs text-gray-500 pt-1 leading-relaxed">{f.description}</p>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-[10px] font-semibold text-gray-400">
                <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> Engine: OpenAI GPT-4o</span>
                <span>Active for Student, Mentor roles</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
