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
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/index';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Profile, Education, Project, Experience, Skill } from '@/types';

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

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verifiedList, setVerifiedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('personal');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const [resProfile, resVerified] = await Promise.all([
        api.get<{ data: Profile }>('/profiles/me'),
        api.get('/profiles/verified').catch(() => ({ data: { verifiedProfiles: [] } }))
      ]);
      setProfile(resProfile.data.data);
      if (resVerified.data?.verifiedProfiles) {
        setVerifiedList(resVerified.data.verifiedProfiles);
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

  // Dynamic Profile Completion Calculation
  const completionStats = useMemo(() => {
    let score = 0;
    const checks: { label: string; done: boolean; weight: number }[] = [];

    // Personal Info (20%)
    const hasPersonalInfo = Boolean(profile?.phone || profile?.department || profile?.college || profile?.location || profile?.dob || profile?.nationality || profile?.gender || profile?.disabilityStatus);
    checks.push({ label: 'Personal Info', done: hasPersonalInfo, weight: 20 });
    if (hasPersonalInfo) score += 20;

    // Education (20%)
    const hasEducation = Boolean((profile?.education && profile.education.length > 0) || (profile as any)?.tenthSchool || (profile as any)?.twelfthSchool || (profile as any)?.collegeName || (profile as any)?.cgpa);
    checks.push({ label: 'Education', done: hasEducation, weight: 20 });
    if (hasEducation) score += 20;

    // Skills (15%)
    const hasSkills = Boolean(profile?.skills && profile.skills.length > 0);
    checks.push({ label: 'Skills', done: hasSkills, weight: 15 });
    if (hasSkills) score += 15;

    // Projects (15%)
    const hasProjects = Boolean(profile?.projects && profile.projects.length > 0);
    checks.push({ label: 'Projects', done: hasProjects, weight: 15 });
    if (hasProjects) score += 15;

    // Experience (15%)
    const hasExperience = Boolean(profile?.experiences && profile.experiences.length > 0);
    checks.push({ label: 'Experience', done: hasExperience, weight: 15 });
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
    checks.push({ label: 'Social Links', done: hasVerifiedLinks, weight: 15 });
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

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-6 font-sans text-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        
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
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          {/* Top Decorative CareerAI Signature Cover */}
          <div className="h-36 sm:h-40 w-full bg-gradient-to-r from-kit-900 via-kit-700 to-rose-900 relative overflow-hidden">
            {/* Multi-layered Warm Ambient Glows */}
            <div className="absolute -left-10 -top-10 h-64 w-96 rounded-full bg-kit-500/30 blur-3xl" />
            <div className="absolute right-0 top-0 h-64 w-96 rounded-full bg-rose-500/25 blur-3xl" />
            <div className="absolute left-1/2 bottom-0 h-40 w-80 rounded-full bg-amber-400/15 blur-2xl" />

            {/* Geometric Network Grid Pattern */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />
            <svg className="absolute inset-0 h-full w-full opacity-10 stroke-white" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <defs>
                <pattern id="careerai-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" strokeWidth="0.75" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#careerai-grid)" />
            </svg>

            {/* Top Right Frosted Glass Badges */}
            <div className="absolute right-6 top-4 hidden sm:flex items-center gap-2.5 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/20 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Placement Verified
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/20 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-200" /> AI Resume Synced
              </span>
            </div>
          </div>

          <div className="px-6 pb-6 sm:px-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              
              {/* Avatar + Info Block */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                {/* Avatar protruding cleanly over the cover */}
                <div className="relative -mt-14 sm:-mt-16 shrink-0 z-10 self-start">
                  <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-gradient-to-br from-kit-600 via-kit-700 to-kit-900 text-white font-black text-3xl sm:text-4xl shadow-lg flex items-center justify-center border-4 border-white ring-1 ring-slate-200/80">
                    {user?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 ring-2 ring-emerald-400/30 flex items-center justify-center shadow-xs" title="Active Account">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                </div>

                {/* Name, Badges & Bio */}
                <div className="space-y-2 pt-1 sm:pt-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                      {user?.name || 'Student Name'}
                    </h1>
                    <span className="inline-flex items-center rounded-lg bg-kit-50 px-2.5 py-0.5 text-xs font-bold text-kit-800 border border-kit-200 uppercase tracking-wide">
                      {user?.role ? user.role.replace(/_/g, ' ') : 'STUDENT'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified Profile
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <button
                      onClick={handleCopyEmail}
                      className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-kit-700 bg-slate-100/90 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-all border border-slate-200/60"
                      title="Click to copy email"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{user?.email}</span>
                      {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-600 ml-0.5" /> : <Copy className="h-3 w-3 text-slate-400 ml-0.5" />}
                    </button>

                    {profile?.phone && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 bg-slate-100/60 px-2.5 py-1 rounded-lg border border-slate-200/40">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{profile.phone}</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 font-medium">
                    {profile?.department && (
                      <span className="flex items-center gap-1 text-slate-800 font-semibold">
                        <GraduationCap className="h-3.5 w-3.5 text-kit-600" /> {profile.department}
                      </span>
                    )}
                    {profile?.college && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" /> {profile.college}
                        </span>
                      </>
                    )}
                    {(profile as any)?.registerNo && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200/60">
                          Reg: {(profile as any).registerNo}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Completion / Readiness Executive Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white p-4 shrink-0 lg:w-80 w-full shadow-2xs space-y-3 mt-2 lg:mt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kit-50 text-kit-700 font-black text-sm border border-kit-200/60 shadow-2xs">
                      {completionStats.score}%
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Profile Readiness</h4>
                      <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {completionStats.score >= 80 ? 'Ready for Placements' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-800">{completionStats.score}/100</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-kit-600 to-kit-500 transition-all duration-500"
                    style={{ width: `${completionStats.score}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>{completionStats.checks.filter((c) => c.done).length} of {completionStats.checks.length} sections complete</span>
                  <Link href="/resume" className="font-bold text-kit-700 hover:text-kit-800 flex items-center gap-0.5 hover:underline">
                    Resume Studio <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Main Content Layout with Responsive Navigation */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar Navigation - Desktop/Laptop */}
          <div className="hidden lg:block w-64 shrink-0 space-y-4">
            <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-1.5">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Profile Sections</span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{sections.length} Tabs</span>
              </div>
              
              {sections.map(({ id, label, icon: Icon, count, isDone }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    id={`profile-nav-${id}`}
                    onClick={() => setActiveSection(id)}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-kit-600 text-white font-bold shadow-sm shadow-kit-600/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-800'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span>{label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {count !== null && count > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
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
            <div className="rounded-2xl border border-kit-100 bg-gradient-to-br from-kit-50/70 to-white p-4 shadow-2xs space-y-2">
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
                    onClick={() => setActiveSection(id)}
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
              <PersonalSection profile={profile} onUpdate={fetchProfile} user={user} onRefreshUser={refreshUser} />
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
}: {
  profile: Profile | null;
  onUpdate: () => void;
  user: { name?: string; email?: string } | null;
  onRefreshUser?: () => Promise<void>;
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

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
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
      alert(error?.response?.data?.message || 'Failed to save changes. Please try again.');
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
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kit-50 text-kit-700 border border-kit-200/60">
              <User className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Personal Information</h2>
          </div>
          <p className="text-xs text-slate-500 pl-11">Manage your identity, demographic background, location, and career aspirations.</p>
        </div>
        {savedSuccess && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs self-start sm:self-auto animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
          </span>
        )}
      </div>

      {/* Group 1: Contact & Core Identity */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Mail className="h-3.5 w-3.5 text-kit-600" />
          <span>1. Contact & Identity</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">First Name</label>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
          <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* Group 5: Career Targets & Expectations */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 sm:p-6 space-y-4">
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
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button
          variant="primary"
          isLoading={saving}
          onClick={handleSave}
          className="font-bold px-7 py-2.5 rounded-xl shadow-sm text-xs sm:text-sm"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
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

  const handleSaveAcademics = async () => {
    setSavingAcademics(true);
    setAcademicSuccess(false);
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
      alert(err?.response?.data?.message || 'Failed to save academic details.');
    } finally {
      setSavingAcademics(false);
    }
  };

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '', minor: '' });
  };

  const handleSubmit = async () => {
    if (!form.institution || !form.degree || !form.startYear) {
      alert('Please fill in required education fields (Institution, Degree, Start Year)');
      return;
    }
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
      alert(err?.response?.data?.message || 'Failed to save education record.');
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
      alert(err?.response?.data?.message || 'Failed to delete education record.');
    }
  };

  return (
    <div className="space-y-6">
      {/* School Education Card (10th & 12th) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">School Education</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your 10th and 12th standard schooling and percentage.</p>
          </div>
          {academicSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* 10th Standard */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-kit-100 text-xs font-bold text-kit-800">10</span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">10th Standard (Secondary School)</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
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

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="primary" isLoading={savingAcademics} onClick={handleSaveAcademics} className="font-bold px-6 py-2.5 rounded-xl shadow-xs">
            <Save className="h-4 w-4" />
            Save School Details
          </Button>
        </div>
      </div>

      {/* College Education Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">College Education</h2>
            <p className="text-xs text-slate-500 mt-0.5">Provide your undergraduate / college degree, CGPA, graduation timeline, and specializations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
          <div className="grid grid-cols-2 gap-3">
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

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="primary" isLoading={savingAcademics} onClick={handleSaveAcademics} className="font-bold px-6 py-2.5 rounded-xl shadow-xs">
            <Save className="h-4 w-4" />
            Save College Details
          </Button>
        </div>
      </div>

      {/* Additional Education Entries & History */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Additional Degrees & Certifications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage any additional degree programs, diplomas, or academic qualifications.</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }} className="font-bold rounded-xl shadow-2xs">
            <Plus className="h-3.5 w-3.5" /> Add Degree
          </Button>
        </div>

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution / University</label>
                <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. KIT - Kalaignarkarunanidhi Institute of Technology" className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Degree</label>
                <Input value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} placeholder="e.g. B.Tech / B.E." className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Field of Study / Major</label>
                <Input value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })} placeholder="e.g. Computer Science / AI & DS" className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minor / Secondary Specialization</label>
                <Input value={form.minor} onChange={(e) => setForm({ ...form, minor: e.target.value })} placeholder="e.g. Cybersecurity (Optional)" className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grade / CGPA</label>
                <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. 8.5 CGPA or 85%" className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Year</label>
                <Input type="number" value={form.startYear} onChange={(e) => setForm({ ...form, startYear: e.target.value })} placeholder="2022" className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Year (or Expected)</label>
                <Input type="number" value={form.endYear} onChange={(e) => setForm({ ...form, endYear: e.target.value })} placeholder="2026" className="h-9.5 text-xs sm:text-sm bg-white" />
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

  const handleAdd = async () => {
    if (!newSkill.trim()) return;
    setAdding(true);
    try {
      await api.post('/profiles/skills', { name: newSkill.trim() });
      setNewSkill('');
      onUpdate();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add skill.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (skillId: string) => {
    try {
      await api.delete(`/profiles/skills/${skillId}`);
      onUpdate();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete skill.');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Technical & Soft Skills</h2>
        <p className="text-xs text-slate-500 mt-0.5">Skills added here are used by AI algorithms to match relevant job and internship opportunities.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill.id}
            className="group flex items-center gap-2 rounded-xl border border-kit-200/80 bg-kit-50/60 px-3 py-1.5 text-xs font-bold text-kit-800 transition-all hover:bg-kit-100"
          >
            <span>{skill.name}</span>
            <button
              onClick={() => handleRemove(skill.id)}
              className="text-kit-400 group-hover:text-red-600 transition-colors p-0.5"
              title="Remove skill"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {skills.length === 0 && (
          <p className="text-xs text-slate-500 italic py-2">No skills added yet. Add your core programming languages, tools, and libraries below.</p>
        )}
      </div>

      <div className="flex gap-2 max-w-md pt-2">
        <Input
          placeholder="e.g. Python, React, Next.js, Machine Learning"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          className="h-10 text-xs sm:text-sm bg-white"
        />
        <Button variant="primary" isLoading={adding} onClick={handleAdd} className="font-bold shrink-0 rounded-xl shadow-2xs">
          <Plus className="h-4 w-4" /> Add Skill
        </Button>
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

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ title: '', description: '', technologies: '', githubUrl: '', liveUrl: '' });
  };

  const handleSubmit = async () => {
    if (!form.title) {
      alert('Please provide a project title.');
      return;
    }
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
      alert(err?.response?.data?.message || 'Failed to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Key Projects</h2>
          <p className="text-xs text-slate-500 mt-0.5">Showcase your software applications, machine learning models, and engineering projects.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }} className="font-bold rounded-xl shadow-2xs">
          <Plus className="h-3.5 w-3.5" /> Add Project
        </Button>
      </div>

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
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-kit-50 hover:text-kit-700 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Delete project?')) {
                      await api.delete(`/profiles/projects/${proj.id}`);
                      onUpdate();
                    }
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI Career Management Platform" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain problem solved, architecture, and impact..." rows={3} className="text-xs sm:text-sm bg-white rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Technologies (comma separated)</label>
              <Input value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} placeholder="React, Node.js, PostgreSQL, TailwindCSS" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GitHub / Source Code URL</label>
                <Input value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/..." className="h-9.5 text-xs sm:text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Live Demo URL</label>
                <Input value={form.liveUrl} onChange={(e) => setForm({ ...form, liveUrl: e.target.value })} placeholder="https://myproject.app" className="h-9.5 text-xs sm:text-sm bg-white" />
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

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ company: '', role: '', duration: '', description: '', startDate: '', endDate: '', currentlyWorking: false });
  };

  const handleSubmit = async () => {
    if (!form.company || !form.role || !form.startDate) {
      alert('Please provide company name, role, and start date.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, endDate: form.currentlyWorking ? undefined : form.endDate || undefined };
      if (editId) await api.put(`/profiles/experience/${editId}`, payload);
      else await api.post('/profiles/experience', payload);
      onUpdate();
      reset();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save experience.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Work Experience & Internships</h2>
          <p className="text-xs text-slate-500 mt-0.5">List your internship roles, part-time positions, or professional training.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }} className="font-bold rounded-xl shadow-2xs">
          <Plus className="h-3.5 w-3.5" /> Add Experience
        </Button>
      </div>

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
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-kit-50 hover:text-kit-700 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Delete experience record?')) {
                      await api.delete(`/profiles/experience/${exp.id}`);
                      onUpdate();
                    }
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {experiences.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
            <Briefcase className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No experience records added yet</p>
            <p className="text-xs text-slate-500">Include your past internships, positions, or training programs.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-kit-200 bg-kit-50/20 p-5 space-y-4">
          <h4 className="text-sm font-bold text-kit-900">{editId ? 'Edit Experience' : 'Add New Experience'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization</label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Infosys, TCS, Startup" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Designation</label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. AI / ML Intern" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Experience / Duration</label>
              <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 6 Months, 1 Year, Summer Internship" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <Input type="date" disabled={form.currentlyWorking} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`h-9.5 text-xs sm:text-sm ${form.currentlyWorking ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} />
            </div>
            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.currentlyWorking}
                  onChange={(e) => setForm({ ...form, currentlyWorking: e.target.checked })}
                  className="rounded border-slate-300 text-kit-600 focus:ring-kit-500"
                />
                <span>I currently work here</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Responsibilities & Learnings</label>
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

  useEffect(() => {
    if (profile) {
      setForm({
        previousWorkMode: profile.previousWorkMode ?? '',
        preferredWorkMode: profile.preferredWorkMode ?? '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.put('/profiles/me', form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to save work preferences:', error);
      alert(error?.response?.data?.message || 'Failed to save work preferences. Please try again.');
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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Work Preferences</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your past work environment and desired work arrangement for upcoming placements and internships.
          </p>
        </div>
        {savedSuccess && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Previous / Current Work Mode */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Previous / Current Work Mode
            </label>
            <p className="text-xs text-slate-500 mt-0.5">Specify how you worked in your past or current roles.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {previousOptions.map((opt) => {
              const isSelected = form.previousWorkMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, previousWorkMode: opt.value })}
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {preferredOptions.map((opt) => {
              const isSelected = form.preferredWorkMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, preferredWorkMode: opt.value })}
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

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <Button variant="primary" isLoading={saving} onClick={handleSave} className="font-bold px-6 py-2.5 rounded-xl shadow-xs">
          <Save className="h-4 w-4" />
          Save Work Preferences
        </Button>
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
      portfolioUrl: profile?.portfolioUrl ?? ''
    });
  }, [profile]);

  const verifyPlatform = async (platform: 'GITHUB' | 'LINKEDIN' | 'CODOLIO' | 'CODECHEF' | 'LEETCODE' | 'PORTFOLIO') => {
    const fieldMapping: Record<string, string> = {
      GITHUB: 'githubUrl',
      LINKEDIN: 'linkedinUrl',
      CODOLIO: 'codolioUrl',
      CODECHEF: 'codechefUrl',
      LEETCODE: 'leetcodeUrl',
      PORTFOLIO: 'portfolioUrl'
    };
    const fieldName = fieldMapping[platform];
    const inputUrl = urls[fieldName as keyof typeof urls];

    if (!inputUrl || !inputUrl.trim()) {
      setErrorMsg((prev) => ({ ...prev, [platform]: `Please enter your ${platform.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} URL first.` }));
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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Verified Social & Coding Links</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Connect and verify your GitHub, LinkedIn, Codolio, CodeChef, LeetCode, and Portfolio website. Verified links are verified live and attached to your application resume.
        </p>
      </div>

      <div className="space-y-4">
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
                {verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Verified ✓ {verified.verificationStatus === 'FORMAT_VERIFIED' ? '(Format)' : ''}</span>
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder={p.placeholder}
                  value={urls[p.urlKey]}
                  onChange={(e) => setUrls({ ...urls, [p.urlKey]: e.target.value })}
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

  useEffect(() => {
    async function loadCompletedActivities() {
      try {
        const res = await api.get('/student/opportunity-history?status=COMPLETED');
        if (res.data.success) {
          setCompletedActivities(res.data.history || []);
        }
      } catch (err) {
        console.error('Failed to load completed activities:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompletedActivities();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Career Activities & Hackathons</h2>
          <p className="text-xs text-slate-500 mt-0.5">Showcase your completed hackathons, internships, competitions, and workshops.</p>
        </div>
        <Link
          href="/dashboard/student/opportunity-history"
          className="inline-flex items-center gap-1.5 rounded-xl bg-kit-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-kit-700 transition-colors shadow-2xs self-start sm:self-auto"
        >
          View Full History →
        </Link>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : completedActivities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
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
