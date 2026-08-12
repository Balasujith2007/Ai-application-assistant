'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/index';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Profile, Education, Project, Experience, Skill } from '@/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('personal');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get<{ data: Profile }>('/profiles/me');
      setProfile(res.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <DashboardLayout title="My Profile">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Code },
    { id: 'projects', label: 'Projects', icon: Code },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'activities', label: 'Career Activities', icon: Trophy },
    { id: 'social', label: 'Social Links', icon: LinkIcon },
  ];

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your career profile">
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="hidden w-56 flex-shrink-0 lg:block">
          <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeSection === id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
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
    </DashboardLayout>
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

  // Sync form with user name if user prop changes
  useEffect(() => {
    if (user?.name && form.name === '') {
      setForm((prev) => ({ ...prev, name: user.name ?? '' }));
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/profiles/me', { ...form, year: form.year ? parseInt(form.year) : undefined });
      alert('Personal Information saved successfully!');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      alert(error?.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Personal Information</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" value={user?.email ?? ''} disabled />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
        <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science Engineering" />
        <Input label="Year" type="number" min={1} max={6} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="3" />
        <Input label="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
        <Input label="College" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="NIT Trichy" className="sm:col-span-2" />
        <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Chennai, Tamil Nadu" className="sm:col-span-2" />
      </div>
      <div className="mt-4">
        <Textarea
          label="Career Objective"
          value={form.careerObjective}
          onChange={(e) => setForm({ ...form, careerObjective: e.target.value })}
          placeholder="Describe your career goals..."
          rows={4}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" isLoading={saving} onClick={handleSave}>
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

  const reset = () => { setShowForm(false); setEditId(null); setForm({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '' }); };

  const handleSubmit = async () => {
    const payload = { ...form, startYear: parseInt(form.startYear), endYear: form.endYear ? parseInt(form.endYear) : undefined };
    if (editId) {
      await api.put(`/profiles/education/${editId}`, payload);
    } else {
      await api.post('/profiles/education', payload);
    }
    onUpdate();
    reset();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this education?')) return;
    await api.delete(`/profiles/education/${id}`);
    onUpdate();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Education</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <div className="space-y-4">
        {education.map((edu) => (
          <div key={edu.id} className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{edu.institution}</p>
                <p className="text-sm text-gray-600">{edu.degree}{edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : ''}</p>
                <p className="text-xs text-gray-500">{edu.startYear} — {edu.endYear ?? 'Present'}{edu.grade ? ` · ${edu.grade}` : ''}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditId(edu.id); setForm({ institution: edu.institution, degree: edu.degree, fieldOfStudy: edu.fieldOfStudy ?? '', startYear: String(edu.startYear), endYear: edu.endYear ? String(edu.endYear) : '', grade: edu.grade ?? '' }); setShowForm(true); }} className="text-gray-400 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(edu.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {education.length === 0 && <p className="text-sm text-gray-500">No education added yet.</p>}
      </div>
      {showForm && (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className="col-span-2" />
            <Input label="Degree" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
            <Input label="Field of Study" value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })} />
            <Input label="Start Year" type="number" value={form.startYear} onChange={(e) => setForm({ ...form, startYear: e.target.value })} />
            <Input label="End Year" type="number" value={form.endYear} onChange={(e) => setForm({ ...form, endYear: e.target.value })} />
            <Input label="Grade/CGPA" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="col-span-2" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSubmit}><Save className="h-3.5 w-3.5" />Save</Button>
            <Button variant="outline" size="sm" onClick={reset}><X className="h-3.5 w-3.5" />Cancel</Button>
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
    await api.post('/profiles/skills', { name: newSkill.trim() });
    setNewSkill('');
    onUpdate();
    setAdding(false);
  };

  const handleRemove = async (skillId: string) => {
    await api.delete(`/profiles/skills/${skillId}`);
    onUpdate();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Skills</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {skills.map((skill) => (
          <span key={skill.id} className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            {skill.name}
            <button onClick={() => handleRemove(skill.id)} className="ml-1 hover:text-red-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {skills.length === 0 && <p className="text-sm text-gray-500">No skills added yet.</p>}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add a skill (e.g., React, Python)"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Button variant="primary" isLoading={adding} onClick={handleAdd}>
          <Plus className="h-4 w-4" />
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

  const reset = () => { setShowForm(false); setEditId(null); setForm({ title: '', description: '', technologies: '', githubUrl: '', liveUrl: '' }); };

  const handleSubmit = async () => {
    const payload = { ...form, technologies: form.technologies.split(',').map((t) => t.trim()).filter(Boolean) };
    if (editId) await api.put(`/profiles/projects/${editId}`, payload);
    else await api.post('/profiles/projects', payload);
    onUpdate();
    reset();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      <div className="space-y-4">
        {projects.map((proj) => (
          <div key={proj.id} className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{proj.title}</p>
                <p className="text-sm text-gray-600 mt-1">{proj.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {proj.technologies?.map((t) => <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t}</span>)}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => { setEditId(proj.id); setForm({ title: proj.title, description: proj.description ?? '', technologies: proj.technologies.join(', '), githubUrl: proj.githubUrl ?? '', liveUrl: proj.liveUrl ?? '' }); setShowForm(true); }} className="text-gray-400 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={async () => { if (confirm('Delete project?')) { await api.delete(`/profiles/projects/${proj.id}`); onUpdate(); } }} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && <p className="text-sm text-gray-500">No projects added yet.</p>}
      </div>
      {showForm && (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
          <Input label="Project Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Technologies (comma separated)" value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} placeholder="React, Node.js, PostgreSQL" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="GitHub URL" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
            <Input label="Live URL" value={form.liveUrl} onChange={(e) => setForm({ ...form, liveUrl: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSubmit}><Save className="h-3.5 w-3.5" />Save</Button>
            <Button variant="outline" size="sm" onClick={reset}><X className="h-3.5 w-3.5" />Cancel</Button>
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

  const reset = () => { setShowForm(false); setEditId(null); setForm({ company: '', role: '', description: '', startDate: '', endDate: '', currentlyWorking: false }); };

  const handleSubmit = async () => {
    const payload = { ...form, endDate: form.currentlyWorking ? undefined : form.endDate || undefined };
    if (editId) await api.put(`/profiles/experience/${editId}`, payload);
    else await api.post('/profiles/experience', payload);
    onUpdate();
    reset();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Experience</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      <div className="space-y-4">
        {experiences.map((exp) => (
          <div key={exp.id} className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{exp.role}</p>
                <p className="text-sm text-gray-600">{exp.company}</p>
                <p className="text-xs text-gray-500 mt-0.5">{exp.startDate?.slice(0, 7)} — {exp.currentlyWorking ? 'Present' : exp.endDate?.slice(0, 7) ?? ''}</p>
                {exp.description && <p className="mt-2 text-sm text-gray-600">{exp.description}</p>}
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => { setEditId(exp.id); setForm({ company: exp.company, role: exp.role, description: exp.description ?? '', startDate: exp.startDate?.slice(0, 10) ?? '', endDate: exp.endDate?.slice(0, 10) ?? '', currentlyWorking: exp.currentlyWorking }); setShowForm(true); }} className="text-gray-400 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={async () => { if (confirm('Delete experience?')) { await api.delete(`/profiles/experience/${exp.id}`); onUpdate(); } }} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {experiences.length === 0 && <p className="text-sm text-gray-500">No experience added yet.</p>}
      </div>
      {showForm && (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            {!form.currentlyWorking && <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.currentlyWorking} onChange={(e) => setForm({ ...form, currentlyWorking: e.target.checked })} className="rounded border-gray-300" />
            Currently working here
          </label>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSubmit}><Save className="h-3.5 w-3.5" />Save</Button>
            <Button variant="outline" size="sm" onClick={reset}><X className="h-3.5 w-3.5" />Cancel</Button>
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
      color: 'border-gray-900 bg-gray-900 text-white'
    },
    {
      key: 'LINKEDIN' as const,
      label: 'LinkedIn Profile',
      placeholder: 'https://linkedin.com/in/username',
      urlKey: 'linkedinUrl' as const,
      color: 'border-blue-600 bg-blue-600 text-white'
    },
    {
      key: 'CODOLIO' as const,
      label: 'Codolio Profile',
      placeholder: 'https://codolio.com/profile/username',
      urlKey: 'codolioUrl' as const,
      color: 'border-purple-600 bg-purple-600 text-white'
    }
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Verified Profile Links</h3>
        <p className="text-xs text-gray-500 mt-1">
          Verify your GitHub, LinkedIn, and Codolio accounts. Verified links are required before applying for opportunities.
        </p>
      </div>

      <div className="space-y-6">
        {platforms.map((p) => {
          const verified = verifiedMap[p.key];
          const isVerifying = verifying[p.key];
          const err = errorMsg[p.key];

          return (
            <div key={p.key} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-800">{p.label}</label>
                {verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                    Verified ✓ {verified.verificationStatus === 'FORMAT_VERIFIED' ? '(Format Verified)' : ''}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder={p.placeholder}
                  value={urls[p.urlKey]}
                  onChange={(e) => setUrls({ ...urls, [p.urlKey]: e.target.value })}
                  className="flex-1 bg-white"
                />
                <Button
                  variant="primary"
                  isLoading={isVerifying}
                  onClick={() => verifyPlatform(p.key)}
                  className="shrink-0 font-bold"
                >
                  {verified ? 'Re-Verify' : 'Verify'}
                </Button>
              </div>

              {err && (
                <p className="text-xs font-semibold text-red-600 mt-1">{err}</p>
              )}

              {verified && verified.publicMetadata && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-950 space-y-1">
                  {verified.publicMetadata.username && (
                    <p><strong>Username:</strong> {verified.publicMetadata.username}</p>
                  )}
                  {verified.publicMetadata.bio && (
                    <p><strong>Bio:</strong> {verified.publicMetadata.bio}</p>
                  )}
                  {verified.publicMetadata.publicRepos !== undefined && (
                    <p><strong>Public Repositories:</strong> {verified.publicMetadata.publicRepos} · <strong>Followers:</strong> {verified.publicMetadata.followers}</p>
                  )}
                  {verified.publicMetadata.verificationNote && (
                    <p className="text-[11px] text-emerald-700">{verified.publicMetadata.verificationNote}</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Career Activities</h3>
          <p className="text-xs text-gray-500 mt-1">Showcase your completed hackathons, internships, competitions & workshops</p>
        </div>
        <Link
          href="/dashboard/student/opportunity-history"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
        >
          View Full History →
        </Link>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : completedActivities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center space-y-2">
          <Trophy className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">No completed career activities yet</p>
          <p className="text-xs text-gray-500">Activities you mark as completed will automatically appear here on your profile.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedActivities.map((act) => (
            <div key={act.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-2xs hover:border-indigo-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{act.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {act.outcome || 'Participated'} • {act.organization}
                  </p>
                </div>
              </div>
              {act.certificateUrl && (
                <a
                  href={act.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
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

