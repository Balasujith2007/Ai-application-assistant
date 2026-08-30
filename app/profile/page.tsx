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
  Lock
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

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verifiedList, setVerifiedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('personal');

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

  // Dynamic Profile Completion Calculation
  const completionStats = useMemo(() => {
    let score = 0;
    const checks: { label: string; done: boolean; weight: number }[] = [];

    // Personal Info (20%)
    const hasPersonalInfo = Boolean(profile?.phone || profile?.department || profile?.college || profile?.location);
    checks.push({ label: 'Personal Info', done: hasPersonalInfo, weight: 20 });
    if (hasPersonalInfo) score += 20;

    // Education (20%)
    const hasEducation = Boolean(profile?.education && profile.education.length > 0);
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
    const hasVerifiedLinks = Boolean(verifiedList.length > 0 || profile?.githubUrl || profile?.linkedinUrl);
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
    { id: 'personal', label: 'Personal Info', icon: User, count: null },
    { id: 'education', label: 'Education', icon: GraduationCap, count: profile?.education?.length || null },
    { id: 'skills', label: 'Skills', icon: Code, count: profile?.skills?.length || null },
    { id: 'projects', label: 'Projects', icon: Briefcase, count: profile?.projects?.length || null },
    { id: 'experience', label: 'Experience', icon: Building2, count: profile?.experiences?.length || null },
    { id: 'activities', label: 'Career Activities', icon: Trophy, count: null },
    { id: 'social', label: 'Social Links', icon: LinkIcon, count: verifiedList.length || null },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] py-7 font-sans text-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Breadcrumb & Navigation */}
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
            <span className="text-slate-800 font-semibold">Student Profile</span>
          </div>
        </div>

        {/* Page Title & Subtitle */}
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
          <p className="text-xs text-slate-500">Manage your personal information, education, skills, experience and career details.</p>
        </div>

        {/* Clean Professional Profile Header Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Avatar & Student Core Bio */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              <div className="relative self-start sm:self-auto">
                <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-kit-800 text-white font-bold text-2xl shadow-sm flex items-center justify-center shrink-0 border-2 border-white ring-1 ring-slate-200/80">
                  {user?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" title="Active Account" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {user?.name || 'Student Name'}
                  </h2>
                  <span className="inline-flex items-center rounded-md bg-kit-50 px-2 py-0.5 text-[11px] font-bold text-kit-800 border border-kit-200/70 uppercase tracking-wide">
                    {user?.role ? user.role.replace(/_/g, ' ') : 'STUDENT'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/70">
                    <ShieldCheck className="h-3 w-3" /> Verified Student Profile
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user?.email}</span>
                </p>

                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-0.5">
                  {profile?.department && <span className="font-medium text-slate-700">{profile.department}</span>}
                  {profile?.college && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{profile.college}</span>
                    </>
                  )}
                  {(profile as any)?.registerNo && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-slate-600 font-medium">Reg: {(profile as any).registerNo}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Completion / Readiness Card */}
            <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 shrink-0 lg:w-72 w-full">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs border border-slate-200 text-kit-700 font-extrabold text-xs">
                {completionStats.score}%
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Profile Completion</span>
                  <span className="font-bold text-kit-700">{completionStats.score}% Complete</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-kit-600 transition-all duration-500"
                    style={{ width: `${completionStats.score}%` }}
                  />
                </div>
                <p className="text-[10.5px] text-slate-500 truncate">
                  {completionStats.score >= 80 ? 'Ready for Campus Placements' : 'Complete remaining sections to boost AI matching'}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content Layout with Responsive Navigation */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar Navigation - Desktop/Laptop */}
          <div className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-20 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xs space-y-1">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Profile Sections</p>
              {sections.map(({ id, label, icon: Icon, count }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    id={`profile-nav-${id}`}
                    onClick={() => setActiveSection(id)}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-kit-50 text-kit-900 border-l-4 border-kit-600 rounded-l-none pl-2.5 font-bold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-kit-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span>{label}</span>
                    </div>
                    {count !== null && count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${isActive ? 'bg-kit-200/80 text-kit-900' : 'bg-slate-100 text-slate-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
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
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? 'bg-kit-600 text-white shadow-xs'
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
              <PersonalSection profile={profile} onUpdate={fetchProfile} user={user} />
            )}
            {activeSection === 'education' && (
              <EducationSection education={profile?.education ?? []} onUpdate={fetchProfile} />
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
function PersonalSection({ profile, onUpdate, user }: { profile: Profile | null; onUpdate: () => void; user: { name?: string; email?: string } | null }) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: profile?.phone ?? '',
    department: profile?.department ?? '',
    year: profile?.year?.toString() ?? '',
    section: profile?.section ?? '',
    college: profile?.college ?? '',
    location: profile?.location ?? '',
    careerObjective: profile?.careerObjective ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (user?.name && form.name === '') {
      setForm((prev) => ({ ...prev, name: user.name ?? '' }));
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.put('/profiles/me', { ...form, year: form.year ? parseInt(form.year) : undefined });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      alert(error?.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Personal Information</h2>
          <p className="text-xs text-slate-500 mt-0.5">Update your contact details, academic branch, and career goals.</p>
        </div>
        {savedSuccess && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your full name"
            className="h-10 text-xs sm:text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
          <div className="relative">
            <Input
              value={user?.email ?? ''}
              disabled
              className="h-10 text-xs sm:text-sm bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed pr-8"
            />
            <Lock className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 98765 43210"
            className="h-10 text-xs sm:text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department</label>
          <Input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="Artificial Intelligence & Data Science"
            className="h-10 text-xs sm:text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Year of Study</label>
          <Input
            type="number"
            min={1}
            max={6}
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            placeholder="3"
            className="h-10 text-xs sm:text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Section</label>
          <Input
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            placeholder="A"
            className="h-10 text-xs sm:text-sm bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">College / Institution</label>
          <Input
            value={form.college}
            onChange={(e) => setForm({ ...form, college: e.target.value })}
            placeholder="KIT - Kalaignarkarunanidhi Institute of Technology"
            className="h-10 text-xs sm:text-sm bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Current Location</label>
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Coimbatore, Tamil Nadu, India"
            className="h-10 text-xs sm:text-sm bg-white"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">Career Objective & Bio</label>
        <Textarea
          value={form.careerObjective}
          onChange={(e) => setForm({ ...form, careerObjective: e.target.value })}
          placeholder="Briefly describe your career aspirations, key technical interests, and placement objectives..."
          rows={4}
          className="w-full text-xs sm:text-sm bg-white rounded-xl border-slate-300 focus:border-kit-600 focus:ring-kit-600/20"
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <Button variant="primary" isLoading={saving} onClick={handleSave} className="font-bold px-6 py-2.5 rounded-xl shadow-xs">
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
function EducationSection({ education, onUpdate }: { education: Education[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '' });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '' });
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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Education</h2>
          <p className="text-xs text-slate-500 mt-0.5">Add your undergraduate degree, secondary education, and academic accomplishments.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }} className="font-bold rounded-xl shadow-2xs">
          <Plus className="h-3.5 w-3.5" /> Add Education
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
                      grade: edu.grade ?? ''
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
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
            <GraduationCap className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No education records added yet</p>
            <p className="text-xs text-slate-500">Click &ldquo;Add Education&rdquo; above to include your academic history.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-kit-200 bg-kit-50/20 p-5 space-y-4">
          <h4 className="text-sm font-bold text-kit-900">{editId ? 'Edit Education' : 'Add New Education'}</h4>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Field of Study</label>
              <Input value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })} placeholder="e.g. Computer Science / AI & DS" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Year</label>
              <Input type="number" value={form.startYear} onChange={(e) => setForm({ ...form, startYear: e.target.value })} placeholder="2022" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Year (or Expected)</label>
              <Input type="number" value={form.endYear} onChange={(e) => setForm({ ...form, endYear: e.target.value })} placeholder="2026" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grade / CGPA</label>
              <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. 8.5 CGPA or 85%" className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-kit-100">
            <Button variant="outline" size="sm" onClick={reset} className="rounded-lg">Cancel</Button>
            <Button variant="primary" size="sm" isLoading={submitting} onClick={handleSubmit} className="font-bold rounded-lg shadow-2xs">
              <Save className="h-3.5 w-3.5" /> Save Education
            </Button>
          </div>
        </div>
      )}
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
      alert('Project title is required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, technologies: form.technologies.split(',').map((t) => t.trim()).filter(Boolean) };
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
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Projects</h2>
          <p className="text-xs text-slate-500 mt-0.5">Showcase your technical projects, open-source repositories, and web applications.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }} className="font-bold rounded-xl shadow-2xs">
          <Plus className="h-3.5 w-3.5" /> Add Project
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {projects.map((proj) => (
          <div key={proj.id} className="rounded-xl border border-slate-200/80 p-4 sm:p-5 hover:border-kit-300 transition-all bg-slate-50/40 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">{proj.title}</h3>
                {proj.description && <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{proj.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditId(proj.id);
                    setForm({
                      title: proj.title,
                      description: proj.description ?? '',
                      technologies: proj.technologies.join(', '),
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

            {/* Tech Stack Pills */}
            {proj.technologies && proj.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {proj.technologies.map((t) => (
                  <span key={t} className="rounded-md bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Links */}
            <div className="flex items-center gap-4 pt-1 text-xs font-semibold">
              {proj.githubUrl && (
                <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-700 hover:text-kit-700 transition-colors">
                  <GithubIcon className="h-3.5 w-3.5" /> Repository <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {proj.liveUrl && (
                <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-kit-700 hover:text-kit-900 transition-colors">
                  <Globe className="h-3.5 w-3.5" /> Live Demo <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
        {projects.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
            <Code className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No projects added yet</p>
            <p className="text-xs text-slate-500">Showcase your coding projects to impress recruiters.</p>
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
  const [form, setForm] = useState({ company: '', role: '', description: '', startDate: '', endDate: '', currentlyWorking: false });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ company: '', role: '', description: '', startDate: '', endDate: '', currentlyWorking: false });
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
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{exp.role}</h3>
                  {exp.currentlyWorking && (
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                      Present
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-kit-800">{exp.company}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{exp.startDate?.slice(0, 7)} — {exp.currentlyWorking ? 'Present' : exp.endDate?.slice(0, 7) ?? ''}</span>
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
                      description: exp.description ?? '',
                      startDate: exp.startDate?.slice(0, 10) ?? '',
                      endDate: exp.endDate?.slice(0, 10) ?? '',
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
            <p className="text-xs text-slate-500">Include your past internships or training programs.</p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-9.5 text-xs sm:text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <Input type="date" disabled={form.currentlyWorking} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`h-9.5 text-xs sm:text-sm ${form.currentlyWorking ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} />
            </div>
            <div className="sm:col-span-2">
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
// Verified Profile Links Section (GitHub, LinkedIn, Codolio)
// ──────────────────────────────────────────────────
function SocialSection({ profile, onUpdate }: { profile: Profile | null; onUpdate: () => void }) {
  const [urls, setUrls] = useState({
    githubUrl: profile?.githubUrl ?? '',
    linkedinUrl: profile?.linkedinUrl ?? '',
    codolioUrl: (profile as any)?.codolioUrl ?? ''
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
      codolioUrl: (profile as any)?.codolioUrl ?? ''
    });
  }, [profile]);

  const verifyPlatform = async (platform: 'GITHUB' | 'LINKEDIN' | 'CODOLIO') => {
    const fieldName = platform === 'GITHUB' ? 'githubUrl' : platform === 'LINKEDIN' ? 'linkedinUrl' : 'codolioUrl';
    const inputUrl = urls[fieldName as keyof typeof urls];

    if (!inputUrl || !inputUrl.trim()) {
      setErrorMsg((prev) => ({ ...prev, [platform]: `Please enter your ${platform} profile URL first.` }));
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
      placeholder: 'https://github.com/username',
      urlKey: 'githubUrl' as const,
      icon: GithubIcon,
      color: 'bg-slate-900 text-white'
    },
    {
      key: 'LINKEDIN' as const,
      label: 'LinkedIn Profile',
      placeholder: 'https://linkedin.com/in/username',
      urlKey: 'linkedinUrl' as const,
      icon: LinkedinIcon,
      color: 'bg-blue-600 text-white'
    },
    {
      key: 'CODOLIO' as const,
      label: 'Codolio Profile',
      placeholder: 'https://codolio.com/profile/username',
      urlKey: 'codolioUrl' as const,
      icon: Code,
      color: 'bg-kit-700 text-white'
    }
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Verified Social & Coding Links</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Connect and verify your GitHub, LinkedIn, and Codolio accounts. Verified links are verified live and attached to your application resume.
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
                    <span className="text-[10.5px] text-slate-500">Public profile URL</span>
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
