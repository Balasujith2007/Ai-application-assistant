'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ExtendedApplication,
  Interview,
  Task,
  Opportunity,
  StudentProfile,
  ActivityItem,
  ApplicationStatus,
} from '@/types/placement';
import * as api from '@/lib/placementApi';

interface PlacementContextType {
  studentProfile: StudentProfile;
  applications: ExtendedApplication[];
  interviews: Interview[];
  tasks: Task[];
  opportunities: Opportunity[];
  activities: ActivityItem[];
  isLoading: boolean;

  // Application actions
  addApplication: (app: Partial<ExtendedApplication>) => Promise<void>;
  updateApplication: (id: string, app: Partial<ExtendedApplication>) => Promise<void>;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  addNoteToApplication: (id: string, note: string) => Promise<void>;

  // Interview actions
  scheduleInterview: (interview: Partial<Interview>) => Promise<void>;
  updateInterview: (id: string, interview: Partial<Interview>) => Promise<void>;
  deleteInterview: (id: string) => Promise<void>;

  // Task actions
  addTask: (task: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Opportunity actions
  applyToOpportunity: (opp: Opportunity) => Promise<void>;

  // Stats calculation
  stats: {
    totalApplications: number;
    activeApplications: number;
    interviewsCount: number;
    offersCount: number;
    rejectedCount: number;
    upcomingInterviewsCount: number;
    completedInterviewsCount: number;
    interviewsThisWeekCount: number;
    todaysTasksCount: number;
    upcomingTasksCount: number;
    overdueTasksCount: number;
    completedTasksCount: number;
    profileCompletionPct: number;
    resumeScorePct: number;
  };
}

const INITIAL_PROFILE: StudentProfile = {
  name: 'Student',
  email: 'student@example.com',
  cgpa: 0,
  skills: [],
  department: '',
  year: 0,
  college: '',
};

const PlacementContext = createContext<PlacementContextType | undefined>(undefined);

export function PlacementProvider({ children }: { children: React.ReactNode }) {
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(INITIAL_PROFILE);
  const [applications, setApplications] = useState<ExtendedApplication[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<any>({});

  const fetchData = async () => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [
        dashboardData,
        appsData,
        tasksData,
        interviewsData,
        oppsData
      ] = await Promise.all([
        api.getDashboardStats(),
        api.getApplications(),
        api.getTasks(),
        api.getInterviews(),
        api.getRecommendedOpportunities()
      ]);

      setDashboardStats(dashboardData);
      setApplications(appsData);
      setTasks(tasksData);
      setInterviews(interviewsData);
      setOpportunities(oppsData);
      setActivities(dashboardData?.activities || []); // Activity feed if returned by dashboard
    } catch (error) {
      console.error('Failed to fetch placement data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshDashboard = async () => {
    try {
      const dashboardData = await api.getDashboardStats();
      setDashboardStats(dashboardData.data || dashboardData);
    } catch (e) {}
  };

  const addApplication = async (app: Partial<ExtendedApplication>) => {
    try {
      const newApp = await api.createApplication(app);
      setApplications((prev) => [newApp as any, ...prev]);
      refreshDashboard();
    } catch (e) { console.error(e); }
  };

  const updateApplication = async (id: string, appData: Partial<ExtendedApplication>) => {
    try {
      const updated = await api.updateApplication(id, appData);
      setApplications((prev) => prev.map((a) => (a.id === id ? (updated as any) : a)));
      refreshDashboard();
    } catch (e) { console.error(e); }
  };

  const updateApplicationStatus = async (id: string, status: ApplicationStatus) => {
    return updateApplication(id, { status } as any);
  };

  const deleteApplication = async (id: string) => {
    try {
      await api.deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      refreshDashboard();
    } catch (e) { console.error(e); }
  };

  const addNoteToApplication = async (id: string, note: string) => {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    const existingNotes = app.notes ? `${app.notes}\n` : '';
    const newNotes = `${existingNotes}[${new Date().toLocaleDateString()}] ${note}`;
    return updateApplication(id, { notes: newNotes } as any);
  };

  const scheduleInterview = async (interviewData: Partial<Interview>) => {
    try {
      const newInt = await api.createInterview(interviewData);
      setInterviews((prev) => [newInt as any, ...prev]);
      refreshDashboard();
    } catch (e) { console.error(e); }
  };

  const updateInterview = async (id: string, data: Partial<Interview>) => {
    try {
      const updated = await api.updateInterview(id, data);
      setInterviews((prev) => prev.map((i) => (i.id === id ? (updated as any) : i)));
    } catch (e) { console.error(e); }
  };

  const deleteInterview = async (id: string) => {
    try {
      await api.deleteInterview(id);
      setInterviews((prev) => prev.filter((i) => i.id !== id));
      refreshDashboard();
    } catch (e) { console.error(e); }
  };

  const addTask = async (taskData: Partial<Task>) => {
    try {
      const newTask = await api.createTask(taskData);
      setTasks((prev) => [newTask as any, ...prev]);
      refreshDashboard();
    } catch (e) { console.error(e); }
  };

  const toggleTask = async (id: string) => {
    try {
      const updated = await api.toggleTaskComplete(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? (updated as any) : t)));
    } catch (e) { console.error(e); }
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    try {
      const updated = await api.updateTask(id, data);
      setTasks((prev) => prev.map((t) => (t.id === id ? (updated as any) : t)));
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      refreshDashboard();
    } catch (e) { console.error(e); }
  };

