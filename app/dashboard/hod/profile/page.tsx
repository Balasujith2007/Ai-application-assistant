'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Briefcase,
  Building2,
  Users,
  Clock,
  ShieldCheck,
  Award,
  BookOpen,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Lock,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  Trophy,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Landmark,
  FileText,
  ArrowRight,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

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

interface DepartmentSnapshot {
  departmentName: string;
  totalStudents: number;
  totalMentors: number;
  activeOpportunities: number;
  placementRegistrations: number;
  placedStudents: number;
  lastAuditSync: string;
}

const PROGRAMMES_OPTIONS = [
  'B.Tech Artificial Intelligence & Data Science (4 Years)',
  'B.E. Computer Science & Engineering (4 Years)',
  'M.Tech Data Science & Analytics (2 Years)',
  'Ph.D. Research Centre in AI & Machine Learning',
  'Post-Graduate Diploma in Cloud & Applied AI'
];

const RESPONSIBILITIES_OPTIONS = [
  'Curriculum Design & Autonomous Syllabus Revision',
  'Department Board of Studies (BoS) Chairman',
  'Faculty Performance Review & Workload Allocation',
  'Placement & Corporate Internship Steering Committee',
  'NBA & NAAC Department Accreditation Lead',
  'Department Research & AICTE Project Grant Administration',
  'Student Grievance & Academic Council Representative'
];

