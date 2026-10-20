'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  User,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface StudentProfilePhotoManagerProps {
  currentPhotoUrl?: string | null;
  studentName?: string;
  fallbackInitial?: string;
  onPhotoUpdated?: (newPhotoUrl: string | null) => void;
  className?: string;
}

export function StudentProfilePhotoManager({
  currentPhotoUrl,
  studentName,
  fallbackInitial,
  onPhotoUpdated,
  className = '',
}: StudentProfilePhotoManagerProps) {
  const { refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Component states
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [imgError, setImgError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Upload & preview states
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

  // Synchronize with external prop changes
  useEffect(() => {
    setPhotoUrl(currentPhotoUrl || null);
    setImgError(false);
  }, [currentPhotoUrl]);

  // Close popup menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side quick size validation (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        `Selected file exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please choose a smaller image.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Client-side MIME check (JPG, PNG, WebP)
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
    setIsMenuOpen(false);

    // Reset input so the same file can be reselected if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTriggerFileSelect = () => {
    setIsMenuOpen(false);
    fileInputRef.current?.click();
  };

  // Perform upload to server API
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setUploadProgress(45);

      const response = await api.post('/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 80) / progressEvent.total);
            setUploadProgress(Math.max(45, pct));
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

        // Refresh global Auth state in background
        refreshUser().catch((err) => console.warn('User refresh warning:', err));

        // Close preview after a brief success confirmation
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

        refreshUser().catch((err) => console.warn('User refresh warning:', err));
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

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Hidden Accessible File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="student-photo-file-input"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Upload student profile photo"
      />

      {/* Main Avatar Container matching exact dimensions and rounded-square shape */}
      <div className="relative group">
        <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden bg-slate-100 shadow-lg border-4 border-white ring-1 ring-slate-200/80 transition-all flex items-center justify-center">
          {hasPhoto ? (
            <img
              src={photoUrl!}
              alt={studentName ? `${studentName}'s profile photo` : 'Student profile photo'}
              className="h-full w-full object-cover rounded-xl"
              onError={() => setImgError(true)}
            />
          ) : fallbackInitial ? (
            <div className="h-full w-full rounded-xl bg-gradient-to-br from-kit-600 via-kit-700 to-kit-900 text-white font-black text-3xl sm:text-4xl shadow-inner flex items-center justify-center">
              {fallbackInitial}
            </div>
          ) : (
            // Clean neutral placeholder without generated initials
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
              <User className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 stroke-[1.5]" />
            </div>
          )}
        </div>

        {/* Online Indicator - positioned on bottom-left without interfering with bottom-right camera button */}
        <span
          className="absolute bottom-1.5 left-1.5 h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full border-2 border-white bg-emerald-500 ring-2 ring-emerald-400/30 flex items-center justify-center shadow-xs z-10"
          title="Active Student Account"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        </span>

        {/* Camera Edit Button - cleanly positioned at bottom-right corner */}
        <div ref={menuRef} className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 z-20">
          <button
            type="button"
            id="student-photo-edit-button"
            onClick={() => {
              if (!hasPhoto) {
                handleTriggerFileSelect();
              } else {
                setIsMenuOpen((prev) => !prev);
              }
            }}
            className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border-2 border-white ring-1 ring-slate-300 hover:bg-kit-50 hover:text-kit-600 hover:ring-kit-400 focus:outline-none focus:ring-2 focus:ring-kit-500 cursor-pointer transition-all transform active:scale-95"
            aria-label="Edit student profile photo"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            title={hasPhoto ? 'Change or remove profile photo' : 'Upload profile photo'}
          >
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Accessible Dropdown Menu positioned above the button */}
          {isMenuOpen && (
            <div
              role="menu"
              aria-labelledby="student-photo-edit-button"
              className="absolute right-0 bottom-full mb-2 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-50 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleTriggerFileSelect();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-50 hover:text-kit-700 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 text-kit-600" />
                <span>Change photo</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsRemoveConfirmOpen(true);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Remove photo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PHOTO PREVIEW & UPLOAD MODAL                                  */}
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
          {/* Header Description */}
          <div className="text-xs text-slate-500">
            Preview how your profile photo will appear across the CareerAI platform and leaderboard.
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Centered Preview Card */}
          <div className="flex flex-col items-center justify-center py-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            {previewUrl ? (
              <div className="relative">
                <div className="h-36 w-36 sm:h-44 sm:w-44 rounded-2xl overflow-hidden bg-white shadow-xl border-4 border-white ring-1 ring-slate-200/80">
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute bottom-2 right-2 rounded-full bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Preview
                </div>
              </div>
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ImageIcon className="h-10 w-10 text-slate-300" />
              </div>
            )}

            {/* File Metadata */}
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
      {/* PHOTO REMOVAL CONFIRMATION MODAL                              */}
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
                Your profile picture will be deleted and your avatar will revert to the default neutral placeholder across the platform.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

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
