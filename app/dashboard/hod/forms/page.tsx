'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Edit,
  Eye,
  MessageSquare,
  Copy,
  Trash2,
  Send,
  Lock,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import axios from 'axios';

interface FormItem {
  id: string;
  title: string;
  description: string;
  instructions: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  fieldsCount: number;
  responsesCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
}

export default function HODFormsPage() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [tabFilter, setTabFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'CLOSED'>('ALL');
  const [creating, setCreating] = useState<boolean>(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const router = useRouter();

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await axios.get('/api/hod/forms', { headers });
      setForms(res.data.data || []);
    } catch (err: any) {
      console.error('Failed to load forms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleCreateForm = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await axios.post(
        '/api/hod/forms',
        { title: 'Untitled Form' },
        { headers }
      );
      const newFormId = res.data.data?.id;
      if (newFormId) {
        router.push(`/dashboard/hod/forms/${newFormId}/edit`);
      } else {
        alert(res.data?.message || 'Could not create new form.');
      }
    } catch (err: any) {
      console.error('Failed to create form:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Could not create new form: ${serverMsg}`);
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (form: FormItem) => {
    setActionId(form.id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/hod/forms/${form.id}/publish`,
        { action: 'publish' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchForms();
    } catch (err: any) {
      console.error('Publish error:', err);
      const msg = err.response?.data?.message || err.response?.data?.errors?.join('\n') || 'Failed to publish form.';
      alert(msg);
    } finally {
      setActionId(null);
    }
  };

  const handleClose = async (form: FormItem) => {
    if (!confirm(`Are you sure you want to close "${form.title}"? Students will no longer be able to submit responses.`)) return;
    setActionId(form.id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/hod/forms/${form.id}/publish`,
        { action: 'close' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchForms();
    } catch (err: any) {
      console.error('Close error:', err);
      alert('Failed to close form.');
    } finally {
      setActionId(null);
    }
  };

  const handleDuplicate = async (form: FormItem) => {
    setActionId(form.id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/hod/forms/${form.id}/publish`,
        { action: 'duplicate' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchForms();
    } catch (err: any) {
      console.error('Duplicate error:', err);
      alert('Failed to duplicate form.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (form: FormItem) => {
    if (!confirm(`Delete form "${form.title}"? This action cannot be undone.`)) return;
    setActionId(form.id);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/hod/forms/${form.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchForms();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete form.');
    } finally {
      setActionId(null);
    }
  };

  const filteredForms = forms.filter((f) => {
    const matchesTab = tabFilter === 'ALL' || f.status === tabFilter;
    const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" /> Form Builder
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage custom forms for students and department activities</p>
        </div>
        <button
          onClick={handleCreateForm}
          disabled={creating}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 w-fit"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span>Create Form</span>
        </button>
      </motion.div>

      {/* Filter Tabs & Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {(['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTabFilter(tab)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                tabFilter === tab
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab === 'ALL' ? 'All Forms' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search forms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </motion.div>

      {/* Forms Grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-xs font-semibold mt-2">Loading forms…</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-2xs space-y-3">
          <FileText className="h-10 w-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">No forms found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Create your first form to collect student information, registrations, feedback, or department responses.
          </p>
          <button
            onClick={handleCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs mt-2"
          >
            <Plus className="h-3.5 w-3.5" /> Create Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => {
            const isActing = actionId === form.id;
            return (
              <div key={form.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-gray-900 line-clamp-1">{form.title}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        form.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : form.status === 'DRAFT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {form.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
                    {form.description || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 border-y border-gray-100 py-3 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-400 block text-[10px] font-semibold uppercase">Questions</span>
                      <span className="font-bold text-gray-900">{form.fieldsCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] font-semibold uppercase">Responses</span>
                      <span className="font-bold text-indigo-600">{form.responsesCount}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Updated {new Date(form.updatedAt).toLocaleDateString()}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 gap-1">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/hod/forms/${form.id}/edit`}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Form"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/dashboard/hod/forms/${form.id}/edit?preview=true`}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Preview Form"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/dashboard/hod/forms/${form.id}/responses`}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative"
                        title="View Responses"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDuplicate(form)}
                        disabled={isActing}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Duplicate Form"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(form)}
                        disabled={isActing}
                        className="p-1.5 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Delete Form"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {form.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(form)}
                        disabled={isActing}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Publish</span>
                      </button>
                    )}

                    {form.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleClose(form)}
                        disabled={isActing}
                        className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>Close</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
