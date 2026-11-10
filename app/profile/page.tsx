'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Code,
  Briefcase,
  Link as LinkIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Trophy,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Globe,
  Award,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Lock,
  SlidersHorizontal,
  Copy,
  Check,
  Lightbulb,
  CheckCheck,
  ChevronRight,
  TrendingUp,
  FileText,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/index';
import { ExternalSyncStatusPanel } from '@/components/ExternalSyncStatusPanel';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Profile, Education, Project, Experience, Skill } from '@/types';
import MentorProfilePage from '@/app/dashboard/mentor/profile/page';
import HODProfilePage from '@/app/dashboard/hod/profile/page';
import { StudentProfilePhotoManager } from '@/components/profile/StudentProfilePhotoManager';
import { PersonalInfoPhotoSection } from '@/components/profile/PersonalInfoPhotoSection';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function CodeChefIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v7z" fill="none" />
      <path d="M18.8 9.5c-.4-.8-1.1-1.3-2-1.5-.2-.9-.8-1.6-1.7-2-.8-.4-1.8-.4-2.6 0-.6-.8-1.5-1.3-2.5-1.3-1 0-2 .5-2.5 1.3-.8-.4-1.8-.4-2.6 0-.9.4-1.5 1.1-1.7 2-.9.2-1.6.7-2 1.5-.4.8-.4 1.7 0 2.5.3.6.8 1.1 1.4 1.4v2.6c0 1.1.9 2 2 2h9.6c1.1 0 2-.9 2-2v-2.6c.6-.3 1.1-.8 1.4-1.4.4-.8.4-1.7.2-2.5zm-3.2 6.5H8.4v-2h7.2v2zm.8-4.2c-.2.2-.5.3-.8.3H8.4c-.3 0-.6-.1-.8-.3-.2-.2-.3-.5-.3-.8s.1-.6.3-.8l.8-.8c.4-.4 1.1-.4 1.5 0l.4.4.4-.4c.4-.4 1.1-.4 1.5 0l.4.4.4-.4c.4-.4 1.1-.4 1.5 0l.8.8c.2.2.3.5.3.8s-.1.6-.3.8z" />
    </svg>
  );
}

function LeetCodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" {...props}>
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 4.818 3.639 5.816 5.816 0 0 0 2.457-.152 5.922 5.922 0 0 0 1.956-.99l3.968-3.663a1.376 1.376 0 1 0-1.871-2.016l-3.96 3.656a3.176 3.176 0 0 1-1.048.53 3.12 3.12 0 0 1-1.317.082 3.187 3.187 0 0 1-2.593-1.956 3.01 3.01 0 0 1-.188-.544 3.024 3.024 0 0 1-.034-1.268 2.87 2.87 0 0 1 .65-1.134l3.864-4.137 4.41-4.786a1.373 1.373 0 0 0-.95-2.355z" />
      <path d="M19.467 11.238H9.865a1.375 1.375 0 1 0 0 2.75h9.602a1.375 1.375 0 1 0 0-2.75z" />
    </svg>
  );
}

// ──────────────────────────────────────────────────
// Shared profile helpers
// ──────────────────────────────────────────────────

/**
 * Tracks unsaved edits across the eight profile sections so the page can warn the
 * student before they navigate away or switch sections mid-edit.
 */
const ProfileDirtyContext = React.createContext<{ setDirty: (value: boolean) => void }>({
  setDirty: () => {},
});

function useSectionDirty(isDirty: boolean) {
  const { setDirty } = React.useContext(ProfileDirtyContext);
  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);
}

/** Consistent heading + description used by every profile section. */
function SectionHeading({
  icon: Icon,
  title,
  description,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-slate-100 pb-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-kit-200/60 bg-kit-50 text-kit-700">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
        </div>
        <p className="pl-11 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      {right}
    </div>
  );
}

/** Inline, non-blocking form feedback banner (replaces browser alert() dialogs). */
function FormFeedback({ status, message }: { status: 'success' | 'error'; message: string }) {
  if (!message) return null;
  const isSuccess = status === 'success';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      )}
      <span>{message}</span>
    </div>
  );
}

/** Red asterisk marker for required fields. */
function RequiredMark() {
  return <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>;
}

