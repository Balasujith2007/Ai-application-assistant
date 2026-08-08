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
} from 'lucide-react';
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
    phone: profile?.phone ?? '',
    department: profile?.department ?? '',
    year: profile?.year?.toString() ?? '',
    section: profile?.section ?? '',
    college: profile?.college ?? '',
    location: profile?.location ?? '',
    careerObjective: profile?.careerObjective ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/profiles/me', { ...form, year: form.year ? parseInt(form.year) : undefined });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Personal Information</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Full Name" value={user?.name ?? ''} disabled />
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
// Social Links Section
// ──────────────────────────────────────────────────
function SocialSection({ profile, onUpdate }: { profile: Profile | null; onUpdate: () => void }) {
  const [form, setForm] = useState({ linkedinUrl: profile?.linkedinUrl ?? '', githubUrl: profile?.githubUrl ?? '', portfolioUrl: profile?.portfolioUrl ?? '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await api.put('/profiles/me', form);
    onUpdate();
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Social Links</h3>
      <div className="space-y-4">
        <Input label="LinkedIn URL" type="url" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/yourname" />
        <Input label="GitHub URL" type="url" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/yourname" />
        <Input label="Portfolio URL" type="url" value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} placeholder="https://yourportfolio.dev" />
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" isLoading={saving} onClick={handleSave}><Save className="h-4 w-4" />Save Links</Button>
      </div>
    </div>
  );
}
