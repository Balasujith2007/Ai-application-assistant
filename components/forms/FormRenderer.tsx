'use client';

import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Check,
  Star,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import axios from 'axios';

export interface FormFieldData {
  id?: string;
  fieldId: string;
  type: string;
  label: string;
  description?: string | null;
  placeholder?: string | null;
  required?: boolean;
  order?: number;
  config?: {
    options?: string[];
    min?: number;
    max?: number;
    allowedFileTypes?: string;
    maxFileSizeMb?: number;
    profileKey?: string;
    isReadOnly?: boolean;
  } | null;
  prefilledValue?: string;
}

export interface FormDefinition {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  allowMultipleSubmissions?: boolean;
  confirmationMessage?: string | null;
  fields: FormFieldData[];
  hasSubmitted?: boolean;
}

interface FormRendererProps {
  form: FormDefinition;
  mode?: 'preview' | 'student';
  onSubmitSuccess?: () => void;
}

export function FormRenderer({ form, mode = 'student', onSubmitSuccess }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    form.fields.forEach((f) => {
      if (f.prefilledValue) {
        initial[f.fieldId] = f.prefilledValue;
      } else if (f.type === 'checkbox' || f.type === 'multiselect') {
        initial[f.fieldId] = [];
      } else {
        initial[f.fieldId] = '';
      }
    });
    return initial;
  });

  const [files, setFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setFormData((prev) => {
      const currentList: string[] = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      if (checked) {
        if (!currentList.includes(option)) currentList.push(option);
      } else {
        const idx = currentList.indexOf(option);
        if (idx !== -1) currentList.splice(idx, 1);
      }
      return { ...prev, [fieldId]: currentList };
    });
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    if (file) {
      setFiles((prev) => ({ ...prev, [fieldId]: file }));
      setFormData((prev) => ({ ...prev, [fieldId]: file.name }));
    } else {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      setFormData((prev) => ({ ...prev, [fieldId]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    form.fields.forEach((field) => {
      if (field.type === 'section' || field.type === 'paragraph') return;

      const val = formData[field.fieldId];
      const valStr = typeof val === 'string' ? val.trim() : '';

      if (field.required) {
        if (field.type === 'checkbox' || field.type === 'multiselect') {
          if (!Array.isArray(val) || val.length === 0) {
            newErrors[field.fieldId] = `${field.label} is required.`;
          }
        } else if (!valStr && !files[field.fieldId]) {
          newErrors[field.fieldId] = `${field.label} is required.`;
        }
      }

      if (valStr && field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(valStr)) {
          newErrors[field.fieldId] = 'Please enter a valid email address.';
        }
      }

      if (valStr && field.type === 'number') {
        if (isNaN(Number(valStr))) {
          newErrors[field.fieldId] = 'Please enter a valid number.';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'preview') {
      alert('Preview Mode: Form submission simulated successfully! Real data will not be saved.');
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payloadData = new FormData();

      Object.entries(formData).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          payloadData.append(k, JSON.stringify(v));
        } else {
          payloadData.append(k, v ?? '');
        }
      });

      Object.entries(files).forEach(([k, file]) => {
        payloadData.append(k, file);
      });

      const res = await axios.post(`/api/forms/${form.id}`, payloadData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setSubmittedMessage(res.data.message || 'Your response has been submitted successfully.');
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err: any) {
      console.error('Form submission error:', err);
      const msg = err.response?.data?.message || 'Failed to submit response. Please try again.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedMessage) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center shadow-xs">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-emerald-950">Response Submitted</h2>
        <p className="text-sm text-emerald-700 mt-2">{submittedMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{form.title || 'Untitled Form'}</h1>
        {form.description && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{form.description}</p>}
        {form.instructions && (
          <div className="mt-4 rounded-xl bg-kit-50/70 border border-kit-100 p-3.5 text-xs text-kit-900">
            <strong>Instructions:</strong> {form.instructions}
          </div>
        )}
      </div>

      {/* Fields List */}
      <div className="space-y-5">
        {form.fields.map((field) => {
          const fieldErr = errors[field.fieldId];
          const cfg = field.config || {};
          const options = Array.isArray(cfg.options) ? cfg.options : [];

          if (field.type === 'section') {
            return (
              <div key={field.fieldId} className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">{field.label}</h3>
                {field.description && <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>}
              </div>
            );
          }

          if (field.type === 'paragraph') {
            return (
              <div key={field.fieldId} className="rounded-xl bg-gray-50 p-4 border border-gray-200 text-xs text-gray-600">
                <p className="font-semibold text-gray-900 mb-1">{field.label}</p>
                {field.description && <p>{field.description}</p>}
              </div>
            );
          }

          return (
            <div key={field.fieldId} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-2">
              <label className="block text-xs font-bold text-gray-900">
                {field.label}
                {field.required && <span className="text-rose-600 ml-1">*</span>}
                {cfg.profileKey && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-kit-600 bg-kit-50 px-2 py-0.5 rounded-md">
                    <UserCheck className="h-3 w-3" /> Auto-filled from Profile
                  </span>
                )}
              </label>

              {field.description && <p className="text-[11px] text-gray-500">{field.description}</p>}

              {/* Field Types Inputs */}
              {field.type === 'short-text' && (
                <input
                  type="text"
                  placeholder={field.placeholder || ''}
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                />
              )}

              {field.type === 'long-text' && (
                <textarea
                  rows={3}
                  placeholder={field.placeholder || ''}
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                />
              )}

              {field.type === 'email' && (
                <input
                  type="email"
                  placeholder={field.placeholder || 'example@domain.com'}
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                />
              )}

              {field.type === 'phone' && (
                <input
                  type="tel"
                  placeholder={field.placeholder || '+91 9876543210'}
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  placeholder={field.placeholder || '0'}
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                />
              )}

              {field.type === 'date' && (
                <input
                  type="date"
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                />
              )}

              {field.type === 'dropdown' && (
                <select
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                >
                  <option value="">Select an option</option>
                  {options.map((opt: string, i: number) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.type === 'radio' && (
                <div className="space-y-2 pt-1">
                  {options.map((opt: string, i: number) => (
                    <label key={i} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name={field.fieldId}
                        value={opt}
                        checked={formData[field.fieldId] === opt}
                        onChange={() => handleInputChange(field.fieldId, opt)}
                        className="h-4 w-4 text-kit-600 focus:ring-kit-500 border-gray-300"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'checkbox' && (
                <div className="space-y-2 pt-1">
                  {options.map((opt: string, i: number) => {
                    const currentVals: string[] = Array.isArray(formData[field.fieldId]) ? formData[field.fieldId] : [];
                    const isChecked = currentVals.includes(opt);
                    return (
                      <label key={i} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(field.fieldId, opt, e.target.checked)}
                          className="h-4 w-4 rounded-sm text-kit-600 focus:ring-kit-500 border-gray-300"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {field.type === 'yesno' && (
                <div className="flex items-center gap-4 pt-1">
                  {['Yes', 'No'].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name={field.fieldId}
                        value={opt}
                        checked={formData[field.fieldId] === opt}
                        onChange={() => handleInputChange(field.fieldId, opt)}
                        className="h-4 w-4 text-kit-600 focus:ring-kit-500 border-gray-300"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'file' && (
                <div className="pt-1">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(field.fieldId, e.target.files?.[0] || null)}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-kit-50 file:text-kit-700 hover:file:bg-kit-100"
                  />
                  {files[field.fieldId] && (
                    <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                      Selected: {files[field.fieldId].name} ({(files[field.fieldId].size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}

              {field.type === 'url' && (
                <input
                  type="url"
                  placeholder={field.placeholder || 'https://'}
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
                />
              )}

              {field.type === 'rating' && (
                <div className="flex items-center gap-1 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleInputChange(field.fieldId, String(star))}
                      className="p-1 text-gray-300 hover:text-amber-400 focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          Number(formData[field.fieldId]) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  {formData[field.fieldId] && (
                    <span className="text-xs font-semibold text-gray-600 ml-2">
                      {formData[field.fieldId]} / 5
                    </span>
                  )}
                </div>
              )}

              {field.type === 'profile-field' && (
                <input
                  type="text"
                  readOnly={cfg.isReadOnly !== false}
                  value={formData[field.fieldId] || ''}
                  onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200 ${
                    cfg.isReadOnly !== false ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : 'bg-white'
                  }`}
                />
              )}

              {fieldErr && (
                <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {fieldErr}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-kit-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-kit-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Submitting…</span>
            </>
          ) : (
            <span>{mode === 'preview' ? 'Submit (Simulate Preview)' : 'Submit Response'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
