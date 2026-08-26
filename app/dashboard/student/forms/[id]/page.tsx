'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { FileText, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { FormRenderer, FormDefinition } from '@/components/forms/FormRenderer';

export default function StudentFormFillPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForm = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForm(res.data.data);
    } catch (err: any) {
      console.error('Failed to load form:', err);
      const msg = err.response?.data?.message || 'Could not load form definition.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-kit-600" />
        <p className="text-xs font-semibold mt-2">Loading form…</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-rose-950">Form Unavailable</h2>
          <p className="text-xs text-rose-700">{error || 'Form not found or has been closed.'}</p>
          <button
            onClick={() => router.push('/dashboard/student')}
            className="inline-flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2 text-xs font-semibold text-white hover:bg-kit-700 transition-colors mt-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (form.hasSubmitted && !form.allowMultipleSubmissions) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="rounded-2xl border border-kit-200 bg-kit-50/70 p-8 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-kit-600 mx-auto" />
          <h2 className="text-lg font-bold text-kit-900">Response Already Submitted</h2>
          <p className="text-xs text-kit-700">
            You have already submitted a response for "{form.title}". This form does not allow multiple submissions.
          </p>
          <button
            onClick={() => router.push('/dashboard/student')}
            className="inline-flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2 text-xs font-semibold text-white hover:bg-kit-700 transition-colors mt-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-16 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <FormRenderer form={form} mode="student" />
    </div>
  );
}
