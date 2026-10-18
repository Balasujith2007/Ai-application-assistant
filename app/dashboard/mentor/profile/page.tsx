'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Briefcase,
  Code,
  Users,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Globe,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  BookOpen,
  MessageSquare,
  FileCheck,
  ArrowRight,
  Check,
  X,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

interface SkillItem {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  isVerified?: boolean;
}

interface DegreeItem {
  id: string;
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  startYear: number;
  endYear?: number;
  grade?: string;
}

interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  currentlyWorking: boolean;
  description?: string;
}

interface CertificationItem {
  id: string;
  title: string;
  organization: string;
  year: string;
  credentialUrl?: string;
}

interface PublicationItem {
  id: string;
  title: string;
  publisher: string;
  year: string;
  link?: string;
  type: string;
}

interface AssignedStudentsSummary {
  totalAssigned: number;
  departments: string[];
  years: number[];
  sections: string[];
  previewRoster: {
    id: string;
    name: string;
    registerNo: string;
    department: string;
    year: string;
    section: string;
  }[];
}

const PRESET_SKILLS = [
  'Python', 'Java', 'C++', 'Data Structures & Algorithms',
  'AI/ML', 'Deep Learning', 'Data Science', 'Natural Language Processing',
  'Web Development', 'React', 'Node.js', 'SQL', 'PostgreSQL',
  'Cloud Architecture', 'AWS', 'System Design', 'Cybersecurity'
];