  const applyToOpportunity = async (opp: Opportunity) => {
    const existing = applications.find(
      (a) => a.companyName?.toLowerCase() === opp.companyName.toLowerCase()
    );
    if (existing) return;

    await addApplication({
      companyName: opp.companyName,
      position: opp.role,
      location: opp.location || '',
      salary: opp.package || '',
      applicationType: opp.type as any,
      status: 'APPLIED',
      appliedDate: new Date().toISOString(),
      notes: `Applied via Placement Portal`,
      description: opp.description,
    });
  };

  // Stats calculation fallback (uses dashboardStats if available)
  const dStats = dashboardStats?.stats || {};
  
  const totalApplications = dStats.total || applications.length;
  const activeApplications = dStats.active || applications.filter(
    (a) => a.status === 'APPLIED' || a.status === 'SHORTLISTED' || a.status === 'INTERVIEW'
  ).length;
  const interviewsCount = dStats.interviews || applications.filter((a) => a.status === 'INTERVIEW').length;
  const offersCount = dStats.selected || applications.filter((a) => a.status === 'SELECTED').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;

  const upcomingInterviewsCount = interviews.filter((i) => !i.result || i.result === 'Pending').length;
  const completedInterviewsCount = interviews.filter((i) => i.result && i.result !== 'Pending').length;
  const interviewsThisWeekCount = upcomingInterviewsCount;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasksCount = tasks.filter((t) => t.dueDate?.startsWith(todayStr) && !t.completed).length;
  const upcomingTasksCount = tasks.filter((t) => !t.completed && !t.dueDate?.startsWith(todayStr)).length;
  const overdueTasksCount = 0;
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  const stats = {
    totalApplications,
    activeApplications,
    interviewsCount,
    offersCount,
    rejectedCount,
    upcomingInterviewsCount,
    completedInterviewsCount,
    interviewsThisWeekCount,
    todaysTasksCount,
    upcomingTasksCount,
    overdueTasksCount,
    completedTasksCount,
    profileCompletionPct: dashboardStats?.profileCompletion || 0,
    resumeScorePct: dashboardStats?.resumeScore || 0,
  };

  return (
    <PlacementContext.Provider
      value={{
        studentProfile: dashboardStats?.user || studentProfile,
        applications,
        interviews,
        tasks,
        opportunities,
        activities,
        isLoading,
        addApplication,
        updateApplication,
        updateApplicationStatus,
        deleteApplication,
        addNoteToApplication,
        scheduleInterview,
        updateInterview,
        deleteInterview,
        addTask,
        toggleTask,
        updateTask,
        deleteTask,
        applyToOpportunity,
        stats,
      }}
    >
      {children}
    </PlacementContext.Provider>
  );
}

export function usePlacement() {
  const context = useContext(PlacementContext);
  if (!context) {
    throw new Error('usePlacement must be used within a PlacementProvider');
  }
  return context;
}
