'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

interface FieldRow {
  id: string;
  key: string;
  label: string;
  value: string;
  category: string;
  enabled: boolean;
  sensitive: boolean;
  source: string;
  updatedAt: string;
  history?: Array<{ oldValue: string | null; newValue: string; createdAt: string }>;
}

export function AgentKnowledge() {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/extension/profile/custom-fields');
      setFields(res.data.fields || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (f: FieldRow) => {
    await api.patch(`/extension/profile/custom-fields/${f.id}`, { enabled: !f.enabled });
    load();
  };

  const remove = async (f: FieldRow) => {
    if (!confirm(`Delete “${f.label}”? The agent will ask again next time.`)) return;
    await api.delete(`/extension/profile/custom-fields/${f.id}`);
    load();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Apply Agent knowledge</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        These answers were saved with your approval while applying. The agent reuses them on future forms.
        It never learns from AI guesses or untrusted websites.
      </p>
      {loading ? <p className="text-gray-500">Loading…</p> : fields.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing learned yet. Apply with the extension and choose “Save for future applications”.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {fields.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="font-medium text-gray-900">{f.label}</p>
                <p className="text-sm text-gray-600">{f.value}</p>
                <p className="mt-1 text-xs text-gray-400">{f.key} · {f.source}{f.sensitive ? ' · sensitive' : ''}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(f)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">
                  {f.enabled ? 'Disable auto-use' : 'Enable'}
                </button>
                <button onClick={() => remove(f)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