const PLACEMENT_INITIATIVES_OPTIONS = [
  'Industry Advisory Board Chairman & Annual Conclave',
  '100-Day DSA & Competitive Programming Intensive Bootcamps',
  'Tier-1 Product Company Mock Interview Panels',
  'Corporate MOU Signings & Technology Lab Partnerships',
  'Summer Internship Mandate with Industry Stipends',
  'Smart India Hackathon (SIH) Internal Jury Lead'
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function HODProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState('identity');
  const [isEditMode, setIsEditMode] = useState(false);

  // Identity Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Professor & Head of Department');
  const [department, setDepartment] = useState('Artificial Intelligence & Data Science');
  const [college, setCollege] = useState('KIT - Kalaignarkarunanidhi Institute of Technology');
  const [location, setLocation] = useState('Academic Block III, Ground Floor, HOD Suite (Room 101)');
  const [phone, setPhone] = useState('+91 422 2369800');
  const [bio, setBio] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // Academic Qualifications & Leadership
  const [highestDegree, setHighestDegree] = useState('Ph.D.');
  const [specialization, setSpecialization] = useState('Artificial Intelligence & Distributed Systems');
  const [institutionName, setInstitutionName] = useState('Anna University / IIT Madras');
  const [teachingExperienceYears, setTeachingExperienceYears] = useState('16');
  const [industryExperienceYears, setIndustryExperienceYears] = useState('4');
  const [leadershipExperienceYears, setLeadershipExperienceYears] = useState('6');
  const [educationList, setEducationList] = useState<DegreeItem[]>([]);
  const [experienceList, setExperienceList] = useState<ExperienceItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);
  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [leadershipMilestones, setLeadershipMilestones] = useState<string[]>([
    'Led Department to full 6-Year NBA Tier-1 Accreditation',
    'Secured ₹35 Lakhs AICTE MODROBS Research Grant for High Performance Compute Lab',
    'Formulated Autonomous Academic Regulations and AI-Integrated Curriculum 2024'
  ]);

  // Department & Academic Details
  const [supportedProgrammes, setSupportedProgrammes] = useState<string[]>([]);
  const [academicResponsibilities, setAcademicResponsibilities] = useState<string[]>([]);
  const [programmeScope, setProgrammeScope] = useState('Autonomous Curriculum, Batches 2023–2027 (UG) & 2024–2026 (PG)');
  const [departmentOffice, setDepartmentOffice] = useState('Room 101, Ground Floor, Academic Block III');
  const [departmentContact, setDepartmentContact] = useState('hod.aids@kit.ac.in | 0422-2369800 Ext 101');

  // Placement & Industry Coordination
  const [placementResponsibilities, setPlacementResponsibilities] = useState<string[]>([]);
  const [industryCollaborations, setIndustryCollaborations] = useState<string[]>([
    'NVIDIA Teaching Center of Excellence',
    'Intel OneAPI Academic Partnership',
    'Cognizant Digital Innovation Co-Lab'
  ]);
  const [recruitmentInitiatives, setRecruitmentInitiatives] = useState<string[]>([]);

  // Office Hours & Availability
  const [officeHours, setOfficeHours] = useState('02:00 PM - 04:30 PM (Consultations)');
  const [availableDays, setAvailableDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [meetingMode, setMeetingMode] = useState<'IN_PERSON' | 'VIRTUAL' | 'HYBRID'>('HYBRID');
  const [departmentMeetingSchedule, setDepartmentMeetingSchedule] = useState('Faculty Review: Every Wednesday 03:00 PM | Class Rep Council: 1st Monday');
  const [communicationPreferences, setCommunicationPreferences] = useState('In-Person Office Hours, Official Campus Email & Teams');
  const [isAvailable, setIsAvailable] = useState(true);
  const [unavailabilityNote, setUnavailabilityNote] = useState('');

  // Department Snapshot & Verification
  const [departmentSnapshot, setDepartmentSnapshot] = useState<DepartmentSnapshot>({
    departmentName: 'Artificial Intelligence & Data Science',
    totalStudents: 33,
    totalMentors: 5,
    activeOpportunities: 8,
    placementRegistrations: 40,
    placedStudents: 12,
    lastAuditSync: new Date().toISOString()
  });
  const [institutionalVerificationStatus, setInstitutionalVerificationStatus] = useState<'VERIFIED' | 'PENDING'>('VERIFIED');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch HOD Profile Data
  const fetchHODProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        const { user: userData, profile, departmentSnapshot: snapshot } = res.data.data;
        const prefs = (profile?.careerPreferences as Record<string, any>) || {};

        setName(userData.name || 'Dr. S. Kanthaswamy (HOD)');
        setEmail(userData.email || 'hod@careerai.edu');
        setEmployeeId(profile?.employeeId || prefs.employeeId || 'HOD-AI-001');
        setDesignation(prefs.designation || 'Professor & Head of Department');
        setDepartment(profile?.department || 'Artificial Intelligence & Data Science');
        setCollege(profile?.college || profile?.collegeName || 'KIT - Kalaignarkarunanidhi Institute of Technology');
        setLocation(profile?.location || 'Academic Block III, Ground Floor, HOD Suite (Room 101)');
        setPhone(profile?.phone || '+91 422 2369800');
        setBio(profile?.careerObjective || 'Senior academician and researcher with 16+ years of excellence in Artificial Intelligence, Big Data, and academic administration. Spearheading institutional placement transformation, industry-academia partnerships, and outcome-based engineering education.');

        // Academic
        setHighestDegree(prefs.highestDegree || 'Ph.D.');
        setSpecialization(prefs.specialization || 'Artificial Intelligence & Distributed Systems');
        setInstitutionName(prefs.institutionName || 'Anna University / IIT Madras');
        setTeachingExperienceYears(prefs.teachingExperienceYears !== undefined ? String(prefs.teachingExperienceYears) : '16');
        setIndustryExperienceYears(prefs.industryExperienceYears !== undefined ? String(prefs.industryExperienceYears) : '4');
        setLeadershipExperienceYears(prefs.leadershipExperienceYears !== undefined ? String(prefs.leadershipExperienceYears) : '6');

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
            { id: '1', degree: 'Ph.D.', fieldOfStudy: 'Computer Science & Engineering (AI)', institution: 'Anna University', startYear: 2011, endYear: 2016, grade: 'Doctoral Defense with Honors' },
            { id: '2', degree: 'M.E.', fieldOfStudy: 'Computer Science & Engineering', institution: 'Government College of Technology', startYear: 2006, endYear: 2008, grade: 'First Class with Distinction' },
            { id: '3', degree: 'B.E.', fieldOfStudy: 'Computer Science & Engineering', institution: 'Bharathiar University', startYear: 2002, endYear: 2006, grade: 'First Class' }
          ]);
        }

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
            { id: '1', company: 'KIT - Kalaignarkarunanidhi Institute of Technology', role: 'Professor & Head of Department', startDate: '2019-06-01', currentlyWorking: true, description: 'Managing academic governance, faculty administration, NBA accreditation, and premier placements for 300+ students across AI & Data Science.' },
            { id: '2', company: 'PSG College of Technology', role: 'Associate Professor', startDate: '2012-07-01', endDate: '2019-05-31', currentlyWorking: false, description: 'Led data science research projects, published 20+ peer-reviewed papers, and conducted corporate training modules.' }
          ]);
        }

        setCertifications(prefs.certifications || [
          { id: 'c1', title: 'Senior Member, IEEE Computer Society', organization: 'IEEE', year: '2023', credentialUrl: 'https://ieee.org/membership' },
          { id: 'c2', title: 'Certified ABET & NBA Programme Evaluator', organization: 'NBA India', year: '2022', credentialUrl: 'https://nbaind.org' }
        ]);

        setPublications(prefs.publications || [
          { id: 'p1', title: 'Scalable Distributed Architectures for Real-Time Neural Signal Processing', publisher: 'IEEE Transactions on Big Data', year: '2024', type: 'Journal Paper', link: 'https://doi.org/10.1109/sample' },
          { id: 'p2', title: 'Autonomous Curriculum Formulation for Applied AI Engineering Education', publisher: 'Springer Higher Education & Industry Series', year: '2023', type: 'Book Chapter', link: 'https://doi.org/10.1007/sample' }
        ]);

        if (prefs.leadershipMilestones) setLeadershipMilestones(prefs.leadershipMilestones);

        // Department Details
        setSupportedProgrammes(prefs.supportedProgrammes || [
          'B.Tech Artificial Intelligence & Data Science (4 Years)',
          'M.Tech Data Science & Analytics (2 Years)',
          'Ph.D. Research Centre in AI & Machine Learning'
        ]);

        setAcademicResponsibilities(prefs.academicResponsibilities || [
          'Curriculum Design & Autonomous Syllabus Revision',
          'Department Board of Studies (BoS) Chairman',
          'Faculty Performance Review & Workload Allocation',
          'Placement & Corporate Internship Steering Committee',
          'NBA & NAAC Department Accreditation Lead'
        ]);

        setProgrammeScope(prefs.programmeScope || 'Autonomous Curriculum, Batches 2023–2027 (UG) & 2024–2026 (PG)');
        setDepartmentOffice(prefs.departmentOffice || 'Room 101, Ground Floor, Academic Block III');
        setDepartmentContact(prefs.departmentContact || 'hod.aids@kit.ac.in | 0422-2369800 Ext 101');

        // Placement & Industry
        setPlacementResponsibilities(prefs.placementResponsibilities || [
          'Industry Advisory Board Chairman & Annual Conclave',
          'Tier-1 Product Company Mock Interview Panels',
          'Corporate MOU Signings & Technology Lab Partnerships'
        ]);

        if (prefs.industryCollaborations) setIndustryCollaborations(prefs.industryCollaborations);

        setRecruitmentInitiatives(prefs.recruitmentInitiatives || [
          '100-Day DSA & Competitive Programming Intensive Bootcamps',
          'Summer Internship Mandate with Industry Stipends',
          'Smart India Hackathon (SIH) Internal Jury Lead'
        ]);

        // Office Hours
        setOfficeHours(prefs.officeHours || '02:00 PM - 04:30 PM (Consultations)');
        setAvailableDays(prefs.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
        setMeetingMode(prefs.meetingMode || 'HYBRID');
        setDepartmentMeetingSchedule(prefs.departmentMeetingSchedule || 'Faculty Review: Every Wednesday 03:00 PM | Class Rep Council: 1st Monday');
        setCommunicationPreferences(prefs.communicationPreferences || 'In-Person Office Hours, Official Campus Email & Teams');
        setIsAvailable(prefs.isAvailable ?? true);
        setUnavailabilityNote(prefs.unavailabilityNote || '');

        setLinkedinUrl(profile?.linkedinUrl || 'https://linkedin.com/in/hod-kanthaswamy');
        setGithubUrl(profile?.githubUrl || 'https://github.com/hod-kanthaswamy');
        setPortfolioUrl(profile?.portfolioUrl || 'https://scholar.google.com');

        setDepartmentSnapshot(snapshot);
        setInstitutionalVerificationStatus(
          profile?.employeeId ? 'VERIFIED' : (prefs.institutionalVerificationStatus || 'VERIFIED')
        );
        setLastUpdated(profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently');
      }
    } catch (err: any) {
      console.error('Failed to load HOD profile', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHODProfile();
  }, [fetchHODProfile]);

  // Dynamic Profile Completion Calculation
  const completionStats = useMemo(() => {
    let score = 0;
    const checks: { label: string; done: boolean; weight: number; section: string }[] = [];

    // 1. Personal & Professional Identity (20%)
    const hasIdentity = Boolean(name && email && department && designation && employeeId);
    checks.push({ label: 'Personal & Professional Identity', done: hasIdentity, weight: 20, section: 'identity' });
    if (hasIdentity) score += 20;

    // 2. Academic Qualifications & Leadership (20%)
    const hasAcademic = Boolean(highestDegree && specialization && institutionName && leadershipExperienceYears);
    checks.push({ label: 'Academic Qualifications & Leadership Tenure', done: hasAcademic, weight: 20, section: 'academic' });
    if (hasAcademic) score += 20;

    // 3. Department & Academic Details (15%)
    const hasDept = Boolean(supportedProgrammes.length > 0 && academicResponsibilities.length > 0 && departmentOffice);
    checks.push({ label: 'Department Programmes & Governance', done: hasDept, weight: 15, section: 'department' });
    if (hasDept) score += 15;

    // 4. Placement & Industry Coordination (15%)
    const hasPlacement = Boolean(placementResponsibilities.length > 0 || recruitmentInitiatives.length > 0);
    checks.push({ label: 'Placement Oversight & Industry Initiatives', done: hasPlacement, weight: 15, section: 'placement' });
    if (hasPlacement) score += 15;

    // 5. Office Hours & Availability (15%)
    const hasAvailability = Boolean(officeHours && availableDays.length > 0 && meetingMode);
    checks.push({ label: 'Office Hours & Consultation Availability', done: hasAvailability, weight: 15, section: 'availability' });
    if (hasAvailability) score += 15;

    // 6. Leadership Statement / Bio (15%)
    const hasBio = Boolean(bio && bio.trim().length >= 20);
    checks.push({ label: 'Department Vision & Leadership Statement', done: hasBio, weight: 15, section: 'identity' });
    if (hasBio) score += 15;

    return {
      score: Math.min(100, Math.max(0, score)),
      checks
    };
  }, [
    name, email, department, designation, employeeId,
    highestDegree, specialization, institutionName, leadershipExperienceYears,
    supportedProgrammes, academicResponsibilities, departmentOffice,
    placementResponsibilities, recruitmentInitiatives,
    officeHours, availableDays, meetingMode,
    bio
  ]);

  // Save HOD Profile
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name,
        designation,
        college,
        location,
        phone,
        careerObjective: bio,
        highestDegree,
        specialization,
        institutionName,
        teachingExperienceYears,
        industryExperienceYears,
        leadershipExperienceYears,
        supportedProgrammes,
        academicResponsibilities,
        programmeScope,
        departmentOffice,
        departmentContact,
        placementResponsibilities,
        industryCollaborations,
        recruitmentInitiatives,
        certifications,
        publications,
        leadershipMilestones,
        officeHours,
        availableDays,
        meetingMode,
        departmentMeetingSchedule,
        communicationPreferences,
        isAvailable,
        unavailabilityNote,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        educationList,
        experienceList
      };

      const res = await axios.put('/api/hod/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSaveMessage({ type: 'success', text: 'HOD profile updated successfully!' });
        setIsEditMode(false);
        setLastUpdated(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }));
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage({ type: 'error', text: res.data.message || 'Failed to save changes' });
      }
    } catch (err: any) {
      console.error('Save HOD profile error', err);
      setSaveMessage({ type: 'error', text: err?.response?.data?.message || 'Error saving HOD profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDay = (day: string) => {
    setAvailableDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleToggleProgramme = (prog: string) => {
    setSupportedProgrammes(prev => prev.includes(prog) ? prev.filter(p => p !== prog) : [...prev, prog]);
  };

  const handleToggleResponsibility = (resp: string) => {
    setAcademicResponsibilities(prev => prev.includes(resp) ? prev.filter(r => r !== resp) : [...prev, resp]);
  };

  const handleTogglePlacementInitiative = (init: string) => {
    setRecruitmentInitiatives(prev => prev.includes(init) ? prev.filter(i => i !== init) : [...prev, init]);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-kit-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500">Loading department leadership profile...</p>
      </div>
    );
  }

  const navSections = [
    { id: 'identity', label: 'Personal & Professional Identity', icon: User, count: null },
    { id: 'academic', label: 'Academic Qualifications & Leadership', icon: GraduationCap, count: educationList.length },
    { id: 'department', label: 'Department & Academic Details', icon: Building2, count: supportedProgrammes.length },
    { id: 'snapshot', label: 'Department Leadership Snapshot', icon: Landmark, count: departmentSnapshot.totalStudents },
    { id: 'placement', label: 'Placement & Industry Coordination', icon: TrendingUp, count: recruitmentInitiatives.length },
    { id: 'availability', label: 'Office Hours & Availability', icon: Clock, count: null },
    { id: 'account', label: 'Account, Security & Preferences', icon: ShieldCheck, count: null },
  ];

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800">
      
      {/* Top Header Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/hod"
          id="back-to-hod-dashboard-button"
          className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-98"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180 transition-transform duration-150 group-hover:-translate-x-0.5 text-slate-500 group-hover:text-slate-900" />
          <span>Back to HOD Dashboard</span>
        </Link>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="hover:text-slate-700 transition-colors">CareerAI</span>
          <span className="text-slate-300">/</span>
          <span className="rounded-lg bg-kit-50 px-2.5 py-1 font-bold text-kit-700 border border-kit-200/60">
            Head of Department Profile
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

      {/* Executive HOD Hero Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        
        {/* Cover Banner with Deep Burgundy & Warm Amber Glow */}
        <div className="relative h-36 sm:h-44 w-full bg-gradient-to-r from-kit-950 via-kit-800 to-rose-950 overflow-hidden">
          <div className="absolute -left-10 -top-10 h-64 w-96 rounded-full bg-kit-500/25 blur-3xl" />
          <div className="absolute right-0 top-0 h-64 w-96 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute left-1/3 bottom-0 h-40 w-80 rounded-full bg-rose-500/20 blur-2xl" />

          {/* Institutional Grid pattern overlay */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />

          {/* Top Badges */}
          <div className="absolute right-6 top-4 hidden sm:flex items-center gap-2.5 z-10">
            {institutionalVerificationStatus === 'VERIFIED' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-emerald-400/40 shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Institutionally Verified HOD
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-amber-400/40 shadow-xs">
                <Clock className="h-3.5 w-3.5 text-amber-300" /> Administrative Review Pending
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/20 shadow-xs">
              <Users className="h-3.5 w-3.5 text-rose-200" /> {departmentSnapshot.totalStudents} Dept Students
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/20 shadow-xs">
              <Award className="h-3.5 w-3.5 text-amber-200" /> {leadershipExperienceYears}+ Yrs Leadership
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
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl border-4 border-white bg-gradient-to-br from-kit-100 via-rose-50 to-white shadow-md flex items-center justify-center text-kit-800 text-3xl font-extrabold uppercase tracking-tight">
                  {name ? name.charAt(0) : 'H'}
                </div>
                {institutionalVerificationStatus === 'VERIFIED' && (
                  <div
                    title="Institutionally Verified Head of Department"
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
                    {name || 'Dr. Head of Department'}
                  </h1>
                  {institutionalVerificationStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified HOD
                    </span>
                  )}
                  {employeeId && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200 font-mono">
                      Faculty ID: {employeeId}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm font-semibold text-kit-700">
                  {designation} • Department of {department}
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
                    Leadership Profile
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
                    ? 'All academic governance credentials complete'
                    : `${completionStats.checks.filter(c => !c.done).length} sections pending completion`}
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
                    <span>Edit Leadership Profile</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Sticky Section Navigation (Desktop) & Responsive (Mobile) */}
        <div className="lg:col-span-1 lg:sticky lg:top-4 space-y-4">
          
          <nav aria-label="HOD profile sections" className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xs">
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Department Governance
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

          {/* Quick Department Snapshot Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Department Scope</span>
              <span className="rounded-full bg-kit-50 px-2 py-0.5 text-[10px] font-bold text-kit-700 border border-kit-200/60">
                Live Data
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Enrolled Students:</span>
                <strong className="text-slate-900 font-bold">{departmentSnapshot.totalStudents}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department Mentors:</span>
                <strong className="text-slate-900 font-bold">{departmentSnapshot.totalMentors}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Opportunities:</span>
                <strong className="text-slate-900 font-bold">{departmentSnapshot.activeOpportunities}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Drive Registrations:</span>
                <strong className="text-emerald-700 font-bold">{departmentSnapshot.placementRegistrations}</strong>
              </div>
            </div>
          </div>

          {/* Institutional Governance Callout */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-xs text-rose-950">
            <div className="flex items-center gap-2 font-bold mb-1">
              <Lock className="h-3.5 w-3.5 text-rose-700 shrink-0" />
              <span>Administrative Authority</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-900/90">
              Official department assignments, autonomous curriculum rights, and faculty allocations are governed under KIT Academic Senate regulations.
            </p>
          </div>

        </div>

        {/* Right Section Content */}
        <div className="lg:col-span-3 space-y-6">

          {/* ========================================================
              SECTION 1: PERSONAL & PROFESSIONAL IDENTITY
          ======================================================== */}
          {(activeSection === 'identity' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-kit-600" />
                    Personal & Professional Identity
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official Head of Department identity, verified institutional credentials, and executive bio.
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
                    HOD Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Dr. S. Kanthaswamy"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>

                {/* Official Email */}
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
                    <span>Employee / Faculty ID</span>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified ID
                    </span>
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(employeeId && !isEditMode)}
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    placeholder="e.g. HOD-AI-001"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    placeholder="e.g. Professor & Head of Department"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* Department (PROTECTED) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Department (Assigned Scope)</span>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Administrative Lock
                    </span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={department}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-800 cursor-not-allowed"
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

                {/* Academic Specialization */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Academic Specialization / Research Domain
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    placeholder="e.g. Artificial Intelligence, Distributed Computing & Data Systems"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* Office Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    HOD Suite / Office Location
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Academic Block III, Ground Floor, Room 101"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

              </div>

              {/* HOD Professional Vision Statement */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Department Leadership Vision & Academic Philosophy
                </label>
                <textarea
                  rows={3}
                  disabled={!isEditMode}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Share the department vision, academic governance philosophy, research ambitions, and student placement priorities..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 focus:border-kit-600 focus:outline-none disabled:bg-slate-50"
                />
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 2: ACADEMIC QUALIFICATIONS & EXPERIENCE
          ======================================================== */}
          {(activeSection === 'academic' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-kit-600" />
                    Academic Qualifications & Leadership Experience
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Doctoral credentials, teaching tenure, industry exposure, and academic leadership milestones.
                  </p>
                </div>
              </div>

              {/* Experience Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-kit-100 text-kit-700 flex items-center justify-center font-extrabold text-xl">
                    {leadershipExperienceYears}+
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">Leadership Tenure</label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={leadershipExperienceYears}
                        onChange={e => setLeadershipExperienceYears(e.target.value)}
                        className="mt-1 w-20 rounded-lg border border-slate-200 px-2 py-0.5 text-xs font-bold"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500">Years as HOD & BoS Chair</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-extrabold text-xl">
                    {teachingExperienceYears}+
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">Teaching Experience</label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={teachingExperienceYears}
                        onChange={e => setTeachingExperienceYears(e.target.value)}
                        className="mt-1 w-20 rounded-lg border border-slate-200 px-2 py-0.5 text-xs font-bold"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500">Years in higher education</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-xl">
                    {industryExperienceYears}+
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">Industry Exposure</label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={industryExperienceYears}
                        onChange={e => setIndustryExperienceYears(e.target.value)}
                        className="mt-1 w-20 rounded-lg border border-slate-200 px-2 py-0.5 text-xs font-bold"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500">Years corporate R&D tenure</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Academic Degrees List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Academic Degrees & Qualifications
                  </h3>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => setEducationList(prev => [
                        ...prev,
                        { id: Date.now().toString(), degree: '', fieldOfStudy: '', institution: '', startYear: new Date().getFullYear(), grade: '' }
                      ])}
                      className="text-xs font-bold text-kit-600 hover:text-kit-700"
                    >
                      + Add Degree
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {educationList.map((edu, idx) => (
                    <div key={edu.id || idx} className="rounded-2xl border border-slate-200 p-3.5 bg-white flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-kit-100 text-kit-800 text-[11px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 ml-7">
                          {edu.institution} {edu.startYear ? `(${edu.startYear} - ${edu.endYear || 'Present'})` : ''} {edu.grade ? `• ${edu.grade}` : ''}
                        </p>
                      </div>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => setEducationList(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Leadership Milestones */}
              <div className="space-y-2.5 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Key Institutional & Leadership Milestones
                </h3>
                <div className="space-y-2">
                  {leadershipMilestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs font-semibold text-slate-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{milestone}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Research Publications & Books */}
              <div className="space-y-2.5 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" /> Selected Research Publications & Patents
                </h3>
                <div className="space-y-2">
                  {publications.map((pub, idx) => (
                    <div key={pub.id || idx} className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1">
                      <p className="font-bold text-slate-900">{pub.title}</p>
                      <p className="text-[11px] text-slate-500">
                        <span className="font-semibold text-purple-700">{pub.type}</span> • {pub.publisher} ({pub.year})
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 3: DEPARTMENT & ACADEMIC DETAILS
          ======================================================== */}
          {(activeSection === 'department' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-kit-600" />
                    Department & Academic Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Degree programmes, autonomous curriculum scope, and department administrative responsibilities.
                  </p>
                </div>
              </div>

              {/* Department Name & Scope Callout */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department Scope</label>
                    <p className="text-base font-extrabold text-slate-900">{department}</p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    NBA Accredited
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{programmeScope}</p>
              </div>

              {/* Supported Degree Programmes */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Supported Degree Programmes Under Department
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROGRAMMES_OPTIONS.map(prog => {
                    const isSelected = supportedProgrammes.includes(prog);
                    return (
                      <button
                        key={prog}
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => isEditMode && handleToggleProgramme(prog)}
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
                        <span>{prog}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Academic Governance Responsibilities */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Academic Governance & Leadership Responsibilities
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RESPONSIBILITIES_OPTIONS.map(resp => {
                    const isSelected = academicResponsibilities.includes(resp);
                    return (
                      <button
                        key={resp}
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => isEditMode && handleToggleResponsibility(resp)}
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
                        <span>{resp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department Office Suite</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={departmentOffice}
                    onChange={e => setDepartmentOffice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Department Contact</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={departmentContact}
                    onChange={e => setDepartmentContact(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 4: DEPARTMENT LEADERSHIP SNAPSHOT
          ======================================================== */}
          {activeSection === 'snapshot' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-kit-600" />
                    Department Leadership Snapshot (Real System Data)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live operational metrics calculated dynamically from database records.
                  </p>
                </div>
                <Link
                  href="/dashboard/hod"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-kit-50 px-3.5 py-1.5 text-xs font-bold text-kit-700 hover:bg-kit-100 transition-colors"
                >
                  <span>Open Full HOD Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Metric Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Department Students</span>
                  <p className="mt-1 text-3xl font-extrabold text-slate-900">{departmentSnapshot.totalStudents}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Enrolled Undergraduate Mentees</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Department Mentors</span>
                  <p className="mt-1 text-3xl font-extrabold text-slate-900">{departmentSnapshot.totalMentors}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Assigned Faculty Mentors</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Opportunities</span>
                  <p className="mt-1 text-3xl font-extrabold text-kit-700">{departmentSnapshot.activeOpportunities}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Placements & Hackathons</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Placement Drives</span>
                  <p className="mt-1 text-3xl font-extrabold text-emerald-700">{departmentSnapshot.placementRegistrations}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Verified Registrations</p>
                </div>
              </div>

              {/* Department Governance Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Users className="h-4 w-4 text-kit-600" /> Student Cohort Distribution
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Under the HOD's direct oversight, students across the department are assigned across faculty mentors with 100% mentorship coverage.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/dashboard/hod/students"
                      className="text-xs font-bold text-kit-600 hover:underline inline-flex items-center gap-1"
                    >
                      Manage Department Students <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" /> Placement & Training Steering
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Coordinating top tier campus drives (TCS, Zoho, Cognizant, Infosys) with mandatory pre-placement mock interviews.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/dashboard/hod/placements"
                      className="text-xs font-bold text-kit-600 hover:underline inline-flex items-center gap-1"
                    >
                      View Placement Drives <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 5: PLACEMENT & INDUSTRY COORDINATION
          ======================================================== */}
          {(activeSection === 'placement' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-kit-600" />
                    Placement & Industry Coordination
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Corporate partnerships, recruitment initiatives, and student career bootcamps.
                  </p>
                </div>
              </div>

              {/* Active Corporate & Lab Partnerships */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Active Industry & Corporate Collaborations
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {industryCollaborations.map((collab, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs font-semibold text-slate-800 flex items-center gap-2.5">
                      <Landmark className="h-4 w-4 text-kit-600 shrink-0" />
                      <span>{collab}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Placement & Recruitment Initiatives */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Placement & Competitive Readiness Initiatives
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PLACEMENT_INITIATIVES_OPTIONS.map(init => {
                    const isSelected = recruitmentInitiatives.includes(init);
                    return (
                      <button
                        key={init}
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => isEditMode && handleTogglePlacementInitiative(init)}
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
                        <span>{init}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 6: OFFICE HOURS & AVAILABILITY
          ======================================================== */}
          {(activeSection === 'availability' || isEditMode) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-kit-600" />
                    Office Hours & Availability
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    HOD suite consultation hours, meeting modes, and department meeting schedules.
                  </p>
                </div>
              </div>

              {/* Consultation Availability Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/60">
                <div>
                  <p className="text-xs font-bold text-slate-900">Available for Academic Consultations</p>
                  <p className="text-[11px] text-slate-500">
                    Toggle off if currently on university inspection duty, BoS meetings, or administrative travel.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Meeting Mode Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Preferred Meeting Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'IN_PERSON', label: 'HOD Suite (In-Person)' },
                    { key: 'VIRTUAL', label: 'Virtual (Teams/Meet)' },
                    { key: 'HYBRID', label: 'Hybrid (Both)' },
                  ].map(mode => (
                    <button
                      key={mode.key}
                      type="button"
                      disabled={!isEditMode}
                      onClick={() => setMeetingMode(mode.key as any)}
                      className={`rounded-2xl border p-3 text-center text-xs font-bold transition-all ${
                        meetingMode === mode.key
                          ? 'border-kit-600 bg-kit-50 text-kit-700 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consultation Days */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Available Consultation Days</label>
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

              {/* Office Hours & Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Consultation Office Hours</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={officeHours}
                    onChange={e => setOfficeHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department Meeting Schedule</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={departmentMeetingSchedule}
                    onChange={e => setDepartmentMeetingSchedule(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SECTION 7: ACCOUNT, SECURITY & PREFERENCES
          ======================================================== */}
          {activeSection === 'account' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-kit-600" />
                    Account, Security & Preferences
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Institutional verification compliance, password security, and notification settings.
                  </p>
                </div>
                <span className="text-xs text-slate-400">Last Synced: {lastUpdated}</span>
              </div>

              {/* Institutional Verification Status Card */}
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
                        ? 'Institutionally Verified Head of Department'
                        : 'Administrative Verification Pending'}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {institutionalVerificationStatus === 'VERIFIED'
                        ? 'Your appointment as Head of Department has been formally verified and ratified by the KIT Academic Council and Directorate. Official announcements, form approvals, and student assignments carry your verified digital institutional signature.'
                        : 'Your HOD profile is pending final administrative validation by the Principal / Dean Office.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Password & Security Quick Link */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Password & Multi-Factor Security</h3>
                  <p className="text-[11px] text-slate-500">Manage account credentials and authentication sessions.</p>
                </div>
                <Link
                  href="/dashboard/settings"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  Manage Security
                </Link>
              </div>

              {/* Dynamic Checklist */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Leadership Profile Completion Checklist
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

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