/** Small muted caption used for optional / helper hints under a field label. */
function FieldHint({ children }: { children: React.ReactNode }) {
  // Inline element (not <p>) so it stays valid when nested inside a <label>.
  return <span className="ml-1.5 text-[10.5px] font-normal text-slate-400">{children}</span>;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  // If authenticated user is a Head of Department, render the dedicated HOD Profile
  if (user?.role === 'HOD') {
    return <HODProfilePage />;
  }

  // If authenticated user is a Faculty Mentor, render the dedicated Faculty Profile
  if (user?.role === 'MENTOR' || user?.role === 'FACULTY') {
    return <MentorProfilePage />;
  }
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verifiedList, setVerifiedList] = useState<any[]>([]);
  // Server-derived verification summary (never fabricated on the client).
  const [verification, setVerification] = useState<{
    profileExists: boolean;
    ownershipVerified: boolean;
    profileVerified: boolean;
    placementVerified: boolean;
    aiResumeSynced: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('personal');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const setDirty = useCallback((value: boolean) => setHasUnsavedChanges(value), []);
  const dirtyContextValue = useMemo(() => ({ setDirty }), [setDirty]);

  // Warn on browser refresh / close while a section has unsaved edits.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSectionChange = useCallback(
    (id: string) => {
      if (id === activeSection) return;
      if (hasUnsavedChanges && !window.confirm('You have unsaved changes in this section. Discard them and switch sections?')) {
        return;
      }
      setActiveSection(id);
    },
    [activeSection, hasUnsavedChanges]
  );

  const fetchProfile = useCallback(async () => {
    try {
      const [resProfile, resVerified] = await Promise.all([
        api.get<{ data: Profile }>('/profiles/me'),
        api.get('/profiles/verified').catch(() => ({ data: { verifiedProfiles: [], verification: null } }))
      ]);
      setProfile(resProfile.data.data);
      if (resVerified.data?.verifiedProfiles) {
        setVerifiedList(resVerified.data.verifiedProfiles);
      }
      if (resVerified.data?.verification) {
        setVerification(resVerified.data.verification);
      }
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Dynamic Profile Completeness Calculation (derived from existing backend profile data)
  const completionStats = useMemo(() => {
    let score = 0;
    const checks: { label: string; done: boolean; weight: number; sectionId: string }[] = [];

    // Personal Info (20%)
    const hasPersonalInfo = Boolean(profile?.phone || profile?.department || profile?.college || profile?.location || profile?.dob || profile?.nationality || profile?.gender || profile?.disabilityStatus);
    checks.push({ label: 'Personal Info', done: hasPersonalInfo, weight: 20, sectionId: 'personal' });
    if (hasPersonalInfo) score += 20;

    // Education (20%)
    const hasEducation = Boolean((profile?.education && profile.education.length > 0) || (profile as any)?.tenthSchool || (profile as any)?.twelfthSchool || (profile as any)?.collegeName || (profile as any)?.cgpa);
    checks.push({ label: 'Education', done: hasEducation, weight: 20, sectionId: 'education' });
    if (hasEducation) score += 20;

    // Skills (15%)
    const hasSkills = Boolean(profile?.skills && profile.skills.length > 0);
    checks.push({ label: 'Skills', done: hasSkills, weight: 15, sectionId: 'skills' });
    if (hasSkills) score += 15;

    // Projects (15%)
    const hasProjects = Boolean(profile?.projects && profile.projects.length > 0);
    checks.push({ label: 'Projects', done: hasProjects, weight: 15, sectionId: 'projects' });
    if (hasProjects) score += 15;

    // Experience (15%)
    const hasExperience = Boolean(profile?.experiences && profile.experiences.length > 0);
    checks.push({ label: 'Experience', done: hasExperience, weight: 15, sectionId: 'experience' });
    if (hasExperience) score += 15;

    // Social Links (15%)
    const hasVerifiedLinks = Boolean(
      verifiedList.length > 0 ||
      profile?.githubUrl ||
      profile?.linkedinUrl ||
      (profile as any)?.codolioUrl ||
      (profile as any)?.codechefUrl ||
      (profile as any)?.leetcodeUrl ||
      profile?.portfolioUrl
    );
    checks.push({ label: 'Social Links', done: hasVerifiedLinks, weight: 15, sectionId: 'social' });
    if (hasVerifiedLinks) score += 15;

    return {
      score: Math.min(100, score),
      checks
    };
  }, [profile, verifiedList]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: User, count: null, isDone: Boolean(profile?.phone || profile?.department || profile?.college) },
    { id: 'education', label: 'Education', icon: GraduationCap, count: profile?.education?.length || null, isDone: Boolean((profile?.education && profile.education.length > 0) || (profile as any)?.tenthSchool || (profile as any)?.collegeName) },
    { id: 'skills', label: 'Skills', icon: Code, count: profile?.skills?.length || null, isDone: Boolean(profile?.skills && profile.skills.length > 0) },
    { id: 'projects', label: 'Projects', icon: Briefcase, count: profile?.projects?.length || null, isDone: Boolean(profile?.projects && profile.projects.length > 0) },
    { id: 'experience', label: 'Experience', icon: Building2, count: profile?.experiences?.length || null, isDone: Boolean(profile?.experiences && profile.experiences.length > 0) },
    { id: 'work-preferences', label: 'Work Preferences', icon: SlidersHorizontal, count: null, isDone: Boolean(profile?.preferredWorkMode) },
    { id: 'activities', label: 'Career Activities', icon: Trophy, count: null, isDone: true },
    { id: 'social', label: 'Social Links', icon: LinkIcon, count: verifiedList.length || [profile?.githubUrl, profile?.linkedinUrl, (profile as any)?.codolioUrl, (profile as any)?.codechefUrl, (profile as any)?.leetcodeUrl, profile?.portfolioUrl].filter(Boolean).length || null, isDone: Boolean(verifiedList.length > 0 || profile?.githubUrl || profile?.linkedinUrl || (profile as any)?.codolioUrl || (profile as any)?.codechefUrl || (profile as any)?.leetcodeUrl || profile?.portfolioUrl) },
  ];

  // Verification indicators are driven exclusively by the server-derived verification
  // summary. When the summary is unavailable they fall back to a real backend signal
  // (proven ownership records) instead of a fabricated client-side heuristic.
  // Profile existence alone is deliberately NOT treated as verification.
  const isProfileVerified = Boolean(
    verification?.ownershipVerified ??
      (verifiedList?.some((v: any) => v.ownershipStatus === 'OWNERSHIP_VERIFIED') ?? false)
  );

  const isPlacementVerified = Boolean(verification?.placementVerified);

  const isResumeSynced = Boolean(verification?.aiResumeSynced);

  // Genuine, backend-derived highlights. Each entry renders only when the underlying
  // profile record actually holds data — no placeholder or fabricated values.
  // Computed inline (not via useMemo) because this sits after the early `loading` return
  // and adding a hook here would violate the Rules of Hooks.
  const highlights: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }[] = [];
  {
    const skillNames = (profile?.skills ?? [])
      .map((ps: any) => ps?.skill?.name)
      .filter(Boolean) as string[];
    if (skillNames.length > 0) {
      const shown = skillNames.slice(0, 4).join(', ');
      highlights.push({
        label: 'Primary Skills',
        value: skillNames.length > 4 ? `${shown} +${skillNames.length - 4}` : shown,
        icon: Code,
      });
    }

    if (profile?.careerObjective?.trim()) {
      highlights.push({ label: 'Career Objective', value: profile.careerObjective.trim(), icon: TrendingUp });
    }

    if (profile?.preferredRole?.trim()) {
      highlights.push({ label: 'Preferred Role', value: profile.preferredRole.trim(), icon: Briefcase });
    }

    const location = profile?.location?.trim() || profile?.preferredLocation?.trim();
    if (location) {
      highlights.push({ label: 'Location', value: location, icon: MapPin });
    }

    if (profile?.collegeGraduationYear) {
      highlights.push({ label: 'Graduation Year', value: String(profile.collegeGraduationYear), icon: GraduationCap });
    }
  }

  return (
    <ProfileDirtyContext.Provider value={dirtyContextValue}>
    <div className="min-h-screen bg-slate-50/60 pb-12 pt-5 font-sans text-slate-800">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-5">
        
        {/* Top Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/student"
            id="back-to-dashboard-button"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-98"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5 text-slate-500 group-hover:text-slate-900" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="hover:text-slate-700 transition-colors">CareerAI</span>
            <span className="text-slate-300">/</span>
            <span className="rounded-lg bg-kit-50 px-2.5 py-1 font-bold text-kit-700 border border-kit-200/60">
              Student Profile
            </span>
          </div>
        </div>

        {/* Executive Hero Banner Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
          {/* Premium Burgundy/Crimson Cover — Deep gradient with restrained grain texture */}
          <div className="h-28 sm:h-36 w-full relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1a0208 0%, #4a0815 35%, #7f0b24 70%, #990024 100%)',
            }}
          >
            {/* Layered radial depth lights */}
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-rose-400/8 blur-3xl pointer-events-none" />
            <div className="absolute left-1/4 bottom-0 h-48 w-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-white/3 blur-2xl pointer-events-none" />

            {/* Subtle Architectural Grid — restrained intensity for a calmer header */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.035] stroke-white" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <defs>
                <pattern id="careerai-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" strokeWidth="0.75" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#careerai-grid)" />
            </svg>

            {/* Diagonal accent stripe */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.15) 20px, rgba(255,255,255,0.15) 21px)',
              }}
            />

            {/* Top Right Frosted Glass Status Badges */}
            <div className="absolute right-5 top-4 hidden sm:flex items-center gap-2 z-10">
              {isPlacementVerified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-sm px-3.5 py-1 text-[11px] font-semibold text-white/95 border border-white/20 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60" />
                  Placement Verified
                </span>
              )}
              {isResumeSynced && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-sm px-3.5 py-1 text-[11px] font-semibold text-white/95 border border-white/20 shadow-xs">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  AI Resume Synced
                </span>
              )}
            </div>

            {/* CareerAI brand watermark bottom-right */}
            <div className="absolute bottom-3 right-5 text-white/15 text-[10px] font-bold tracking-widest uppercase select-none hidden sm:block">
              CareerAI Platform
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-8 sm:pb-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              
              {/* Avatar + Identity Block */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                {/* Avatar — protrudes cleanly over the cover with premium border treatment */}
                <StudentProfilePhotoManager
                  currentPhotoUrl={profile?.profilePhotoUrl || (user as any)?.profile?.profilePhotoUrl}
                  studentName={user?.name}
                  fallbackInitial={user?.name?.charAt(0).toUpperCase() || 'B'}
                  onPhotoUpdated={(newUrl) => {
                    setProfile((prev) => (prev ? { ...prev, profilePhotoUrl: newUrl } : null));
                    if (refreshUser) refreshUser();
                  }}
                  className="-mt-12 sm:-mt-14 z-10 self-start"
                />

                {/* Name, Badges & Contact — carefully layered hierarchy */}
                <div className="space-y-2 pt-0 sm:pt-1">
                  {/* Primary Identity Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                      {user?.name || 'Student Name'}
                    </h1>
                    <span className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-[#990024] border border-rose-200/80 uppercase tracking-wider">
                      {user?.role ? user.role.replace(/_/g, ' ') : 'STUDENT'}
                    </span>
                    {isProfileVerified && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified Profile
                      </span>
                    )}
                  </div>

                  {/* Mobile-only status badges */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
                    {isPlacementVerified && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Placement Verified
                      </span>
                    )}
                    {isResumeSynced && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/80">
                        <Sparkles className="h-3 w-3 text-amber-600" /> AI Resume Synced
                      </span>
                    )}
                  </div>

                  {/* Contact Row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <button
                      onClick={handleCopyEmail}
                      className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-[#990024] bg-slate-100/80 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all border border-slate-200/70 group"
                      title="Click to copy email"
                    >
                      <Mail className="h-3 w-3 text-slate-400 group-hover:text-rose-400 transition-colors" />
                      <span className="break-all">{user?.email}</span>
                      {copiedEmail
                        ? <Check className="h-3 w-3 text-emerald-600 ml-0.5" />
                        : <Copy className="h-2.5 w-2.5 text-slate-400 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </button>

                    {profile?.phone && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{profile.phone}</span>
                      </span>
                    )}
                  </div>

                  {/* Academic Identity Row */}
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-0.5 font-medium">
                    {profile?.department && (
                      <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                        <GraduationCap className="h-3.5 w-3.5 text-[#990024] shrink-0" />
                        {profile.department}
                      </span>
                    )}
                    {profile?.college && (
                      <>
                        <span className="text-slate-200 hidden sm:inline">•</span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="max-w-sm break-words">{profile.college}</span>
                        </span>
                      </>
                    )}
                    {(profile as any)?.registerNo && (
                      <>
                        <span className="text-slate-200 hidden sm:inline">•</span>
                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200/70">
                          Reg: {(profile as any).registerNo}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Readiness Card — real completeness score + direct navigation */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shrink-0 lg:w-[276px] w-full shadow-xs space-y-3.5 mt-0 lg:mt-1">
                {/* Score + Status Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl font-black text-sm border shadow-xs shrink-0"
                      style={{
                        background: completionStats.score >= 80
                          ? 'linear-gradient(135deg, #990024 0%, #c71f47 100%)'
                          : 'linear-gradient(135deg, #7f0b24 0%, #990024 100%)',
                        color: 'white',
                        borderColor: 'rgba(153, 0, 36, 0.25)',
                      }}
                      aria-label={`Profile completeness ${completionStats.score} percent`}
                    >
                      {completionStats.score}%
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">Profile Readiness</h4>
                      <p className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${
                        completionStats.score >= 80 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${completionStats.score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {completionStats.score >= 80 ? 'Ready for Placements' : 'Profile Incomplete'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{completionStats.score}/100</span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={completionStats.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Profile completeness"
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${completionStats.score}%`,
                        background: 'linear-gradient(90deg, #990024 0%, #c71f47 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* Section Completion — completed (green) vs incomplete (clickable to fix) */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {completionStats.checks.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => handleSectionChange(c.sectionId)}
                      title={c.done ? `${c.label} complete — open section` : `Go to ${c.label} to complete it`}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-colors ${
                        c.done
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100'
                      }`}
                    >
                      {c.done
                        ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                        : <Plus className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                      }
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Footer Action Row */}
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">
                    {completionStats.checks.filter((c) => c.done).length}/{completionStats.checks.length} sections complete
                  </span>
                  <Link
                    href="/resume"
                    className="font-bold text-[#990024] hover:text-[#80001e] flex items-center gap-0.5 hover:underline transition-colors"
                  >
                    Resume Studio <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-[10px] leading-snug text-slate-400">
                  Profile completeness tracks required profile fields only — it is separate from your Resume Strength score.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Profile Highlights — compact strip, rendered only when genuine data exists */}
        {highlights.length > 0 && (
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {highlights.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-kit-100 bg-kit-50 text-kit-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="max-w-[200px] truncate text-xs font-semibold text-slate-800 sm:max-w-[280px]" title={value}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Layout with Responsive Navigation */}
        <div className="flex flex-col lg:flex-row gap-5">
          
          {/* Sidebar Navigation - Desktop/Laptop */}
          <div className="hidden lg:block w-56 shrink-0 space-y-3">
            <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs space-y-1">
              <div className="px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Profile Sections</span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{sections.length} Tabs</span>
              </div>
              
              {sections.map(({ id, label, icon: Icon, count, isDone }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    id={`profile-nav-${id}`}
                    onClick={() => handleSectionChange(id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-kit-50 text-kit-900 font-bold ring-1 ring-kit-200/70'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {/* Left accent indicator for the active section */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-kit-600" aria-hidden="true" />
                    )}
                    <div className="flex items-center gap-3 pl-1.5">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        isActive ? 'bg-kit-100 text-kit-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-800'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span>{label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {count !== null && count > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive ? 'bg-kit-100 text-kit-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {count}
                        </span>
                      )}
                      {isDone && !isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Completed" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Placement Tip Card */}
            <div className="rounded-2xl border border-kit-100 bg-gradient-to-br from-kit-50/70 to-white p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-kit-900">
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Placement AI Tip</span>
              </div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                Keeping your GitHub, LinkedIn, and projects up-to-date increases placement shortlisting by up to <strong className="text-kit-800">40%</strong>.
              </p>
            </div>
          </div>

          {/* Horizontal Scrollable Tabs - Tablet / Mobile */}
          <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex gap-2 min-w-max">
              {sections.map(({ id, label, icon: Icon, count }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSectionChange(id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? 'bg-kit-600 text-white shadow-md shadow-kit-600/20'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                    {count !== null && count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Section Content Card */}
          <div className="flex-1 min-w-0">
            {activeSection === 'personal' && (
              <PersonalSection
                profile={profile}
                onUpdate={fetchProfile}
                user={user}
                onRefreshUser={refreshUser}
                onPhotoUpdated={(newUrl) => {
                  setProfile((prev) => (prev ? { ...prev, profilePhotoUrl: newUrl } : null));
                }}
              />
            )}
            {activeSection === 'education' && (
              <EducationSection education={profile?.education ?? []} profile={profile} onUpdate={fetchProfile} />
            )}
            {activeSection === 'skills' && (
              <SkillsSection skills={profile?.skills?.map((ps) => ps.skill) ?? []} onUpdate={fetchProfile} />
            )}
            {activeSection === 'projects' && (
              <ProjectsSection projects={profile?.projects ?? []} onUpdate={fetchProfile} />
            )}
            {activeSection === 'experience' && (
              <ExperienceSection experiences={profile?.experiences ?? []} onUpdate={fetchProfile} />
            )}
            {activeSection === 'work-preferences' && (
              <WorkPreferencesSection profile={profile} onUpdate={fetchProfile} />
            )}
            {activeSection === 'activities' && (
              <CareerActivitiesSection />
            )}
            {activeSection === 'social' && (
              <SocialSection profile={profile} onUpdate={fetchProfile} />
            )}
          </div>
        </div>

      </div>
    </div>
    </ProfileDirtyContext.Provider>
  );
}

// ──────────────────────────────────────────────────
// Personal Info Section
// ──────────────────────────────────────────────────
function splitFullName(fullName?: string | null): { firstName: string; lastName: string } {
  if (!fullName || !fullName.trim()) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

function PersonalSection({
  profile,
  onUpdate,
  user,
  onRefreshUser,
  onPhotoUpdated,
}: {
  profile: Profile | null;
  onUpdate: () => void;
  user: { name?: string; email?: string } | null;
  onRefreshUser?: () => Promise<void>;
  onPhotoUpdated?: (newUrl: string | null) => void;
}) {
  const initialNames = splitFullName(user?.name);
  const [form, setForm] = useState({
    firstName: initialNames.firstName,
    lastName: initialNames.lastName,
    phone: profile?.phone ?? '',
    department: profile?.department ?? '',
    year: profile?.year?.toString() ?? '',
    section: profile?.section ?? '',
    college: profile?.college ?? '',
    location: profile?.location ?? '',
    careerObjective: profile?.careerObjective ?? '',
    dob: profile?.dob ?? '',
    gender: profile?.gender ?? '',
    disabilityStatus: profile?.disabilityStatus ?? '',
    nationality: profile?.nationality ?? '',
    country: profile?.country ?? '',
    state: profile?.state ?? '',
    preferredLocation: profile?.preferredLocation ?? '',
    pinCode: profile?.pinCode ?? '',
    preferredRole: profile?.preferredRole ?? '',
    expectedSalary: profile?.expectedSalary ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const nameParts = splitFullName(user?.name);
    if (profile) {
      setForm({
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        phone: profile.phone ?? '',
        department: profile.department ?? '',
        year: profile.year?.toString() ?? '',
        section: profile.section ?? '',
        college: profile.college ?? '',
        location: profile.location ?? '',
        careerObjective: profile.careerObjective ?? '',
        dob: profile.dob ?? '',
        gender: profile.gender ?? '',
        disabilityStatus: profile.disabilityStatus ?? '',
        nationality: profile.nationality ?? '',
        country: profile.country ?? '',
        state: profile.state ?? '',
        preferredLocation: profile.preferredLocation ?? '',
        pinCode: profile.pinCode ?? '',
        preferredRole: profile.preferredRole ?? '',
        expectedSalary: profile.expectedSalary ?? '',
      });
    } else if (user?.name) {
      setForm((prev) => ({
        ...prev,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
      }));
    }
  }, [profile, user]);

  // Baseline of persisted values — powers unsaved-change detection and "Cancel".
  const baseline = useMemo(() => {
    const nameParts = splitFullName(user?.name);
    return {
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      phone: profile?.phone ?? '',
      department: profile?.department ?? '',
      year: profile?.year?.toString() ?? '',
      section: profile?.section ?? '',
      college: profile?.college ?? '',
      location: profile?.location ?? '',
      careerObjective: profile?.careerObjective ?? '',
      dob: profile?.dob ?? '',
      gender: profile?.gender ?? '',
      disabilityStatus: profile?.disabilityStatus ?? '',
      nationality: profile?.nationality ?? '',
      country: profile?.country ?? '',
      state: profile?.state ?? '',
      preferredLocation: profile?.preferredLocation ?? '',
      pinCode: profile?.pinCode ?? '',
      preferredRole: profile?.preferredRole ?? '',
      expectedSalary: profile?.expectedSalary ?? '',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user]);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);
  useSectionDirty(isDirty);

  const handleReset = () => {
    setForm(baseline);
    setErrorMsg('');
    setSavedSuccess(false);
  };

  // Inline validation — returns the first blocking error, or empty string when valid.
  const validate = (): string => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (form.phone.trim() && !/^[+\d][\d\s\-()]{6,19}$/.test(form.phone.trim())) {
      return 'Please enter a valid phone number (7–20 digits, may start with +).';
    }
    if (form.year && (Number(form.year) < 1 || Number(form.year) > 6)) {
      return 'Year of study must be between 1 and 6.';
    }
    return '';
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      setSavedSuccess(false);
      return;
    }
    setSaving(true);
    setSavedSuccess(false);
    setErrorMsg('');
    try {
      const combinedName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ');
      const { firstName, lastName, ...restForm } = form;
      const payload = {
        ...restForm,
        name: combinedName,
        year: form.year ? parseInt(form.year, 10) : null,
      };
      await api.put('/profiles/me', payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
      if (onRefreshUser) {
        await onRefreshUser().catch(() => {});
      }
      onUpdate();
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      setErrorMsg(error?.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const roleSuggestions = [
    'Software Engineer',
    'AI Engineer',
    'Data Scientist',
    'Full Stack Developer',
    'Cybersecurity Engineer',
    'Machine Learning Engineer',
    'Cloud Solutions Architect',
    'DevOps Engineer',
    'Backend Developer',
    'Frontend Developer',
    'Data Analyst',
    'Mobile Application Developer',
  ];

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      {/* Section Header */}
      <SectionHeading
        icon={User}
        title="Personal Information"
        description="Manage your identity, demographic background, location, and career aspirations."
        right={
          savedSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs self-start sm:self-auto animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
            </span>
          ) : undefined
        }
      />

      {errorMsg && <FormFeedback status="error" message={errorMsg} />}

      {/* Profile Photo Management */}
      <PersonalInfoPhotoSection
        currentPhotoUrl={profile?.profilePhotoUrl || (user as any)?.profile?.profilePhotoUrl}
        studentName={user?.name}
        onPhotoUpdated={(newUrl) => {
          if (onPhotoUpdated) onPhotoUpdated(newUrl);
          if (onUpdate) onUpdate();
          if (onRefreshUser) onRefreshUser();
        }}
      />

      {/* Divider */}
      <div className="border-t border-slate-200/80 my-2" />

      {/* Group 1: Contact & Core Identity */}
      <div className="space-y-4">
        <div id="contact-identity-section-header" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Mail className="h-3.5 w-3.5 text-kit-600" />
          <span>1. Contact & Identity</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">First Name<RequiredMark /></label>
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="e.g. Bala"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Last Name</label>
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="e.g. Sujith"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address (Registered)</label>
            <div className="relative">
              <Input
                value={user?.email ?? ''}
                disabled
                className="h-10.5 text-xs sm:text-sm bg-slate-50/80 text-slate-500 border-slate-200 cursor-not-allowed pr-9 rounded-xl font-medium"
              />
              <Lock className="h-3.5 w-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">Verified primary email linked to placement notices.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
        </div>
      </div>

      {/* Group 2: Demographics & Personal Details */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-kit-600" />
          <span>2. Demographics & Identity</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth</label>
            <Input
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label htmlFor="profile-gender" className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
            <select
              id="profile-gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="block w-full h-10.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 shadow-2xs transition focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600/20 hover:border-slate-300"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label htmlFor="profile-disability-status" className="block text-xs font-bold text-slate-700 mb-1.5">Disability Status (PwD)</label>
            <select
              id="profile-disability-status"
              value={form.disabilityStatus}
              onChange={(e) => setForm({ ...form, disabilityStatus: e.target.value })}
              className="block w-full h-10.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 shadow-2xs transition focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600/20 hover:border-slate-300"
            >
              <option value="">Select Disability Status</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Nationality</label>
            <Input
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              placeholder="e.g. Indian"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
        </div>
      </div>

      {/* Group 3: Location & Address */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-kit-600" />
          <span>3. Geographical Location & Preferences</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Location / City</label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Coimbatore"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Preferred Work Location</label>
            <Input
              value={form.preferredLocation}
              onChange={(e) => setForm({ ...form, preferredLocation: e.target.value })}
              placeholder="e.g. Bengaluru, Chennai, Remote"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">State / Province</label>
            <Input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="e.g. Tamil Nadu"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Country</label>
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="e.g. India"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">PIN / Postal Code</label>
            <Input
              value={form.pinCode}
              onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
              placeholder="e.g. 641001"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
        </div>
      </div>

      {/* Group 4: Academic Affiliation */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <GraduationCap className="h-3.5 w-3.5 text-kit-600" />
          <span>4. Campus & Institution Details</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">College / Institution</label>
            <Input
              value={form.college}
              onChange={(e) => setForm({ ...form, college: e.target.value })}
              placeholder="KIT - Kalaignarkarunanidhi Institute of Technology"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Department / Stream</label>
            <Input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Artificial Intelligence & Data Science"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Year of Study</label>
            <Input
              type="number"
              min={1}
              max={6}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="3"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Section</label>
            <Input
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              placeholder="A"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
        </div>
      </div>

      {/* Group 5: Career Targets & Expectations */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-kit-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Career Goals & Compensation Expectation</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Desired Future Role</label>
            <div className="relative">
              <input
                list="future-role-suggestions"
                value={form.preferredRole}
                onChange={(e) => setForm({ ...form, preferredRole: e.target.value })}
                placeholder="e.g. AI Engineer, Full Stack Developer"
                className="flex h-10.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600/20 shadow-2xs"
              />
              <datalist id="future-role-suggestions">
                {roleSuggestions.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Salary / Stipend</label>
            <Input
              value={form.expectedSalary}
              onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })}
              placeholder="e.g. ₹8,00,000 / annum or 8-12 LPA"
              className="h-10.5 text-xs sm:text-sm bg-white rounded-xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20"
            />
          </div>
        </div>
      </div>

      {/* Group 6: Career Objective & Summary */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-700">Career Objective & Bio Summary</label>
        <Textarea
          value={form.careerObjective}
          onChange={(e) => setForm({ ...form, careerObjective: e.target.value })}
          placeholder="Write a concise overview of your technical focus, academic accomplishments, and placement aspirations..."
          rows={4}
          className="w-full text-xs sm:text-sm bg-white rounded-2xl border-slate-200 focus:border-kit-600 focus:ring-kit-600/20 p-3.5 leading-relaxed"
        />
      </div>

      {/* Action Footer */}
      <div className="flex flex-col-reverse items-stretch gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11px] text-slate-400">
          {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
        </span>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty || saving}
            className="font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={saving}
            onClick={handleSave}
            disabled={!isDirty && !saving}
            className="font-bold px-7 py-2.5 rounded-xl shadow-sm text-xs sm:text-sm"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Education Section
// ──────────────────────────────────────────────────
function EducationSection({ education, profile, onUpdate }: { education: Education[]; profile: Profile | null; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '', minor: '' });
  const [submitting, setSubmitting] = useState(false);

  // School & College Academic Details Form State
  const [academicForm, setAcademicForm] = useState({
    tenthSchool: profile?.tenthSchool ?? '',
    tenthPercentage: profile?.tenthPercentage ?? '',
    twelfthSchool: profile?.twelfthSchool ?? '',
    twelfthPercentage: profile?.twelfthPercentage ?? '',
    collegeName: profile?.collegeName ?? profile?.college ?? '',
    cgpa: profile?.cgpa ?? '',
    collegeJoiningYear: profile?.collegeJoiningYear?.toString() ?? '',
    collegeGraduationYear: profile?.collegeGraduationYear?.toString() ?? '',
    major: profile?.major ?? profile?.department ?? '',
    minor: profile?.minor ?? '',
  });
  const [savingAcademics, setSavingAcademics] = useState(false);
  const [academicSuccess, setAcademicSuccess] = useState(false);
  const [academicError, setAcademicError] = useState('');
  const [formError, setFormError] = useState('');
  const [entryErrors, setEntryErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setAcademicForm({
        tenthSchool: profile.tenthSchool ?? '',
        tenthPercentage: profile.tenthPercentage ?? '',
        twelfthSchool: profile.twelfthSchool ?? '',
        twelfthPercentage: profile.twelfthPercentage ?? '',
        collegeName: profile.collegeName ?? profile.college ?? '',
        cgpa: profile.cgpa ?? '',
        collegeJoiningYear: profile.collegeJoiningYear?.toString() ?? '',
        collegeGraduationYear: profile.collegeGraduationYear?.toString() ?? '',
        major: profile.major ?? profile.department ?? '',
        minor: profile.minor ?? '',
      });
    }
  }, [profile]);

  const academicBaseline = useMemo(
    () => ({
      tenthSchool: profile?.tenthSchool ?? '',
      tenthPercentage: profile?.tenthPercentage ?? '',
      twelfthSchool: profile?.twelfthSchool ?? '',
      twelfthPercentage: profile?.twelfthPercentage ?? '',
      collegeName: profile?.collegeName ?? profile?.college ?? '',
      cgpa: profile?.cgpa ?? '',
      collegeJoiningYear: profile?.collegeJoiningYear?.toString() ?? '',
      collegeGraduationYear: profile?.collegeGraduationYear?.toString() ?? '',
      major: profile?.major ?? profile?.department ?? '',
      minor: profile?.minor ?? '',
    }),
    [profile]
  );

  const academicsDirty = useMemo(
    () => JSON.stringify(academicForm) !== JSON.stringify(academicBaseline),
    [academicForm, academicBaseline]
  );
  useSectionDirty(academicsDirty);

  const handleResetAcademics = () => {
    setAcademicForm(academicBaseline);
    setAcademicError('');
    setAcademicSuccess(false);
  };

  const handleSaveAcademics = async () => {
    // Inline validation: only block on invalid numeric input (fields are otherwise optional).
    const yearPattern = /^\d{4}$/;
    if (academicForm.collegeJoiningYear && !yearPattern.test(academicForm.collegeJoiningYear)) {
      setAcademicError('College joining year must be a 4-digit year (e.g. 2022).');
      return;
    }
    if (academicForm.collegeGraduationYear && !yearPattern.test(academicForm.collegeGraduationYear)) {
      setAcademicError('Graduation year must be a 4-digit year (e.g. 2026).');
      return;
    }
    setSavingAcademics(true);
    setAcademicSuccess(false);
    setAcademicError('');
    try {
      await api.put('/profiles/me', {
        ...academicForm,
        collegeJoiningYear: academicForm.collegeJoiningYear ? parseInt(academicForm.collegeJoiningYear) : undefined,
        collegeGraduationYear: academicForm.collegeGraduationYear ? parseInt(academicForm.collegeGraduationYear) : undefined,
      });
      setAcademicSuccess(true);
      setTimeout(() => setAcademicSuccess(false), 3000);
      onUpdate();
    } catch (err: any) {
      setAcademicError(err?.response?.data?.message || 'Failed to save academic details.');
    } finally {
      setSavingAcademics(false);
    }
  };

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '', minor: '' });
    setEntryErrors({});
    setFormError('');
  };

  // Inline validation for the additional-degree entry form.
  const validateEntry = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!form.institution.trim()) errors.institution = 'Institution is required.';
    if (!form.degree.trim()) errors.degree = 'Degree is required.';
    if (!form.startYear) errors.startYear = 'Start year is required.';
    else if (!/^\d{4}$/.test(form.startYear)) errors.startYear = 'Enter a 4-digit year.';
    if (form.endYear && !/^\d{4}$/.test(form.endYear)) errors.endYear = 'Enter a 4-digit year.';
    else if (form.endYear && form.startYear && Number(form.endYear) < Number(form.startYear)) {
      errors.endYear = 'End year cannot be before start year.';
    }
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateEntry();
    setEntryErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please correct the highlighted fields before saving.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = { ...form, startYear: parseInt(form.startYear), endYear: form.endYear ? parseInt(form.endYear) : undefined };
      if (editId) {
        await api.put(`/profiles/education/${editId}`, payload);
      } else {
        await api.post('/profiles/education', payload);
      }
      onUpdate();
      reset();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save education record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education record?')) return;
    try {
      await api.delete(`/profiles/education/${id}`);
      onUpdate();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to delete education record.');
    }
  };

  return (
    <div className="space-y-5">
      {/* School Education Card (10th & 12th) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <SectionHeading
          icon={BookOpen}
          title="School Education"
          description="Enter your 10th and 12th standard schooling and percentage."
          right={
            academicSuccess ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs self-start sm:self-auto animate-in fade-in">
                <CheckCircle2 className="h-4 w-4" /> Saved successfully
              </span>
            ) : undefined
          }
        />

        <FormFeedback status="error" message={academicError} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 10th Standard */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-kit-100 text-xs font-bold text-kit-800">10</span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">10th Standard (Secondary School)</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">School Name</label>
                <Input
                  value={academicForm.tenthSchool}
                  onChange={(e) => setAcademicForm({ ...academicForm, tenthSchool: e.target.value })}
                  placeholder="e.g. St. Joseph Higher Secondary School"
                  className="h-10 text-xs sm:text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">10th Percentage / Score</label>
                <Input
                  value={academicForm.tenthPercentage}
                  onChange={(e) => setAcademicForm({ ...academicForm, tenthPercentage: e.target.value })}
                  placeholder="e.g. 92.4% or 9.2 CGPA"
                  className="h-10 text-xs sm:text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* 12th Standard */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-kit-100 text-xs font-bold text-kit-800">12</span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">12th Standard (Higher Secondary)</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">School Name</label>
                <Input
                  value={academicForm.twelfthSchool}
                  onChange={(e) => setAcademicForm({ ...academicForm, twelfthSchool: e.target.value })}
                  placeholder="e.g. Kendriya Vidyalaya / Model Matriculation Higher Secondary"
                  className="h-10 text-xs sm:text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">12th Percentage / Score</label>
                <Input
                  value={academicForm.twelfthPercentage}
                  onChange={(e) => setAcademicForm({ ...academicForm, twelfthPercentage: e.target.value })}
                  placeholder="e.g. 94.6%"
                  className="h-10 text-xs sm:text-sm bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-slate-400">
            {academicsDirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </span>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleResetAcademics}
              disabled={!academicsDirty || savingAcademics}
              className="font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={savingAcademics}
              onClick={handleSaveAcademics}
              disabled={!academicsDirty && !savingAcademics}
              className="font-bold px-6 py-2.5 rounded-xl shadow-xs text-xs sm:text-sm"
            >
              <Save className="h-4 w-4" />
              Save School Details
            </Button>
          </div>
        </div>
      </div>

      {/* College Education Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <SectionHeading
          icon={GraduationCap}
          title="College Education"
          description="Provide your undergraduate / college degree, CGPA, graduation timeline, and specializations."
        />

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">College Name / Institution</label>
            <Input
              value={academicForm.collegeName}
              onChange={(e) => setAcademicForm({ ...academicForm, collegeName: e.target.value })}
              placeholder="e.g. KIT - Kalaignarkarunanidhi Institute of Technology"
              className="h-10 text-xs sm:text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">CGPA / Academic Grade</label>
            <Input
              value={academicForm.cgpa}
              onChange={(e) => setAcademicForm({ ...academicForm, cgpa: e.target.value })}
              placeholder="e.g. 8.65 CGPA"
              className="h-10 text-xs sm:text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">College Joining Year</label>
            <Input
              type="number"
              value={academicForm.collegeJoiningYear}
              onChange={(e) => setAcademicForm({ ...academicForm, collegeJoiningYear: e.target.value })}
              placeholder="2022"
              className="h-10 text-xs sm:text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expected Graduation Year</label>
            <Input
              type="number"
              value={academicForm.collegeGraduationYear}
              onChange={(e) => setAcademicForm({ ...academicForm, collegeGraduationYear: e.target.value })}
              placeholder="2026"
              className="h-10 text-xs sm:text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Major / Specialization</label>
            <Input
              value={academicForm.major}
              onChange={(e) => setAcademicForm({ ...academicForm, major: e.target.value })}
              placeholder="e.g. Artificial Intelligence & Data Science"
              className="h-10 text-xs sm:text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Minor / Secondary Specialization</label>
            <Input
              value={academicForm.minor}
              onChange={(e) => setAcademicForm({ ...academicForm, minor: e.target.value })}
              placeholder="e.g. Cybersecurity / Robotics (Optional)"
              className="h-10 text-xs sm:text-sm bg-white"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-slate-400">
            {academicsDirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </span>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleResetAcademics}
              disabled={!academicsDirty || savingAcademics}
              className="font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={savingAcademics}
              onClick={handleSaveAcademics}
              disabled={!academicsDirty && !savingAcademics}
              className="font-bold px-6 py-2.5 rounded-xl shadow-xs text-xs sm:text-sm"
            >
              <Save className="h-4 w-4" />
              Save College Details
            </Button>
          </div>
        </div>
      </div>

      {/* Additional Education Entries & History */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <SectionHeading
          icon={Award}
          title="Additional Degrees & Certifications"
          description="Manage any additional degree programs, diplomas, or academic qualifications."
          right={
            <Button
              variant="primary"
              size="sm"
              onClick={() => { reset(); setShowForm(true); }}
              className="font-bold rounded-xl shadow-2xs self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" /> Add Degree
            </Button>
          }
        />

        {formError && <FormFeedback status="error" message={formError} />}

        <div className="space-y-3.5">
          {education.map((edu) => (
            <div key={edu.id} className="rounded-xl border border-slate-200/80 p-4 sm:p-5 hover:border-kit-300 transition-all bg-slate-50/40">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">{edu.institution}</h3>
                    {edu.grade && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        {edu.grade}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-kit-800">
                    {edu.degree}{edu.fieldOfStudy ? ` • ${edu.fieldOfStudy}` : ''}
                    {edu.minor ? ` (Minor: ${edu.minor})` : ''}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{edu.startYear} — {edu.endYear ?? 'Present'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditId(edu.id);
                      setForm({
                        institution: edu.institution,
                        degree: edu.degree,
                        fieldOfStudy: edu.fieldOfStudy ?? '',
                        startYear: String(edu.startYear),
                        endYear: edu.endYear ? String(edu.endYear) : '',
                        grade: edu.grade ?? '',
                        minor: edu.minor ?? '',
                      });
                      setShowForm(true);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-kit-50 hover:text-kit-700 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(edu.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {education.length === 0 && !showForm && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-1.5">
              <GraduationCap className="h-7 w-7 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700">No additional degree records</p>
              <p className="text-[11px] text-slate-500">Click &ldquo;Add Degree&rdquo; if you have dual degrees, diplomas, or postgraduate qualifications.</p>
            </div>
          )}
        </div>

        {showForm && (
          <div className="rounded-xl border border-kit-200 bg-kit-50/20 p-5 space-y-4">
            <h4 className="text-sm font-bold text-kit-900">{editId ? 'Edit Degree' : 'Add New Degree'}</h4>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution / University<RequiredMark /></label>
                <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. KIT - Kalaignarkarunanidhi Institute of Technology" error={entryErrors.institution} className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Degree<RequiredMark /></label>
                <Input value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} placeholder="e.g. B.Tech / B.E." error={entryErrors.degree} className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Field of Study / Major<FieldHint>Optional</FieldHint></label>
                <Input value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })} placeholder="e.g. Computer Science / AI & DS" className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minor / Secondary Specialization<FieldHint>Optional</FieldHint></label>
                <Input value={form.minor} onChange={(e) => setForm({ ...form, minor: e.target.value })} placeholder="e.g. Cybersecurity (Optional)" className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grade / CGPA<FieldHint>Optional</FieldHint></label>
                <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. 8.5 CGPA or 85%" className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Year<RequiredMark /></label>
                <Input type="number" value={form.startYear} onChange={(e) => setForm({ ...form, startYear: e.target.value })} placeholder="2022" error={entryErrors.startYear} className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Year (or Expected)<FieldHint>Optional</FieldHint></label>
                <Input type="number" value={form.endYear} onChange={(e) => setForm({ ...form, endYear: e.target.value })} placeholder="2026" error={entryErrors.endYear} className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-kit-100">
              <Button variant="outline" size="sm" onClick={reset} className="rounded-lg">Cancel</Button>
              <Button variant="primary" size="sm" isLoading={submitting} onClick={handleSubmit} className="font-bold rounded-lg shadow-2xs">
                <Save className="h-3.5 w-3.5" /> Save Degree
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Skills Section
// ──────────────────────────────────────────────────
function SkillsSection({ skills, onUpdate }: { skills: Skill[]; onUpdate: () => void }) {
  const [newSkill, setNewSkill] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [inputError, setInputError] = useState('');

  const handleAdd = async () => {
    const value = newSkill.trim();
    if (!value) {
      setInputError('Please enter a skill name.');
      return;
    }
    if (skills.some((s) => s.name.toLowerCase() === value.toLowerCase())) {
      setInputError('This skill has already been added.');
      return;
    }
    setInputError('');
    setError('');
    setAdding(true);
    try {
      await api.post('/profiles/skills', { name: value });
      setNewSkill('');
      onUpdate();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add skill.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (skillId: string) => {
    setError('');
    try {
      await api.delete(`/profiles/skills/${skillId}`);
      onUpdate();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete skill.');
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <SectionHeading
        icon={Code}
        title="Technical & Soft Skills"
        description="Skills added here are used by AI algorithms to match relevant job and internship opportunities."
      />

      {error && <FormFeedback status="error" message={error} />}

      <div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill.id}
              className="group flex items-center gap-2 rounded-xl border border-kit-200/80 bg-kit-50/60 px-3 py-1.5 text-xs font-bold text-kit-800 transition-all hover:bg-kit-100"
            >
              <span>{skill.name}</span>
              <button
                onClick={() => handleRemove(skill.id)}
                className="text-kit-400 group-hover:text-red-600 transition-colors p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-kit-500"
                title={`Remove ${skill.name}`}
                aria-label={`Remove ${skill.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {skills.length === 0 && (
            <p className="text-xs text-slate-500 italic py-2">No skills added yet. Add your core programming languages, tools, and libraries below.</p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-4 sm:flex-row">
          <Input
            placeholder="e.g. Python, React, Next.js, Machine Learning"
            value={newSkill}
            onChange={(e) => { setNewSkill(e.target.value); if (inputError) setInputError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            error={inputError}
            aria-label="Skill name"
            className="h-10 text-xs sm:text-sm bg-white"
          />
          <Button variant="primary" isLoading={adding} onClick={handleAdd} className="font-bold shrink-0 rounded-xl shadow-2xs">
            <Plus className="h-4 w-4" /> Add Skill
          </Button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Projects Section
// ──────────────────────────────────────────────────
function ProjectsSection({ projects, onUpdate }: { projects: Project[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', technologies: '', githubUrl: '', liveUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ title: '', description: '', technologies: '', githubUrl: '', liveUrl: '' });
    setErrors({});
    setFormError('');
  };

  const isValidUrl = (value: string) => {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'Project title is required.';
    if (form.githubUrl && !isValidUrl(form.githubUrl)) next.githubUrl = 'Enter a valid URL starting with http:// or https://';
    if (form.liveUrl && !isValidUrl(form.liveUrl)) next.liveUrl = 'Enter a valid URL starting with http:// or https://';
    return next;
  };

  const handleSubmit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError('Please correct the highlighted fields before saving.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        technologies: form.technologies ? form.technologies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        githubUrl: form.githubUrl,
        liveUrl: form.liveUrl
      };
      if (editId) await api.put(`/profiles/projects/${editId}`, payload);
      else await api.post('/profiles/projects', payload);
      onUpdate();
      reset();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    setFormError('');
    try {
      await api.delete(`/profiles/projects/${id}`);
      onUpdate();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to delete project.');
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <SectionHeading
        icon={Briefcase}
        title="Key Projects"
        description="Showcase your software applications, machine learning models, and engineering projects."
        right={
          <Button variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }} className="font-bold rounded-xl shadow-2xs self-start sm:self-auto">
            <Plus className="h-3.5 w-3.5" /> Add Project
          </Button>
        }
      />

      {formError && <FormFeedback status="error" message={formError} />}

      <div className="space-y-3.5">
        {projects.map((proj) => (
          <div key={proj.id} className="rounded-xl border border-slate-200/80 p-4 sm:p-5 hover:border-kit-300 transition-all bg-slate-50/40">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">{proj.title}</h3>
                {proj.description && <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{proj.description}</p>}
                
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.technologies.map((t, idx) => (
                      <span key={idx} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  {proj.githubUrl && (
                    <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-kit-700 hover:underline">
                      <GithubIcon className="h-3.5 w-3.5" /> Code Repository
                    </a>
                  )}
                  {proj.liveUrl && (
                    <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> Live Demo
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditId(proj.id);
                    setForm({
                      title: proj.title,
                      description: proj.description ?? '',
                      technologies: (proj.technologies || []).join(', '),
                      githubUrl: proj.githubUrl ?? '',
                      liveUrl: proj.liveUrl ?? ''
                    });
                    setShowForm(true);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-kit-50 hover:text-kit-700 transition-colors focus:outline-none focus:ring-2 focus:ring-kit-500"
                  title="Edit project"
                  aria-label={`Edit ${proj.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(proj.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Delete project"
                  aria-label={`Delete ${proj.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-2">
            <Briefcase className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No projects added yet</p>
            <p className="text-xs text-slate-500">Showcase your portfolio by clicking &ldquo;Add Project&rdquo; above.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-kit-200 bg-kit-50/20 p-5 space-y-4">
          <h4 className="text-sm font-bold text-kit-900">{editId ? 'Edit Project' : 'Add New Project'}</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title<RequiredMark /></label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI Career Management Platform" error={errors.title} className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description<FieldHint>Optional</FieldHint></label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain problem solved, architecture, and impact..." rows={3} className="text-xs sm:text-sm bg-white rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Technologies (comma separated)<FieldHint>Optional</FieldHint></label>
              <Input value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} placeholder="React, Node.js, PostgreSQL, TailwindCSS" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GitHub / Source Code URL<FieldHint>Optional</FieldHint></label>
                <Input value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/..." error={errors.githubUrl} className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Live Demo URL<FieldHint>Optional</FieldHint></label>
                <Input value={form.liveUrl} onChange={(e) => setForm({ ...form, liveUrl: e.target.value })} placeholder="https://myproject.app" error={errors.liveUrl} className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-kit-100">
            <Button variant="outline" size="sm" onClick={reset} className="rounded-lg">Cancel</Button>
            <Button variant="primary" size="sm" isLoading={submitting} onClick={handleSubmit} className="font-bold rounded-lg shadow-2xs">
              <Save className="h-3.5 w-3.5" /> Save Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Experience Section
// ──────────────────────────────────────────────────
function ExperienceSection({ experiences, onUpdate }: { experiences: Experience[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ company: '', role: '', duration: '', description: '', startDate: '', endDate: '', currentlyWorking: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ company: '', role: '', duration: '', description: '', startDate: '', endDate: '', currentlyWorking: false });
    setErrors({});
    setFormError('');
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.company.trim()) next.company = 'Company / organization is required.';
    if (!form.role.trim()) next.role = 'Role / designation is required.';
    if (!form.startDate) next.startDate = 'Start date is required.';
    if (!form.currentlyWorking && form.endDate && form.startDate && form.endDate < form.startDate) {
      next.endDate = 'End date cannot be before start date.';
    }
    return next;
  };

  const handleSubmit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError('Please correct the highlighted fields before saving.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = { ...form, endDate: form.currentlyWorking ? undefined : form.endDate || undefined };
      if (editId) await api.put(`/profiles/experience/${editId}`, payload);
      else await api.post('/profiles/experience', payload);
      onUpdate();
      reset();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save experience.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this experience record?')) return;
    setFormError('');
    try {
      await api.delete(`/profiles/experience/${id}`);
      onUpdate();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to delete experience record.');
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <SectionHeading
        icon={Building2}
        title="Work Experience & Internships"
        description="List your internship roles, part-time positions, or professional training."
        right={
          <Button variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }} className="font-bold rounded-xl shadow-2xs self-start sm:self-auto">
            <Plus className="h-3.5 w-3.5" /> Add Experience
          </Button>
        }
      />

      {formError && <FormFeedback status="error" message={formError} />}

      <div className="space-y-3.5">
        {experiences.map((exp) => (
          <div key={exp.id} className="rounded-xl border border-slate-200/80 p-4 sm:p-5 hover:border-kit-300 transition-all bg-slate-50/40">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{exp.role}</h3>
                  {exp.duration && (
                    <span className="rounded-md bg-kit-50 px-2 py-0.5 text-xs font-semibold text-kit-700 border border-kit-200">
                      Duration: {exp.duration}
                    </span>
                  )}
                  {exp.currentlyWorking && (
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                      Present
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-kit-800">{exp.company}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{exp.startDate ? String(exp.startDate).slice(0, 10) : ''} — {exp.currentlyWorking ? 'Present' : (exp.endDate ? String(exp.endDate).slice(0, 10) : '')}</span>
                </p>
                {exp.description && <p className="text-xs sm:text-sm text-slate-600 pt-2 leading-relaxed">{exp.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditId(exp.id);
                    setForm({
                      company: exp.company,
                      role: exp.role,
                      duration: exp.duration ?? '',
                      description: exp.description ?? '',
                      startDate: exp.startDate ? String(exp.startDate).slice(0, 10) : '',
                      endDate: exp.endDate ? String(exp.endDate).slice(0, 10) : '',
                      currentlyWorking: exp.currentlyWorking
                    });
                    setShowForm(true);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-kit-50 hover:text-kit-700 transition-colors focus:outline-none focus:ring-2 focus:ring-kit-500"
                  title="Edit experience"
                  aria-label={`Edit ${exp.role} at ${exp.company}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Delete experience"
                  aria-label={`Delete ${exp.role} at ${exp.company}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {experiences.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-2">
            <Briefcase className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No experience records added yet</p>
            <p className="text-xs text-slate-500">Include your past internships, positions, or training programs.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-kit-200 bg-kit-50/20 p-5 space-y-4">
          <h4 className="text-sm font-bold text-kit-900">{editId ? 'Edit Experience' : 'Add New Experience'}</h4>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization<RequiredMark /></label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Infosys, TCS, Startup" error={errors.company} className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Designation<RequiredMark /></label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. AI / ML Intern" error={errors.role} className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Experience / Duration<FieldHint>Optional</FieldHint></label>
              <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 6 Months, 1 Year, Summer Internship" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date<RequiredMark /></label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} error={errors.startDate} className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date<FieldHint>Optional — disabled if currently working</FieldHint></label>
              <Input type="date" disabled={form.currentlyWorking} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} error={errors.endDate} className={`h-9.5 text-xs sm:text-sm ${form.currentlyWorking ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} />
            </div>
            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.currentlyWorking}
                  onChange={(e) => setForm({ ...form, currentlyWorking: e.target.checked, endDate: e.target.checked ? '' : form.endDate })}
                  className="rounded border-slate-300 text-kit-600 focus:ring-kit-500"
                />
                <span>I currently work here</span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Responsibilities & Learnings<FieldHint>Optional</FieldHint></label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe tasks performed, technologies used, and key achievements..." rows={3} className="text-xs sm:text-sm bg-white rounded-xl" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-kit-100">
            <Button variant="outline" size="sm" onClick={reset} className="rounded-lg">Cancel</Button>
            <Button variant="primary" size="sm" isLoading={submitting} onClick={handleSubmit} className="font-bold rounded-lg shadow-2xs">
              <Save className="h-3.5 w-3.5" /> Save Experience
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Work Preferences Section
// ──────────────────────────────────────────────────
function WorkPreferencesSection({ profile, onUpdate }: { profile: Profile | null; onUpdate: () => void }) {
  const [form, setForm] = useState({
    previousWorkMode: profile?.previousWorkMode ?? '',
    preferredWorkMode: profile?.preferredWorkMode ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        previousWorkMode: profile.previousWorkMode ?? '',
        preferredWorkMode: profile.preferredWorkMode ?? '',
      });
    }
  }, [profile]);

  const baseline = useMemo(
    () => ({
      previousWorkMode: profile?.previousWorkMode ?? '',
      preferredWorkMode: profile?.preferredWorkMode ?? '',
    }),
    [profile]
  );
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline]
  );
  useSectionDirty(isDirty);

  const handleReset = () => {
    setForm(baseline);
    setErrorMsg('');
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    setErrorMsg('');
    try {
      await api.put('/profiles/me', form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onUpdate();
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || 'Failed to save work preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const previousOptions = [
    { value: 'Onsite', label: 'Onsite', desc: 'Worked in-person at office or physical campus' },
    { value: 'Remote', label: 'Remote', desc: 'Worked 100% remotely from home / online' },
    { value: 'Hybrid', label: 'Hybrid', desc: 'Mix of office days and remote work' },
    { value: 'No Previous Work Experience', label: 'No Previous Work Experience', desc: 'Fresher or no prior professional work/internship' },
  ];

  const preferredOptions = [
    { value: 'Onsite', label: 'Onsite', desc: 'Prefer working in-person at company office / campus' },
    { value: 'Remote', label: 'Remote', desc: 'Prefer working 100% remotely from home / anywhere' },
    { value: 'Hybrid', label: 'Hybrid', desc: 'Prefer a flexible mix of in-office & remote days' },
    { value: 'No Preference', label: 'No Preference', desc: 'Open to any work arrangement (Onsite, Remote, or Hybrid)' },
  ];

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <SectionHeading
        icon={SlidersHorizontal}
        title="Work Preferences"
        description="Configure your past work environment and desired work arrangement for upcoming placements and internships."
        right={
          savedSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs self-start sm:self-auto animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" /> Saved successfully
            </span>
          ) : undefined
        }
      />

      {errorMsg && <FormFeedback status="error" message={errorMsg} />}

      <div className="space-y-5">
        {/* Previous / Current Work Mode */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Previous / Current Work Mode
            </label>
            <p className="text-xs text-slate-500 mt-0.5">Specify how you worked in your past or current roles.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {previousOptions.map((opt) => {
              const isSelected = form.previousWorkMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, previousWorkMode: opt.value })}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-kit-600 bg-kit-50/60 ring-2 ring-kit-600/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-kit-900' : 'text-slate-800'}`}>
                      {opt.label}
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-kit-600 bg-kit-600' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Work Mode */}
        <div className="space-y-3 border-t border-slate-100 pt-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Preferred Work Mode
            </label>
            <p className="text-xs text-slate-500 mt-0.5">Select your preferred work arrangement for future employment opportunities.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {preferredOptions.map((opt) => {
              const isSelected = form.preferredWorkMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, preferredWorkMode: opt.value })}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-kit-600 bg-kit-50/60 ring-2 ring-kit-600/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-kit-900' : 'text-slate-800'}`}>
                      {opt.label}
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-kit-600 bg-kit-600' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11px] text-slate-400">
          {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
        </span>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty || saving}
            className="font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={saving}
            onClick={handleSave}
            disabled={!isDirty && !saving}
            className="font-bold px-6 py-2.5 rounded-xl shadow-xs text-xs sm:text-sm"
          >
            <Save className="h-4 w-4" />
            Save Work Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Verified Profile Links Section (GitHub, LinkedIn, Codolio, CodeChef, LeetCode, Portfolio)
// ──────────────────────────────────────────────────
function SocialSection({ profile, onUpdate }: { profile: Profile | null; onUpdate: () => void }) {
  const [urls, setUrls] = useState({
    githubUrl: profile?.githubUrl ?? '',
    linkedinUrl: profile?.linkedinUrl ?? '',
    codolioUrl: (profile as any)?.codolioUrl ?? '',
    codechefUrl: (profile as any)?.codechefUrl ?? '',
    leetcodeUrl: (profile as any)?.leetcodeUrl ?? '',
    codeforcesUrl: (profile as any)?.codeforcesUrl ?? '',
    portfolioUrl: profile?.portfolioUrl ?? ''
  });

  const [verifiedMap, setVerifiedMap] = useState<Record<string, any>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<Record<string, string>>({});

  const fetchVerifiedProfiles = useCallback(async () => {
    try {
      const res = await api.get('/profiles/verified');
      if (res.data.verifiedProfiles) {
        const map: Record<string, any> = {};
        res.data.verifiedProfiles.forEach((vp: any) => {
          map[vp.platform] = vp;
        });
        setVerifiedMap(map);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchVerifiedProfiles();
  }, [fetchVerifiedProfiles]);

  useEffect(() => {
    setUrls({
      githubUrl: profile?.githubUrl ?? '',
      linkedinUrl: profile?.linkedinUrl ?? '',
      codolioUrl: (profile as any)?.codolioUrl ?? '',
      codechefUrl: (profile as any)?.codechefUrl ?? '',
      leetcodeUrl: (profile as any)?.leetcodeUrl ?? '',
      codeforcesUrl: (profile as any)?.codeforcesUrl ?? '',
      portfolioUrl: profile?.portfolioUrl ?? ''
    });
  }, [profile]);

  const verifyPlatform = async (platform: 'GITHUB' | 'LINKEDIN' | 'CODOLIO' | 'CODECHEF' | 'LEETCODE' | 'CODEFORCES' | 'PORTFOLIO') => {
    const fieldMapping: Record<string, string> = {
      GITHUB: 'githubUrl',
      LINKEDIN: 'linkedinUrl',
      CODOLIO: 'codolioUrl',
      CODECHEF: 'codechefUrl',
      LEETCODE: 'leetcodeUrl',
      CODEFORCES: 'codeforcesUrl',
      PORTFOLIO: 'portfolioUrl'
    };
    const fieldName = fieldMapping[platform];
    const inputUrl = urls[fieldName as keyof typeof urls];

    if (!inputUrl || !inputUrl.trim()) {
      setErrorMsg((prev) => ({ ...prev, [platform]: `Please enter your ${platform.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} URL first.` }));
      return;
    }
    if (!/^https?:\/\/.+\..+/i.test(inputUrl.trim())) {
      setErrorMsg((prev) => ({ ...prev, [platform]: 'Enter a valid URL starting with http:// or https://' }));
      return;
    }

    setVerifying((prev) => ({ ...prev, [platform]: true }));
    setErrorMsg((prev) => ({ ...prev, [platform]: '' }));

    try {
      const endpoint = `/profiles/${platform.toLowerCase()}/verify`;
      const payload = { [fieldName]: inputUrl };
      const res = await api.post(endpoint, payload);

      if (res.data.verified) {
        setVerifiedMap((prev) => ({ ...prev, [platform]: res.data.verifiedProfile || res.data }));
        setUrls((prev) => ({ ...prev, [fieldName]: res.data.normalizedUrl }));
        onUpdate();
      } else {
        setErrorMsg((prev) => ({ ...prev, [platform]: res.data.message || `Failed to verify ${platform} profile.` }));
      }
    } catch (err: any) {
      setErrorMsg((prev) => ({
        ...prev,
        [platform]: err?.response?.data?.message || `Failed to verify ${platform} profile.`
      }));
    } finally {
      setVerifying((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const platforms = [
    {
      key: 'CODEFORCES' as const,
      label: 'Codeforces Profile',
      subtitle: 'Public contest handle or profile URL',
      placeholder: 'https://codeforces.com/profile/username',
      urlKey: 'codeforcesUrl' as const,
      icon: Code,
      color: 'bg-rose-600 text-white'
    },
    {
      key: 'GITHUB' as const,
      label: 'GitHub Profile',
      subtitle: 'Public profile URL',
      placeholder: 'https://github.com/username',
      urlKey: 'githubUrl' as const,
      icon: GithubIcon,
      color: 'bg-slate-900 text-white'
    },
    {
      key: 'LINKEDIN' as const,
      label: 'LinkedIn Profile',
      subtitle: 'Public profile URL',
      placeholder: 'https://linkedin.com/in/username',
      urlKey: 'linkedinUrl' as const,
      icon: LinkedinIcon,
      color: 'bg-blue-600 text-white'
    },
    {
      key: 'CODOLIO' as const,
      label: 'Codolio Profile',
      subtitle: 'Public profile URL',
      placeholder: 'https://codolio.com/profile/username',
      urlKey: 'codolioUrl' as const,
      icon: Code,
      color: 'bg-kit-700 text-white'
    },
    {
      key: 'CODECHEF' as const,
      label: 'CodeChef Profile',
      subtitle: 'Public profile URL',
      placeholder: 'https://www.codechef.com/users/username',
      urlKey: 'codechefUrl' as const,
      icon: CodeChefIcon,
      color: 'bg-amber-700 text-white'
    },
    {
      key: 'LEETCODE' as const,
      label: 'LeetCode Profile',
      subtitle: 'Public profile URL',
      placeholder: 'https://leetcode.com/u/username',
      urlKey: 'leetcodeUrl' as const,
      icon: LeetCodeIcon,
      color: 'bg-amber-500 text-white'
    },
    {
      key: 'PORTFOLIO' as const,
      label: 'Portfolio Website',
      subtitle: 'Personal website or portfolio URL',
      placeholder: 'https://yourname.dev',
      urlKey: 'portfolioUrl' as const,
      icon: Globe,
      color: 'bg-emerald-600 text-white'
    }
  ];

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <SectionHeading
        icon={LinkIcon}
        title="Verified Social & Coding Links"
        description="Connect and verify your GitHub, LinkedIn, Codolio, CodeChef, LeetCode, and Portfolio website. Verified links are verified live and attached to your application resume."
      />

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 sm:p-5 space-y-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">Competitive-programming sync status</h4>
          <p className="text-[11px] text-slate-500">
            Connected platforms, account ownership state, and the latest verified-activity import.
          </p>
        </div>
        <ExternalSyncStatusPanel />
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        {platforms.map((p) => {
          const verified = verifiedMap[p.key];
          const isVerifying = verifying[p.key];
          const err = errorMsg[p.key];
          const Icon = p.icon;

          return (
            <div key={p.key} className="rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-3 bg-slate-50/40 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-900 block">{p.label}</label>
                    <span className="text-[10.5px] text-slate-500">{p.subtitle}</span>
                  </div>
                </div>
                {verified && verified.ownershipVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Ownership verified</span>
                  </span>
                )}
                {verified && !verified.ownershipVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Connected · ownership unverified</span>
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder={p.placeholder}
                  value={urls[p.urlKey]}
                  onChange={(e) => {
                    setUrls({ ...urls, [p.urlKey]: e.target.value });
                    if (err) setErrorMsg((prev) => ({ ...prev, [p.key]: '' }));
                  }}
                  aria-label={p.label}
                  className="flex-1 bg-white h-9.5 text-xs sm:text-sm"
                />
                <Button
                  variant="primary"
                  isLoading={isVerifying}
                  onClick={() => verifyPlatform(p.key)}
                  className="shrink-0 font-bold px-4 rounded-xl shadow-2xs text-xs"
                >
                  {verified ? 'Re-Verify' : 'Verify'}
                </Button>
              </div>

              {err && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              {verified && verified.publicMetadata && (
                <div className="mt-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-3 text-xs text-emerald-950 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {verified.publicMetadata.avatar && (
                      <img src={verified.publicMetadata.avatar} alt="Avatar" className="h-7 w-7 rounded-full border border-emerald-300" />
                    )}
                    <div>
                      {verified.publicMetadata.username && (
                        <p className="font-bold text-emerald-900">@{verified.publicMetadata.username}</p>
                      )}
                      {verified.publicMetadata.domain && !verified.publicMetadata.username && (
                        <p className="font-bold text-emerald-900">{verified.publicMetadata.domain}</p>
                      )}
                      {verified.publicMetadata.name && (
                        <p className="text-[11px] text-emerald-700">{verified.publicMetadata.name}</p>
                      )}
                    </div>
                  </div>
                  {verified.publicMetadata.bio && (
                    <p className="text-emerald-800 text-[11px] italic">&ldquo;{verified.publicMetadata.bio}&rdquo;</p>
                  )}
                  {verified.publicMetadata.publicRepos !== undefined && (
                    <p className="text-[11px] text-emerald-800 font-medium">
                      <strong>Public Repositories:</strong> {verified.publicMetadata.publicRepos} • <strong>Followers:</strong> {verified.publicMetadata.followers}
                    </p>
                  )}
                  {verified.publicMetadata.totalSolved !== undefined && (
                    <p className="text-[11px] text-emerald-800 font-medium">
                      <strong>Problems Solved:</strong> {verified.publicMetadata.totalSolved} {verified.publicMetadata.ranking ? `• Ranking: ${verified.publicMetadata.ranking}` : ''}
                    </p>
                  )}
                  {verified.publicMetadata.verificationNote && (
                    <p className="text-[11px] text-emerald-700 font-medium">{verified.publicMetadata.verificationNote}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Career Activities Section
// ──────────────────────────────────────────────────
function CareerActivitiesSection() {
  const [completedActivities, setCompletedActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCompletedActivities() {
      try {
        const res = await api.get('/student/opportunity-history?status=COMPLETED');
        if (res.data.success) {
          setCompletedActivities(res.data.history || []);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load completed career activities.');
      } finally {
        setLoading(false);
      }
    }
    loadCompletedActivities();
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <SectionHeading
        icon={Trophy}
        title="Career Activities & Hackathons"
        description="Showcase your completed hackathons, internships, competitions, and workshops."
        right={
          <Link
            href="/dashboard/student/opportunity-history"
            className="inline-flex items-center gap-1.5 rounded-xl bg-kit-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-kit-700 transition-colors shadow-2xs self-start sm:self-auto"
          >
            View Full History →
          </Link>
        }
      />

      {error && <FormFeedback status="error" message={error} />}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : completedActivities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-2">
          <Trophy className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No completed career activities yet</p>
          <p className="text-xs text-slate-500">Activities marked as completed in your Placement Tracker will automatically appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedActivities.map((act) => (
            <div key={act.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 hover:border-kit-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">{act.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {act.outcome || 'Participated'} • {act.organization}
                  </p>
                </div>
              </div>
              {act.certificateUrl && (
                <a
                  href={act.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-kit-700 hover:underline flex items-center gap-1"
                >
                  Certificate <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
