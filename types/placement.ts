import { ApplicationStatus, ApplicationType } from './index';
export type { ApplicationStatus, ApplicationType };

export type ExtendedApplicationStatus = ApplicationStatus;

export interface ApplicationTimelineItem {
  stage: 'Applied' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';
  date?: string;
  completed: boolean;
  current?: boolean;
}

export interface ExtendedApplication {
  id: string;
  companyName: string;
  position: string;
  location: string;
  salary?: string;
  applicationType: ApplicationType;
  status: ExtendedApplicationStatus;
  appliedDate: string;
  deadline: string;
  nextAction?: string;
  applicationUrl?: string;
  resumeVersion?: string;
  notes?: string;
  githubUrl?: string;
  codolioUrl?: string;
  description?: string;
  timeline: ApplicationTimelineItem[];
  createdAt: string;
  updatedAt: string;
}

export type InterviewRound =
  | 'Aptitude'
  | 'Coding Round'
  | 'Technical Interview'
  | 'HR Interview'
  | 'Group Discussion'
  | 'Managerial Round'
  | 'Final Round';

export type InterviewType = 'Online Interview' | 'In-Person Interview' | 'Telephonic';

export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled';
export type InterviewResult = 'Selected' | 'Rejected' | 'Pending';

export interface Interview {
  id: string;
  companyName: string;
  position: string;
  round: InterviewRound;
  date: string;
  time: string;
  duration: string;
  type: InterviewType;
  meetingLink?: string;
  interviewer?: string;
  notes?: string;
  prepTopics: string[];
  feedback?: string;
  performanceScore?: number; // e.g. 9.5 out of 10
  status: InterviewStatus;
  result: InterviewResult;
  applicationId?: string;
}

export type TaskCategory =
  | 'Resume'
  | 'Applications'
  | 'Interviews'
  | 'Skill Development'
  | 'Hackathons'
  | 'Mentor'
  | 'Documents';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  dueDate: string;
  priority: TaskPriority;
  completed: boolean;
  reminder?: string;
  relatedAppId?: string;
  relatedInterviewId?: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  companyName: string;
  role: string;
  location: string;
  package: string;
  minCgpa: number;
  requiredSkills: string[];
  matchScore: number;
  matchReasons: string[];
  missingSkills: string[];
  deadline: string;
  eligible: boolean;
  type: ApplicationType;
  description?: string;
}

export interface StudentProfile {
  name: string;
  email: string;
  cgpa: number;
  skills: string[];
  department: string;
  year: number;
  college: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'interview' | 'application' | 'task' | 'hackathon' | 'resume';
}
