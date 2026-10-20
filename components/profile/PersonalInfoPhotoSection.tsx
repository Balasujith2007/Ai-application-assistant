'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface PersonalInfoPhotoSectionProps {
  currentPhotoUrl?: string | null;
  studentName?: string;
  onPhotoUpdated?: (newPhotoUrl: string | null) => void;
  className?: string;
}

export function PersonalInfoPhotoSection({
  currentPhotoUrl,
  studentName,
  onPhotoUpdated,
  className = '',
}: PersonalInfoPhotoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo state
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [imgError, setImgError] = useState(false);

  // Upload & preview modal states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Remove confirmation states
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Synchronize with external prop updates
  useEffect(() => {
    setPhotoUrl(currentPhotoUrl || null);
    setImgError(false);
  }, [currentPhotoUrl]);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle file selection from local device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side quick size validation (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        `Selected file exceeds 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a smaller photo.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Supported formats: JPG/JPEG, PNG, WebP
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setErrorMessage('Unsupported format. Please select a JPG, PNG, or WebP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setIsPreviewOpen(true);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Perform upload to server API
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setUploadProgress(50);

      const response = await api.post('/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 80) / progressEvent.total);
            setUploadProgress(Math.max(50, pct));
          }
        },
      });

      setUploadProgress(100);

      const data = response.data;
      if (data.success && data.profilePhotoUrl) {
        setPhotoUrl(data.profilePhotoUrl);
        setImgError(false);
        setSuccessMessage('Profile photo updated successfully!');

        if (onPhotoUpdated) {
          onPhotoUpdated(data.profilePhotoUrl);
        }

        setTimeout(() => {
          setIsPreviewOpen(false);
          setSelectedFile(null);
          setSuccessMessage(null);
          setUploadProgress(0);
        }, 1200);
      } else {
        throw new Error(data.error || 'Failed to update profile photo.');
      }
    } catch (err: any) {
      console.error('Profile photo upload error:', err);
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to upload profile photo. Please try again.';
      setErrorMessage(serverMsg);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove photo handler
  const handleRemovePhoto = async () => {
    setIsRemoving(true);
    setErrorMessage(null);

    try {
      const response = await api.delete('/profile/photo');
      if (response.data.success) {
        setPhotoUrl(null);
        setImgError(false);

        if (onPhotoUpdated) {
          onPhotoUpdated(null);
        }

        setIsRemoveConfirmOpen(false);
      } else {
        throw new Error(response.data.error || 'Failed to remove profile photo.');
      }
    } catch (err: any) {
      console.error('Profile photo removal error:', err);
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to remove photo. Please try again.';
      setErrorMessage(serverMsg);
    } finally {
      setIsRemoving(false);
    }
  };

  const hasPhoto = Boolean(photoUrl && !imgError);
  const initialLetter = studentName?.charAt(0).toUpperCase() || 'B';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Accessible Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="personal-info-photo-input"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Select student profile photo"
      />

      {/* Section Subheader matching Personal Info group styling */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Camera className="h-3.5 w-3.5 text-kit-600" />
        <span>Profile Photo</span>
      </div>

      {/* Compact, Professional Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/40 to-slate-50/60 p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Thumbnail Preview & Info */}
          <div className="flex items-center gap-4">
            {/* Square Rounded Photo Preview */}
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-slate-100 shadow-xs border-2 border-slate-200/90 shrink-0 flex items-center justify-center">
              {hasPhoto ? (
                <img
                  src={photoUrl!}
                  alt={studentName ? `${studentName}'s profile photo` : 'Student profile photo'}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-kit-600 via-kit-700 to-kit-900 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center">
                  {initialLetter}
                </div>
              )}
            </div>

            {/* Photo Details */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {hasPhoto ? 'Custom Profile Photo' : 'Default Avatar (Initial)'}
                </span>
                {hasPhoto && (
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                JPG, PNG, or WebP · Maximum 5 MB
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
            {hasPhoto ? (
              <>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleTriggerUpload}
                  className="inline-flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Change Photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRemoveConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 py-2 px-3 rounded-xl transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  <span>Remove Photo</span>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleTriggerUpload}
                className="inline-flex items-center gap-1.5 text-xs font-bold py-2 px-4 rounded-xl shadow-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Photo</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PREVIEW & CONFIRM UPLOAD MODAL                                */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => {
          if (!isUploading) {
            setIsPreviewOpen(false);
            setSelectedFile(null);
            setErrorMessage(null);
            setSuccessMessage(null);
          }
        }}
        title="Preview Profile Photo"
        size="md"
      >
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-500">
            Preview your photo before saving. Photos are securely stored on Cloudinary with face detection cropping.
          </p>

          {/* Success Alert */}
          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Preview Box */}
          <div className="flex flex-col items-center justify-center py-5 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            {previewUrl ? (
              <div className="relative">
                <div className="h-36 w-36 sm:h-44 sm:w-44 rounded-2xl overflow-hidden bg-white shadow-xl border-4 border-white ring-1 ring-slate-200/80">
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/80 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Preview
                </span>
              </div>
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ImageIcon className="h-10 w-10 text-slate-300" />
              </div>
            )}

            {selectedFile && (
              <div className="mt-4 text-center">
                <p className="text-xs font-bold text-slate-800 max-w-xs truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type.replace('image/', '').toUpperCase()}
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-kit-600" />
                  Uploading and optimizing with Cloudinary...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-kit-600 to-rose-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => {
                setIsPreviewOpen(false);
                setSelectedFile(null);
                setErrorMessage(null);
              }}
              className="text-xs font-bold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              disabled={isUploading || !selectedFile}
              onClick={handleUploadPhoto}
              className="text-xs font-bold min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Save & Upload'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* REMOVAL CONFIRMATION MODAL                                    */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isRemoveConfirmOpen}
        onClose={() => !isRemoving && setIsRemoveConfirmOpen(false)}
        title="Remove Profile Photo"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Are you sure?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your profile photo will be removed and your avatar will revert to your generated initial letter.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isRemoving}
              onClick={() => setIsRemoveConfirmOpen(false)}
              className="text-xs font-bold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="danger"
              disabled={isRemoving}
              onClick={handleRemovePhoto}
              className="text-xs font-bold"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Removing...
                </>
              ) : (
                'Remove Photo'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
