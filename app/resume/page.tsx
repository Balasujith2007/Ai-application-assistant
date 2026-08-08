'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, EmptyState } from '@/components/ui/index';
import { formatDate, formatFileSize } from '@/lib/utils';
import api from '@/lib/api';
import type { Resume } from '@/types';

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Resume[] }>('/resumes');
      setResumes(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResumes(); }, []);

  const uploadFile = async (file: File) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowed.includes(file.type)) {
      alert('Only PDF and DOCX files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchResumes();
    } catch (err) {
      alert('Upload failed. Please try again.');
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resume?')) return;
    await api.delete(`/resumes/${id}`);
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSetActive = async (id: string) => {
    await api.patch(`/resumes/${id}/activate`);
    fetchResumes();
  };

  return (
    <DashboardLayout title="Resume" subtitle="Upload and manage your resumes">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'
          }`}
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
            <LoadingSpinner size="lg" />
          ) : (
            <>
              <div className="mb-4 rounded-2xl bg-indigo-100 p-5">
                <Upload className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {dragActive ? 'Drop your resume here' : 'Drag & drop or click to upload'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">Supports PDF and DOCX · Max 5MB</p>
            </>
          )}
        </div>

        {/* Resume list */}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No resumes uploaded"
            description="Upload your first resume to get started."
          />
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Your Resumes</h3>
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                  resume.isActive
                    ? 'border-indigo-200 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className={`rounded-xl p-3 ${resume.isActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <FileText className={`h-6 w-6 ${resume.isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{resume.originalName}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(resume.uploadedAt)} · {formatFileSize(resume.fileSize)}
                    {resume.isActive && (
                      <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Active
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!resume.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetActive(resume.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Set Active
                    </Button>
                  )}
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Note */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">AI Resume Parsing — Phase 2</p>
              <p className="mt-1 text-sm text-amber-700">
                In Phase 2, uploading your resume will automatically extract your education, skills, experience, and projects into your profile using AI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