const GUIDANCE_AREAS_OPTIONS = [
  'Resume Preparation & ATS Reviews',
  'Technical Mock Interviews',
  'HR & Behavioral Interviews',
  'Placement & Internship Strategy',
  'Hackathons & Coding Competitions',
  'Research Papers & IEEE Publications',
  'Higher Studies & GATE / GRE Mentorship',
  'Capstone Project Architecture & Code Review'
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MentorProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [department, setDepartment] = useState('Artificial Intelligence & Data Science');
  const [college, setCollege] = useState('KIT - Kalaignarkarunanidhi Institute of Technology');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  // Academic states
  const [highestDegree, setHighestDegree] = useState('M.Tech');
  const [specialization, setSpecialization] = useState('Artificial Intelligence & Data Science');
  const [institutionName, setInstitutionName] = useState('Anna University');
  const [educationList, setEducationList] = useState<DegreeItem[]>([]);

  // Experience states
  const [teachingExperienceYears, setTeachingExperienceYears] = useState('8');
  const [industryExperienceYears, setIndustryExperienceYears] = useState('3');
  const [experienceList, setExperienceList] = useState<ExperienceItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);
  const [publications, setPublications] = useState<PublicationItem[]>([]);

  // Mentoring & Skills states
  const [primaryExpertise, setPrimaryExpertise] = useState('Full Stack & Machine Learning');
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [guidanceAreas, setGuidanceAreas] = useState<string[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // Availability states
  const [mentoringMode, setMentoringMode] = useState<'ONLINE' | 'OFFLINE' | 'BOTH'>('BOTH');
  const [availableDays, setAvailableDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  const [availableTimeSlots, setAvailableTimeSlots] = useState('03:30 PM - 05:00 PM (Office Hours)');
  const [communicationChannel, setCommunicationChannel] = useState('In-Person Office Hours & Microsoft Teams');
  const [isAvailableForMentoring, setIsAvailableForMentoring] = useState(true);
  const [unavailabilityNote, setUnavailabilityNote] = useState('');

  // Institutional Verification & Assignments
  const [institutionalVerificationStatus, setInstitutionalVerificationStatus] = useState<'VERIFIED' | 'PENDING'>('VERIFIED');
  const [assignedSummary, setAssignedSummary] = useState<AssignedStudentsSummary>({
    totalAssigned: 0,
    departments: [],
    years: [],
    sections: [],
    previewRoster: []
  });
  const [verifiedList, setVerifiedList] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch Mentor Profile Data
  const fetchMentorProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/mentor/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        const { user: userData, profile, assignedStudentsSummary, verifiedProfiles } = res.data.data;
        const prefs = (profile?.careerPreferences as Record<string, any>) || {};

        setName(userData.name || '');
        setEmail(userData.email || '');
        setEmployeeId(profile?.employeeId || prefs.employeeId || '');
        setDesignation(prefs.designation || 'Assistant Professor & Faculty Mentor');
        setDepartment(profile?.department || 'Artificial Intelligence & Data Science');
        setCollege(profile?.college || profile?.collegeName || 'KIT - Kalaignarkarunanidhi Institute of Technology');
        setLocation(profile?.location || 'Academic Block III, Room 304');
        setPhone(profile?.phone || '+91 98765 43210');
        setBio(profile?.careerObjective || 'Dedicated faculty mentor specializing in Artificial Intelligence, algorithms, and career preparation. Committed to empowering students to achieve top-tier placements.');

        // Academic
        setHighestDegree(prefs.highestDegree || 'M.Tech');
        setSpecialization(prefs.specialization || 'Artificial Intelligence & Data Science');
        setInstitutionName(prefs.institutionName || 'Anna University');
        if (profile?.education && profile.education.length > 0) {
          setEducationList(profile.education.map((e: any) => ({
            id: e.id,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy || '',
            institution: e.institution,
            startYear: e.startYear,
            endYear: e.endYear || undefined,
            grade: e.grade || ''
          })));
        } else {
          setEducationList([
            { id: '1', degree: 'M.Tech', fieldOfStudy: 'Computer Science & Engineering', institution: 'Anna University', startYear: 2014, endYear: 2016, grade: 'First Class with Distinction' },
            { id: '2', degree: 'B.E.', fieldOfStudy: 'Computer Science & Engineering', institution: 'Government College of Technology', startYear: 2010, endYear: 2014, grade: 'First Class' },
          ]);
        }

        // Experience
        setTeachingExperienceYears(prefs.teachingExperienceYears !== undefined ? String(prefs.teachingExperienceYears) : '8');
        setIndustryExperienceYears(prefs.industryExperienceYears !== undefined ? String(prefs.industryExperienceYears) : '3');
        if (profile?.experiences && profile.experiences.length > 0) {
          setExperienceList(profile.experiences.map((exp: any) => ({
            id: exp.id,
            company: exp.company,
            role: exp.role,
            startDate: exp.startDate ? exp.startDate.split('T')[0] : '',
            endDate: exp.endDate ? exp.endDate.split('T')[0] : '',
            currentlyWorking: exp.currentlyWorking,
            description: exp.description || ''
          })));
        } else {
          setExperienceList([
            { id: '1', company: 'KIT - Kalaignarkarunanidhi Institute of Technology', role: 'Assistant Professor & Faculty Mentor', startDate: '2019-06-01', currentlyWorking: true, description: 'Teaching advanced AI, Machine Learning, and mentoring 20+ students for campus placements and hackathons.' },
            { id: '2', company: 'Cognizant Technology Solutions', role: 'Software Engineer', startDate: '2016-07-01', endDate: '2019-05-31', currentlyWorking: false, description: 'Developed enterprise web applications and data pipeline microservices.' }
          ]);
        }

        setCertifications(prefs.certifications || [
          { id: 'c1', title: 'AWS Certified Solutions Architect – Associate', organization: 'Amazon Web Services', year: '2023', credentialUrl: 'https://aws.amazon.com/verification' },
          { id: 'c2', title: 'Deep Learning Specialization', organization: 'DeepLearning.AI / Coursera', year: '2022', credentialUrl: 'https://coursera.org/verify' },
        ]);

        setPublications(prefs.publications || [
          { id: 'p1', title: 'Deep Residual Learning for Automated Code Quality Assessment', publisher: 'IEEE International Conference on Computing & Informatics', year: '2024', type: 'Conference Paper', link: 'https://doi.org/10.1109/sample' },
          { id: 'p2', title: 'Predictive Modeling of Student Placement Outcomes Using Ensemble Learning', publisher: 'Springer Journal of Educational Data Mining', year: '2023', type: 'Journal Paper', link: 'https://doi.org/10.1007/sample' }
        ]);

        // Mentoring & Skills
        setPrimaryExpertise(prefs.primaryExpertise || 'Full Stack Engineering, Machine Learning & Algorithms');
        if (prefs.skills && prefs.skills.length > 0) {
          setSkills(prefs.skills);
        } else {
          setSkills([
            { name: 'Python', level: 'Expert', isVerified: true },
            { name: 'Java', level: 'Advanced', isVerified: true },
            { name: 'Data Structures & Algorithms', level: 'Expert', isVerified: true },
            { name: 'AI/ML', level: 'Expert', isVerified: false },
            { name: 'SQL & Database Design', level: 'Advanced', isVerified: false },
            { name: 'Cloud Architecture', level: 'Intermediate', isVerified: false }
          ]);
        }

        setGuidanceAreas(prefs.guidanceAreas || [
          'Resume Preparation & ATS Reviews',
          'Technical Mock Interviews',
          'HR & Behavioral Interviews',
          'Placement & Internship Strategy',
          'Hackathons & Coding Competitions'
        ]);

        setLinkedinUrl(profile?.linkedinUrl || 'https://linkedin.com/in/faculty-mentor');
        setGithubUrl(profile?.githubUrl || 'https://github.com/faculty-mentor');
        setPortfolioUrl(profile?.portfolioUrl || 'https://scholar.google.com');

        // Availability
        setMentoringMode(prefs.mentoringMode || 'BOTH');
        setAvailableDays(prefs.availableDays || ['Monday', 'Wednesday', 'Friday']);
        setAvailableTimeSlots(prefs.availableTimeSlots || '03:30 PM - 05:00 PM (Office Hours)');
        setCommunicationChannel(prefs.communicationChannel || 'In-Person Office Hours & Microsoft Teams');
        setIsAvailableForMentoring(prefs.isAvailableForMentoring ?? true);
        setUnavailabilityNote(prefs.unavailabilityNote || '');

        // Institutional & Verified
        setInstitutionalVerificationStatus(
          profile?.employeeId ? 'VERIFIED' : (prefs.institutionalVerificationStatus || 'VERIFIED')
        );
        setAssignedSummary(assignedStudentsSummary);
        setVerifiedList(verifiedProfiles || []);
        setLastUpdated(profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently');
      }
    } catch (err: any) {
      console.error('Failed to load mentor profile', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMentorProfile();
  }, [fetchMentorProfile]);

  // Dynamic Profile Completion Calculation
  const completionStats = useMemo(() => {
    let score = 0;
    const checks: { label: string; done: boolean; weight: number; section: string }[] = [];

    // 1. Personal & Institutional Details (20%)
    const hasPersonal = Boolean(name && email && department && designation && employeeId);
    checks.push({ label: 'Personal & Institutional Identifiers', done: hasPersonal, weight: 20, section: 'personal' });
    if (hasPersonal) score += 20;

    // 2. Academic Qualifications (20%)
    const hasAcademic = Boolean(highestDegree && specialization && institutionName && educationList.length > 0);
    checks.push({ label: 'Academic Degrees & Specialization', done: hasAcademic, weight: 20, section: 'academic' });
    if (hasAcademic) score += 20;

    // 3. Professional Experience (15%)
    const hasExperience = Boolean(teachingExperienceYears && (experienceList.length > 0 || certifications.length > 0));
    checks.push({ label: 'Teaching & Professional Experience', done: hasExperience, weight: 15, section: 'experience' });
    if (hasExperience) score += 15;

    // 4. Mentoring Expertise & Skills (20%)
    const hasExpertise = Boolean(primaryExpertise && skills.length >= 3 && guidanceAreas.length >= 2);
    checks.push({ label: 'Expertise Tags & Guidance Focus Areas', done: hasExpertise, weight: 20, section: 'expertise' });
    if (hasExpertise) score += 20;

    // 5. Mentoring Availability (15%)
    const hasAvailability = Boolean(mentoringMode && availableDays.length > 0 && availableTimeSlots && communicationChannel);
    checks.push({ label: 'Office Hours & Mentoring Availability', done: hasAvailability, weight: 15, section: 'availability' });
    if (hasAvailability) score += 15;

    // 6. Faculty Statement / Bio (10%)
    const hasBio = Boolean(bio && bio.trim().length >= 15);
    checks.push({ label: 'Faculty Statement & Research Bio', done: hasBio, weight: 10, section: 'personal' });
    if (hasBio) score += 10;

    return {
      score: Math.min(100, Math.max(0, score)),
      checks
    };
  }, [
    name, email, department, designation, employeeId,
    highestDegree, specialization, institutionName, educationList,
    teachingExperienceYears, experienceList, certifications,
    primaryExpertise, skills, guidanceAreas,
    mentoringMode, availableDays, availableTimeSlots, communicationChannel,
    bio
  ]);

  // Handle Save Profile
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name,
        designation,
        department,
        college,
        location,
        phone,
        careerObjective: bio,
        highestDegree,
        specialization,
        institutionName,
        teachingExperienceYears,
        industryExperienceYears,
        primaryExpertise,
        guidanceAreas,
        skills,
        certifications,
        publications,
        mentoringMode,
        availableDays,
        availableTimeSlots,
        communicationChannel,
        isAvailableForMentoring,
        unavailabilityNote,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        educationList,
        experienceList
      };

      const res = await axios.put('/api/mentor/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSaveMessage({ type: 'success', text: 'Faculty profile saved successfully!' });
        setIsEditMode(false);
        setLastUpdated(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }));
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage({ type: 'error', text: res.data.message || 'Failed to save changes' });
      }
    } catch (err: any) {
      console.error('Save profile error', err);
      setSaveMessage({ type: 'error', text: err?.response?.data?.message || 'Error saving faculty profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Helper to add skill
  const handleAddSkill = (skillNameToAdd: string) => {
    const trimmed = skillNameToAdd.trim();
    if (!trimmed) return;
    if (skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills(prev => [...prev, { name: trimmed, level: 'Advanced', isVerified: false }]);
    setNewSkillName('');
  };

  // Helper to remove skill
  const handleRemoveSkill = (skillName: string) => {
    setSkills(prev => prev.filter(s => s.name !== skillName));
  };

  // Helper to toggle guidance area
  const handleToggleGuidanceArea = (area: string) => {
    setGuidanceAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  // Helper to toggle available day
  const handleToggleDay = (day: string) => {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-kit-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500">Loading faculty profile...</p>
      </div>
    );
  }

  const navSections = [
    { id: 'personal', label: 'Personal & Institutional', icon: User, count: null },
    { id: 'academic', label: 'Academic Qualifications', icon: GraduationCap, count: educationList.length },
    { id: 'experience', label: 'Professional Experience', icon: Briefcase, count: experienceList.length + certifications.length },
    { id: 'expertise', label: 'Mentoring Expertise & Skills', icon: Code, count: skills.length },
    { id: 'assigned', label: 'Assigned Class & Students', icon: Users, count: assignedSummary.totalAssigned },
    { id: 'availability', label: 'Availability & Communication', icon: Clock, count: null },
    { id: 'verification', label: 'Verification & Settings', icon: ShieldCheck, count: null },
  ];

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800">
      
      {/* Top Header Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/mentor"
          id="back-to-mentor-dashboard-button"
          className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-98"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180 transition-transform duration-150 group-hover:-translate-x-0.5 text-slate-500 group-hover:text-slate-900" />
          <span>Back to Mentor Dashboard</span>
        </Link>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="hover:text-slate-700 transition-colors">CareerAI</span>
          <span className="text-slate-300">/</span>
          <span className="rounded-lg bg-kit-50 px-2.5 py-1 font-bold text-kit-700 border border-kit-200/60">
            Faculty Mentor Profile
          </span>
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveMessage && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 rounded-2xl p-4 shadow-md transition-all ${
            saveMessage.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <p className="text-sm font-semibold">{saveMessage.text}</p>
          </div>
          <button onClick={() => setSaveMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Executive Faculty Hero Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        
        {/* Cover Banner with Rich Warm Red Gradient */}
        <div className="relative h-36 sm:h-44 w-full bg-gradient-to-r from-kit-900 via-kit-700 to-rose-900 overflow-hidden">
          <div className="absolute -left-10 -top-10 h-64 w-96 rounded-full bg-kit-500/30 blur-3xl" />
          <div className="absolute right-0 top-0 h-64 w-96 rounded-full bg-rose-500/25 blur-3xl" />
          <div className="absolute left-1/2 bottom-0 h-40 w-80 rounded-full bg-amber-400/15 blur-2xl" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />

          {/* Top Badges */}
          <div className="absolute right-6 top-4 hidden sm:flex items-center gap-2.5 z-10">
            {institutionalVerificationStatus === 'VERIFIED' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-emerald-400/40 shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Institutionally Verified Faculty
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-amber-400/40 shadow-xs">
                <Clock className="h-3.5 w-3.5 text-amber-300" /> Verification Pending
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/20 shadow-xs">
              <Users className="h-3.5 w-3.5 text-rose-200" /> {assignedSummary.totalAssigned} Students Assigned
            </span>
          </div>
        </div>

        {/* Hero Profile Body */}
        <div className="px-6 pb-6 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            
            {/* Avatar & Core Title */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              
              {/* Avatar Protruding Cover */}
              <div className="relative -mt-14 sm:-mt-16 shrink-0 z-10 self-start">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl border-4 border-white bg-gradient-to-br from-kit-100 via-rose-50 to-white shadow-md flex items-center justify-center text-kit-700 text-3xl font-extrabold uppercase tracking-tight">
                  {name ? name.charAt(0) : 'M'}
                </div>
                {institutionalVerificationStatus === 'VERIFIED' && (
                  <div
                    title="Institutionally Verified Faculty"
                    className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="pt-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {name || 'Faculty Mentor'}
                  </h1>
                  {institutionalVerificationStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified Faculty
                    </span>
                  )}
                  {employeeId && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200 font-mono">
                      ID: {employeeId}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm font-semibold text-kit-700">
                  {designation} • {department}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {college}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {email}
                  </span>
                  {phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {phone}
                    </span>
                  )}
                  {location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Profile Actions & Completion Meter */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 pt-1">
              
              {/* Profile Completion Box */}
              <div className="w-full sm:w-64 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-kit-600" />
                    Profile Completion
                  </span>
                  <span className="text-kit-700 font-extrabold text-sm">{completionStats.score}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-kit-600 to-rose-600 transition-all duration-500"
                    style={{ width: `${completionStats.score}%` }}
                  />
                </div>

                <p className="mt-1.5 text-[11px] text-slate-500">
                  {completionStats.score === 100
                    ? 'All faculty credentials completed'
                    : `${completionStats.checks.filter(c => !c.done).length} sections need your attention`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                {isEditMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-kit-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-kit-700 transition-colors active:scale-98 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-kit-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-kit-700 transition-colors active:scale-98"
                  >
                    <span>Edit Faculty Profile</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Sticky Section Navigation (Desktop) & Responsive Pills (Mobile) */}
        <div className="lg:col-span-1 lg:sticky lg:top-4 space-y-4">
          
          <nav aria-label="Faculty profile sections" className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xs">
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Profile Sections
            </p>
            <div className="space-y-1">
              {navSections.map(sec => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-kit-50 text-kit-700 border border-kit-200/60 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-kit-600' : 'text-slate-400'}`} />
                      <span className="truncate">{sec.label}</span>
                    </div>
                    {sec.count !== null && (
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive ? 'bg-kit-200/60 text-kit-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sec.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Quick Mentoring Status Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Office Hours Status</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isAvailableForMentoring
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isAvailableForMentoring ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isAvailableForMentoring ? 'Available' : 'Away'}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Preferred Mode: <strong className="text-slate-800 font-semibold">{mentoringMode === 'BOTH' ? 'Online & Offline' : mentoringMode}</strong>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Days: <span className="text-slate-700 font-medium">{availableDays.join(', ') || 'Mon-Fri'}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Slots: <span className="text-slate-700 font-medium">{availableTimeSlots}</span>
            </p>
          </div>

          {/* Institutional Note */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-bold mb-1">
              <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Institutional Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800/90">
              Faculty assignments and Employee ID are verified and synchronized with the institution's official ERP system.
            </p>
          </div>

        </div>

        {/* Right Section Content */}
        <div className="lg:col-span-3 space-y-6">

          {/* ========================================================
              SECTION 1: PERSONAL & INSTITUTIONAL DETAILS
          ======================================================== */}
          {(activeSection === 'personal' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-kit-600" />
                    Personal & Institutional Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your institutional faculty identity, official designations, and department contact info.
                  </p>
                </div>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="text-xs font-bold text-kit-600 hover:text-kit-700"
                  >
                    Edit Section
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Dr. Kavitha M"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-kit-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>

                {/* Official Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Official Email Address</span>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> System Managed
                    </span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-600 cursor-not-allowed"
                  />
                </div>

                {/* Employee / Faculty ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Employee / Mentor ID</span>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified ID
                    </span>
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(employeeId && !isEditMode)}
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    placeholder="e.g. M-AI-001"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Faculty Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    placeholder="e.g. Associate Professor & Faculty Mentor"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g. Artificial Intelligence & Data Science"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* Institution / College */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Institution / College <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={college}
                    onChange={e => setCollege(e.target.value)}
                    placeholder="e.g. KIT - Kalaignarkarunanidhi Institute of Technology"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* Office Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Cabin / Office Location
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Block III, Room 304, AI Dept"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Extension / Phone
                  </label>
                  <input
                    type="tel"
                    disabled={!isEditMode}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

              </div>

              {/* Faculty Statement / Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Faculty Mentoring Philosophy & Statement
                </label>
                <textarea
                  rows={3}
                  disabled={!isEditMode}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Share a brief statement about your academic background, research interests, and mentoring commitment..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                />
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 2: ACADEMIC QUALIFICATIONS
          ======================================================== */}
          {(activeSection === 'academic' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-kit-600" />
                    Academic Qualifications
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Highest degree, academic specializations, and university credentials.
                  </p>
                </div>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEducationList(prev => [
                        ...prev,
                        { id: Date.now().toString(), degree: '', fieldOfStudy: '', institution: '', startYear: new Date().getFullYear(), grade: '' }
                      ]);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-kit-200 bg-kit-50 px-3 py-1.5 text-xs font-bold text-kit-700 hover:bg-kit-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Degree
                  </button>
                )}
              </div>

              {/* Highest Degree & Primary Specialization Top Highlight */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Highest Qualification</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={highestDegree}
                    onChange={e => setHighestDegree(e.target.value)}
                    placeholder="e.g. Ph.D. / M.Tech"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 disabled:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    placeholder="e.g. Artificial Intelligence"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Awarding Institution</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={institutionName}
                    onChange={e => setInstitutionName(e.target.value)}
                    placeholder="e.g. Anna University"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:bg-white"
                  />
                </div>
              </div>

              {/* Degree Records List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Educational History</p>
                {educationList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No additional degrees added yet.</p>
                ) : (
                  educationList.map((edu, idx) => (
                    <div key={edu.id || idx} className="rounded-2xl border border-slate-200 p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-kit-100 text-kit-700 text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {edu.degree || 'Degree Title'} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                          </span>
                        </div>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => setEducationList(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {isEditMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Degree</label>
                            <input
                              type="text"
                              value={edu.degree}
                              onChange={e => {
                                const val = e.target.value;
                                setEducationList(prev => prev.map((item, i) => i === idx ? { ...item, degree: val } : item));
                              }}
                              className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                              placeholder="e.g. M.Tech"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Field / Major</label>
                            <input
                              type="text"
                              value={edu.fieldOfStudy || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setEducationList(prev => prev.map((item, i) => i === idx ? { ...item, fieldOfStudy: val } : item));
                              }}
                              className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                              placeholder="e.g. CSE"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Institution</label>
                            <input
                              type="text"
                              value={edu.institution}
                              onChange={e => {
                                const val = e.target.value;
                                setEducationList(prev => prev.map((item, i) => i === idx ? { ...item, institution: val } : item));
                              }}
                              className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                              placeholder="University"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Year / Grade</label>
                            <input
                              type="text"
                              value={edu.grade || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setEducationList(prev => prev.map((item, i) => i === idx ? { ...item, grade: val } : item));
                              }}
                              className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                              placeholder="e.g. Distinction"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4">
                          <span><strong>Institution:</strong> {edu.institution}</span>
                          {edu.startYear && <span><strong>Year:</strong> {edu.startYear}{edu.endYear ? ` - ${edu.endYear}` : ''}</span>}
                          {edu.grade && <span><strong>Grade:</strong> {edu.grade}</span>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 3: PROFESSIONAL EXPERIENCE & RESEARCH
          ======================================================== */}
          {(activeSection === 'experience' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-kit-600" />
                    Professional Experience & Research
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Teaching tenure, industry exposure, professional certifications, and published papers.
                  </p>
                </div>
              </div>

              {/* Experience Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-kit-100 text-kit-700 flex items-center justify-center font-extrabold text-xl">
                    {teachingExperienceYears}+
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block">Teaching Experience (Years)</label>
                    {isEditMode ? (
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={teachingExperienceYears}
                        onChange={e => setTeachingExperienceYears(e.target.value)}
                        className="mt-1 w-24 rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-bold"
                      />
                    ) : (
                      <p className="text-xs text-slate-500 font-medium">Years guiding engineering students</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-xl">
                    {industryExperienceYears}+
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block">Industry Experience (Years)</label>
                    {isEditMode ? (
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={industryExperienceYears}
                        onChange={e => setIndustryExperienceYears(e.target.value)}
                        className="mt-1 w-24 rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-bold"
                      />
                    ) : (
                      <p className="text-xs text-slate-500 font-medium">Corporate engineering / R&D tenure</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Certifications Sub-Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" /> Professional Certifications
                  </h3>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => setCertifications(prev => [
                        ...prev,
                        { id: Date.now().toString(), title: '', organization: '', year: String(new Date().getFullYear()) }
                      ])}
                      className="text-xs font-bold text-kit-600 hover:text-kit-700"
                    >
                      + Add Certification
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {certifications.map((cert, idx) => (
                    <div key={cert.id || idx} className="rounded-2xl border border-slate-200 p-3.5 bg-white space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={cert.title}
                              onChange={e => {
                                const val = e.target.value;
                                setCertifications(prev => prev.map((c, i) => i === idx ? { ...c, title: val } : c));
                              }}
                              placeholder="Certification Title"
                              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-bold"
                            />
                          ) : (
                            <p className="text-xs font-bold text-slate-900 truncate">{cert.title}</p>
                          )}
                          <p className="text-[11px] text-slate-500 mt-0.5">{cert.organization} • {cert.year}</p>
                        </div>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => setCertifications(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 ml-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {cert.credentialUrl && !isEditMode && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-kit-600 hover:underline"
                        >
                          Verify Credential <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Research Publications Sub-Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-600" /> Publications & Research
                  </h3>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => setPublications(prev => [
                        ...prev,
                        { id: Date.now().toString(), title: '', publisher: '', year: String(new Date().getFullYear()), type: 'Journal Paper' }
                      ])}
                      className="text-xs font-bold text-kit-600 hover:text-kit-700"
                    >
                      + Add Publication
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {publications.map((pub, idx) => (
                    <div key={pub.id || idx} className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/50 flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={pub.title}
                            onChange={e => {
                              const val = e.target.value;
                              setPublications(prev => prev.map((p, i) => i === idx ? { ...p, title: val } : p));
                            }}
                            placeholder="Publication Title"
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-900">{pub.title}</p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          <span className="font-semibold text-purple-700">{pub.type}</span> • {pub.publisher} ({pub.year})
                        </p>
                      </div>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => setPublications(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 4: MENTORING EXPERTISE & SKILLS
          ======================================================== */}
          {(activeSection === 'expertise' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Code className="h-5 w-5 text-kit-600" />
                    Mentoring Expertise & Technical Skills
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Primary specialization, technical skills with proficiency levels, and career guidance areas.
                  </p>
                </div>
              </div>

              {/* Primary Expertise */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Primary Faculty Expertise
                </label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={primaryExpertise}
                  onChange={e => setPrimaryExpertise(e.target.value)}
                  placeholder="e.g. Artificial Intelligence, Distributed Computing & Algorithms"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 disabled:bg-slate-50"
                />
              </div>

              {/* Technical Skills with Verified Badging */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Technical Skills & Proficiency Levels
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Verified badges are exclusively displayed for skills with verified institutional assessments.
                    </p>
                  </div>
                </div>

                {/* Skill Badges Display */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {skills.map(s => (
                    <span
                      key={s.name}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-800"
                    >
                      <span>{s.name}</span>
                      <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200/60">
                        {s.level}
                      </span>
                      {s.isVerified && (
                        <span title="Independently Verified Skill" className="flex items-center gap-0.5 text-emerald-600 font-bold text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s.name)}
                          className="text-slate-400 hover:text-red-500 ml-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {/* Add Skill Controls in Edit Mode */}
                {isEditMode && (
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkillName}
                        onChange={e => setNewSkillName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill(newSkillName);
                          }
                        }}
                        placeholder="Type a skill and press Enter (e.g. Docker, PyTorch)..."
                        className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSkill(newSkillName)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        Add
                      </button>
                    </div>

                    {/* Preset suggestions */}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Quick add common faculty skills:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_SKILLS.filter(ps => !skills.some(s => s.name.toLowerCase() === ps.toLowerCase())).map(ps => (
                          <button
                            key={ps}
                            type="button"
                            onClick={() => handleAddSkill(ps)}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-kit-50 hover:text-kit-700 transition-colors"
                          >
                            + {ps}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Career Guidance Areas */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-xs font-bold text-slate-700">
                  Career Guidance Focus Areas
                </label>
                <p className="text-[11px] text-slate-400">
                  Select the domains where you actively advise assigned students.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {GUIDANCE_AREAS_OPTIONS.map(opt => {
                    const isSelected = guidanceAreas.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => isEditMode && handleToggleGuidanceArea(opt)}
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-kit-300 bg-kit-50/80 text-kit-900 font-bold shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        } ${!isEditMode ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${
                          isSelected ? 'border-kit-600 bg-kit-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Social / Portfolio Links */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Professional & Research Profiles
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">LinkedIn Profile</label>
                    <input
                      type="url"
                      disabled={!isEditMode}
                      value={linkedinUrl}
                      onChange={e => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">GitHub / Code Repository</label>
                    <input
                      type="url"
                      disabled={!isEditMode}
                      value={githubUrl}
                      onChange={e => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">Google Scholar / Portfolio</label>
                    <input
                      type="url"
                      disabled={!isEditMode}
                      value={portfolioUrl}
                      onChange={e => setPortfolioUrl(e.target.value)}
                      placeholder="https://scholar.google.com/..."
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 5: ASSIGNED CLASS & STUDENT INFORMATION
          ======================================================== */}
          {activeSection === 'assigned' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-kit-600" />
                    Assigned Class & Students (Official Records)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official mentorship assignments authorized by HOD and Placement Cell.
                  </p>
                </div>
                <Link
                  href="/dashboard/mentor/students"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-kit-50 px-3.5 py-1.5 text-xs font-bold text-kit-700 hover:bg-kit-100 transition-colors"
                >
                  <span>View All in My Students</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Administrative Integrity Callout */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
                <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Official Assignment Integrity</p>
                  <p className="mt-0.5 text-amber-800">
                    Mentors cannot modify official student or class assignments directly through profile editing. Class reassignments must be executed through the authorized HOD assignment workflow.
                  </p>
                </div>
              </div>

              {/* Assignment Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Assigned</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">{assignedSummary.totalAssigned}</p>
                  <p className="text-[11px] text-slate-500">Mentee Students</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900 truncate">
                    {assignedSummary.departments[0] || department || 'AI&DS'}
                  </p>
                  <p className="text-[11px] text-slate-500">Assigned Branch</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Academic Year</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {assignedSummary.years.length > 0 ? `Year ${assignedSummary.years.join(', ')}` : 'Year 3 (2026 Batch)'}
                  </p>
                  <p className="text-[11px] text-slate-500">Graduating Batch</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Section(s)</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {assignedSummary.sections.length > 0 ? `Sec ${assignedSummary.sections.join(', ')}` : 'Sec A & B'}
                  </p>
                  <p className="text-[11px] text-slate-500">Assigned Cohort</p>
                </div>
              </div>

              {/* Assigned Student Preview Roster */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recent Assigned Student Mentees (Sample)
                  </p>
                  <span className="text-xs text-slate-400">
                    Showing top {assignedSummary.previewRoster.length} of {assignedSummary.totalAssigned}
                  </span>
                </div>

                {assignedSummary.previewRoster.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No students assigned to this mentor account currently.</p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Student Name</th>
                          <th className="px-4 py-2.5">Register No</th>
                          <th className="px-4 py-2.5">Department</th>
                          <th className="px-4 py-2.5">Year / Section</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assignedSummary.previewRoster.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{s.name}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">{s.registerNo}</td>
                            <td className="px-4 py-2.5 text-slate-600 truncate max-w-[160px]">{s.department}</td>
                            <td className="px-4 py-2.5 text-slate-600">{s.year} • Sec {s.section}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 6: AVAILABILITY & COMMUNICATION
          ======================================================== */}
          {(activeSection === 'availability' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-kit-600" />
                    Mentoring Availability & Communication
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure office hours, communication channels, and temporary leave status for students.
                  </p>
                </div>
              </div>

              {/* Active Availability Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/60">
                <div>
                  <p className="text-xs font-bold text-slate-900">Accepting Student Guidance Appointments</p>
                  <p className="text-[11px] text-slate-500">
                    Toggle off if currently on conference leave, research sabbatical, or exam duty.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => setIsAvailableForMentoring(!isAvailableForMentoring)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAvailableForMentoring ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAvailableForMentoring ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {!isAvailableForMentoring && (
                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">
                    Temporary Unavailability Note
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={unavailabilityNote}
                    onChange={e => setUnavailabilityNote(e.target.value)}
                    placeholder="e.g. On academic conference leave until Oct 25. Please email for urgent queries."
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/50 p-2.5 text-xs text-amber-900"
                  />
                </div>
              )}

              {/* Mentoring Mode Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Preferred Mentoring Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'OFFLINE', label: 'In-Person (Offline)' },
                    { key: 'ONLINE', label: 'Virtual (Online)' },
                    { key: 'BOTH', label: 'Hybrid (Both)' },
                  ].map(mode => (
                    <button
                      key={mode.key}
                      type="button"
                      disabled={!isEditMode}
                      onClick={() => setMentoringMode(mode.key as any)}
                      className={`rounded-2xl border p-3 text-center text-xs font-bold transition-all ${
                        mentoringMode === mode.key
                          ? 'border-kit-600 bg-kit-50 text-kit-700 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Days */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Available Mentoring Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => handleToggleDay(day)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots & Preferred Communication */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Available Time Slots / Office Hours
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={availableTimeSlots}
                    onChange={e => setAvailableTimeSlots(e.target.value)}
                    placeholder="e.g. 03:30 PM - 05:00 PM"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Preferred Communication Channel
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={communicationChannel}
                    onChange={e => setCommunicationChannel(e.target.value)}
                    placeholder="e.g. In-Person Office Hours, MS Teams, Campus Email"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 7: VERIFICATION & PROFILE SETTINGS
          ======================================================== */}
          {activeSection === 'verification' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-kit-600" />
                    Institutional Verification & Settings
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Institutional credentials, verification compliance, and profile audit status.
                  </p>
                </div>
                <span className="text-xs text-slate-400">Last Synced: {lastUpdated}</span>
              </div>

              {/* Verification Status Card */}
              <div className={`rounded-2xl border p-4 ${
                institutionalVerificationStatus === 'VERIFIED'
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                  : 'border-amber-200 bg-amber-50/60 text-amber-950'
              }`}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className={`h-5 w-5 shrink-0 mt-0.5 ${
                    institutionalVerificationStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'
                  }`} />
                  <div>
                    <h3 className="text-sm font-bold">
                      {institutionalVerificationStatus === 'VERIFIED'
                        ? 'Institutionally Verified Faculty Mentor'
                        : 'Institutional Verification in Progress'}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {institutionalVerificationStatus === 'VERIFIED'
                        ? 'Your faculty identity and Employee ID have been officially verified by the KIT College Administration. Verified badges are automatically rendered on student dashboards and recommendation letters.'
                        : 'Your faculty profile is awaiting final administrative verification by the Head of Department. You may continue updating academic credentials and guiding students.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Missing Information Checklist */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Faculty Profile Completion Checklist
                </h3>

                <div className="space-y-2">
                  {completionStats.checks.map(item => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                        item.done ? 'border-emerald-100 bg-emerald-50/40 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {item.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-semibold">{item.label}</span>
                      </div>
                      <span className={`text-[11px] font-bold ${item.done ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {item.done ? `+${item.weight}% Complete` : `Incomplete (${item.weight}%)`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Quick Save */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-kit-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-kit-700 transition-colors"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save All Faculty Profile Changes</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
