'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Upload,
  FileText,
  Trash2,
  Check,
  AlertCircle,
  ArrowLeft,
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  HardDrive,
  GraduationCap,
  Code,
  Briefcase,
  Layers,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/index';
import { formatDate, formatFileSize } from '@/lib/utils';
import api from '@/lib/api';
import type { Resume } from '@/types';

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Resume[] }>('/resumes');
      setResumes(res.data.data || []);
    } catch (err) {
      console.error('Failed to load resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const uploadFile = async (file: File) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc'];
    const hasValidExt = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(file.type) && !hasValidExt) {
      alert('Only PDF and DOCX files are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB.');
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
      await fetchResumes();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err?.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await api.delete(`/resumes/${deleteConfirmId}`);
      setResumes((prev) => prev.filter((r) => r.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete resume.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await api.patch(`/resumes/${id}/activate`);
      await fetchResumes();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to activate resume.');
    }
  };

  const activeResume = resumes.find((r) => r.isActive) || resumes[0];
  const otherResumes = resumes.filter((r) => r.id !== activeResume?.id);

  return (
    <div className="min-h-screen bg-[#f8fafc] py-7 font-sans text-slate-800">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Breadcrumb / Back to Dashboard */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/student"
            id="back-to-dashboard-button"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-98"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5 text-slate-500 group-hover:text-slate-800" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/60">
            <span>CareerAI</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-800 font-semibold">My Resume</span>
          </div>
        </div>

        {/* Page Title & Subtitle */}
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Resume</h1>
          <p className="text-xs text-slate-500">Manage your resumes and keep your latest version ready for applications.</p>
        </div>

        {/* Upload Success Banner */}
        {uploadSuccess && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Resume uploaded successfully! It is now active for campus applications.</span>
            </div>
            <button onClick={() => setUploadSuccess(false)} className="text-emerald-600 hover:text-emerald-800">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Upload Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upload New Resume</h2>
              <p className="text-xs text-slate-500">Upload a PDF or Word document to use as your application resume.</p>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-150 ${
              dragActive
                ? 'border-kit-600 bg-kit-50/50'
                : 'border-slate-300/90 bg-slate-50/40 hover:border-kit-400 hover:bg-kit-50/20'
            } ${uploading ? 'pointer-events-none opacity-80' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
                e.target.value = '';
              }}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <LoadingSpinner size="lg" />
                <p className="text-xs font-bold text-kit-800">Uploading and validating your resume...</p>
                <p className="text-[11px] text-slate-400">Please wait a moment</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kit-50 border border-kit-200/70 text-kit-700 shadow-2xs">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Upload your resume
                  </h3>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Drag & drop your file here</span>{' '}
                    <span className="text-slate-400">or</span>{' '}
                    <span className="text-kit-700 font-bold hover:underline">browse from your computer</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                  <span>PDF / DOCX</span>
                  <span>•</span>
                  <span>Maximum 5 MB</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumes Section */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-10 flex flex-col items-center justify-center space-y-3 shadow-xs">
            <LoadingSpinner size="md" />
            <p className="text-xs text-slate-500 font-medium">Loading your resume records...</p>
          </div>
        ) : resumes.length === 0 ? (
          /* Professional Empty State */
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 sm:p-10 text-center space-y-4 shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 border border-slate-200">
              <FileText className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">No resume uploaded yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload your resume to make applications faster and keep your career profile up to date for campus placements.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              className="font-bold px-5 py-2 text-xs rounded-xl shadow-2xs inline-flex items-center gap-2"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Resume
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Current / Active Resume Card */}
            {activeResume && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Current Resume</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Active Resume
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Attached to upcoming campus applications</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 sm:p-5 hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kit-100/80 text-kit-700 border border-kit-200/60 shadow-2xs">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold text-slate-900 truncate" title={activeResume.originalName}>
                        {activeResume.originalName}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-medium uppercase tracking-wider text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                          {activeResume.originalName.split('.').pop() || 'PDF'}
                        </span>
                        {activeResume.fileSize ? (
                          <span>{formatFileSize(activeResume.fileSize)}</span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          Uploaded {formatDate(activeResume.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <a
                      href={activeResume.fileUrl || `/api/resumes/${activeResume.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-kit-300 hover:bg-kit-50 hover:text-kit-800 transition-all shadow-2xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View</span>
                    </a>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-kit-300 hover:bg-kit-50 hover:text-kit-800 transition-all shadow-2xs"
                      title="Upload a new version to replace this resume"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Replace</span>
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(activeResume.id)}
                      className="inline-flex items-center gap-1 rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete resume"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Other Resumes list if any */}
            {otherResumes.length > 0 && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Previous Versions</h3>
                <div className="space-y-2.5">
                  {otherResumes.map((resume) => (
                    <div
                      key={resume.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/30 p-3.5 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{resume.originalName}</p>
                          <p className="text-[11px] text-slate-500">
                            {formatDate(resume.uploadedAt)} • {formatFileSize(resume.fileSize)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleSetActive(resume.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-kit-300 hover:bg-kit-50 hover:text-kit-800 transition-all"
                        >
                          <Check className="h-3 w-3" /> Set Active
                        </button>
                        <a
                          href={resume.fileUrl || `/api/resumes/${resume.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => setDeleteConfirmId(resume.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* AI Resume Insights Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-kit-50 text-kit-700 border border-kit-200/60">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">AI Resume Insights</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
              Coming in Phase 2
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Resume parsing and profile extraction will be available in Phase 2. The AI assistant will automatically parse your uploaded document and sync verified credentials directly to your student profile:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
              <GraduationCap className="h-4 w-4 text-kit-700 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Education extraction</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
              <Code className="h-4 w-4 text-kit-700 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Skills extraction</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
              <Briefcase className="h-4 w-4 text-kit-700 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Experience extraction</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
              <Layers className="h-4 w-4 text-kit-700 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Projects extraction</span>
            </div>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Resume</h4>
                <p className="text-xs text-slate-500">Are you sure you want to remove this resume?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              This action cannot be undone. Any active job applications using this file will no longer reference it.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleting}
                onClick={handleConfirmDelete}
                className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Resume
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
