import api from './api';
import { 
  ExtendedApplication, 
  Interview, 
  Task, 
  Opportunity,
  ApplicationStatus,
  ApplicationType
} from '@/types/placement';

// Dashboard
export const getDashboardStats = async () => {
  const res = await api.get('/dashboard/student');
  return res.data;
};

// Applications
export const getApplications = async (filters?: { type?: ApplicationType; status?: ApplicationStatus; search?: string }) => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  
  const res = await api.get<ExtendedApplication[]>(`/applications?${params.toString()}`);
  return res.data;
};

export const createApplication = async (data: Partial<ExtendedApplication>) => {
  const res = await api.post<ExtendedApplication>('/applications', data);
  return res.data;
};

export const updateApplication = async (id: string, data: Partial<ExtendedApplication>) => {
  const res = await api.put<ExtendedApplication>(`/applications/${id}`, data);
  return res.data;
};

export const deleteApplication = async (id: string) => {
  const res = await api.delete(`/applications/${id}`);
  return res.data;
};

// Tasks
export const getTasks = async () => {
  const res = await api.get<Task[]>('/tasks');
  return res.data;
};

export const createTask = async (data: Partial<Task>) => {
  const res = await api.post<Task>('/tasks', data);
  return res.data;
};

export const updateTask = async (id: string, data: Partial<Task>) => {
  const res = await api.put<Task>(`/tasks/${id}`, data);
  return res.data;
};

export const toggleTaskComplete = async (id: string) => {
  const res = await api.patch<Task>(`/tasks/${id}/toggle`);
  return res.data;
};

export const deleteTask = async (id: string) => {
  const res = await api.delete(`/tasks/${id}`);
  return res.data;
};

// Interviews
export const getInterviews = async () => {
  const res = await api.get<Interview[]>('/interviews');
  return res.data;
};

export const createInterview = async (data: Partial<Interview>) => {
  const res = await api.post<Interview>('/interviews', data);
  return res.data;
};

export const updateInterview = async (id: string, data: Partial<Interview>) => {
  const res = await api.put<Interview>(`/interviews/${id}`, data);
  return res.data;
};

export const deleteInterview = async (id: string) => {
  const res = await api.delete(`/interviews/${id}`);
  return res.data;
};

// Opportunities
export const getRecommendedOpportunities = async () => {
  const res = await api.get<Opportunity[]>('/opportunities/recommended');
  return res.data;
};

// Notifications (Future use)
export const getNotifications = async () => {
  const res = await api.get('/notifications');
  return res.data;
};

export const markNotificationRead = async (id: string) => {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
};

// Profile link verification
export const verifyGithubProfile = async (githubUrl: string) => {
  const res = await api.post('/profile/verify-github', { githubUrl });
  return res.data;
};

export const verifyCodolioProfile = async (codolioUrl: string) => {
  const res = await api.post('/profile/verify-codolio', { codolioUrl });
  return res.data;
};
