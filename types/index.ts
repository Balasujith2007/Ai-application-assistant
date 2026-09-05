// ============================================================
// AUTH
// ============================================================

export type Role =
  | 'STUDENT'
  | 'MENTOR'
  | 'FACULTY'
  | 'HOD'
  | 'PLACEMENT_CELL'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt?: string;
  profile?: Profile | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============================================================
// PROFILE
// ============================================================

export interface Profile {
  id: string;
  userId: string;
  phone?: string | null;
  department?: string | null;
  year?: number | null;
  section?: string | null;
  college?: string | null;
  location?: string | null;
  careerObjective?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  codolioUrl?: string | null;
  dob?: string | null;
  nationality?: string | null;
  country?: string | null;
  state?: string | null;
  preferredLocation?: string | null;
  pinCode?: string | null;
  preferredRole?: string | null;
  expectedSalary?: string | null;
  tenthSchool?: string | null;
  tenthPercentage?: string | null;
  twelfthSchool?: string | null;
  twelfthPercentage?: string | null;
  collegeName?: string | null;
  cgpa?: string | null;
  collegeJoiningYear?: number | null;
  collegeGraduationYear?: number | null;
  major?: string | null;
  minor?: string | null;
  previousWorkMode?: string | null;
  preferredWorkMode?: string | null;
  education?: Education[];
  projects?: Project[];
  experiences?: Experience[];
  skills?: ProfileSkill[];
}

export interface Skill {
  id: string;
  name: string;
}

export interface ProfileSkill {
  profileId: string;
  skillId: string;
  skill: Skill;
}

export interface Education {
  id: string;
  profileId: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startYear: number;
  endYear?: number | null;
  grade?: string | null;
  minor?: string | null;
}

export interface Project {
  id: string;
  profileId: string;
  title: string;
  description?: string | null;
  technologies: string[];
  githubUrl?: string | null;
  liveUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Experience {
  id: string;
  profileId: string;
  company: string;
  role: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  currentlyWorking: boolean;
  duration?: string | null;
}

// ============================================================
// RESUME
// ============================================================

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  originalName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  isActive: boolean;
  uploadedAt: string;
}

// ============================================================
// APPLICATIONS
// ============================================================

export type ApplicationType = 'INTERNSHIP' | 'JOB' | 'HACKATHON' | 'OTHER';

export type ApplicationStatus =
  | 'SAVED'
  | 'INITIATED'
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface Application {
  id: string;
  userId: string;
  companyName: string;
  position: string;
  applicationType: ApplicationType;
  applicationUrl?: string | null;
  status: ApplicationStatus;
  appliedDate?: string | null;
  deadline?: string | null;
  notes?: string | null;
  githubUrl?: string | null;
  codolioUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// DASHBOARD
// ============================================================

export interface StudentDashboard {
  user: Pick<User, 'id' | 'name' | 'email'>;
  stats: {
    total: number;
    active: number;
    interviews: number;
    selected: number;
    hackathons: number;
  };
  recentApplications: Application[];
  upcomingDeadlines: Application[];
  profileCompletion: number;
}

// ============================================================
// API RESPONSE
// ============================================================

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

// ============================================================
// AI CHAT
// ============================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}
