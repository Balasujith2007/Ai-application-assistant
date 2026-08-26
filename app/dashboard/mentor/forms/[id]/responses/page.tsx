'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Search,
  Users,
  Eye,
  X,
  CheckCircle2,
  Clock,
  BarChart2,
} from 'lucide-react';
import axios from 'axios';

interface ResponseItem {
  responseId: string;
  studentId: string;
  studentName: string;
  email: string;
  registerNo: string;
  department: string;
  year: string;
  section: string;
  submittedAt: string;
  answers: Record<string, string>;
}

interface FormFieldHeader {
  fieldId: string;
  label: string;
  type: string;
}

interface FormStats {
  assignedStudents: number;
  submitted: number;
  pending: number;
  completionRate: number;
}

export default function MentorFormResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('Form Responses');
  const [fields, setFields] = useState<FormFieldHeader[]>([]);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [stats, setStats] = useState<FormStats>({
    assignedStudents: 0,
    submitted: 0,
    pending: 0,
    completionRate: 0,
  });
  const [search, setSearch] = useState<string>('');
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/mentor/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data;
      if (data) {
        setFormTitle(data.formTitle || 'Form Responses');
        setFields(data.fields || []);
        setResponses(data.responses || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err: any) {
      console.error('Failed to load mentor responses:', err);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/mentor/forms/${formId}/responses?export=excel`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = formTitle.replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('download', `Mentor_Form_Responses_${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export responses to Excel.');
    } finally {
      setDownloading(false);
    }
  };

  const filteredResponses = responses.filter((r) => {
    const s = search.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      r.registerNo.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/mentor/forms')}
            className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="Back to Forms"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-kit-600" /> {formTitle}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Assigned student submission responses ({responses.length} total)</p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={downloading || responses.length === 0}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 w-fit"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          <span>Download Excel</span>
        </button>
      </motion.div>

      {/* Completion Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-kit-50 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-kit-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Assigned Students</span>
            <h3 className="text-2xl font-bold text-gray-900">{stats.assignedStudents}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Submitted</span>
            <h3 className="text-2xl font-bold text-emerald-600">{stats.submitted}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Pending</span>
            <h3 className="text-2xl font-bold text-amber-600">{stats.pending}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-kit-50 flex items-center justify-center shrink-0">
            <BarChart2 className="h-6 w-6 text-kit-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Completion Rate</span>
            <h3 className="text-2xl font-bold text-kit-600">{stats.completionRate}%</h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search student or register no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-1.5 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
          />
        </div>
      </div>

      {/* Responses Table */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-kit-600" />
          <p className="text-xs font-semibold mt-2">Loading student responses…</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-2xs space-y-2">
          <Users className="h-10 w-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">No responses recorded yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Once your assigned students submit their responses to this form, they will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Reg No</th>
                  <th className="px-4 py-3">Dept & Class</th>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResponses.map((res) => (
                  <tr key={res.responseId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {res.studentName}
                      <span className="block text-[11px] font-normal text-gray-400">{res.email}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{res.registerNo}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {res.department} {res.year !== '—' && `• Yr ${res.year}`} {res.section !== '—' && `Sec ${res.section}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(res.submittedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedResponse(res)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-kit-600 hover:text-kit-700 bg-kit-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Answers
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Answer View Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedResponse.studentName}</h3>
                <p className="text-xs text-gray-500">
                  Reg No: {selectedResponse.registerNo} • Submitted: {new Date(selectedResponse.submittedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedResponse(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 pt-2">
              {fields.map((f) => {
                const answerVal = selectedResponse.answers[f.fieldId] || '—';
                const isFile = answerVal.startsWith('/uploads/');
                return (
                  <div key={f.fieldId} className="rounded-xl bg-gray-50 p-4 border border-gray-100 text-xs space-y-1">
                    <span className="font-bold text-gray-900 block">{f.label}</span>
                    {isFile ? (
                      <a
                        href={answerVal}
                        target="_blank"
                        rel="noreferrer"
                        className="text-kit-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        Download Uploaded File
                      </a>
                    ) : (
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{answerVal}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
