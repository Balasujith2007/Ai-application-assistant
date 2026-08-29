'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Plus,
  Video,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePlacement } from '@/context/PlacementContext';
import { Interview } from '@/types/placement';
import { StatCard } from '@/components/placement/StatCard';
import { InterviewCard } from '@/components/placement/InterviewCard';
import { InterviewDetailModal } from '@/components/placement/InterviewDetailModal';
import { ScheduleInterviewModal } from '@/components/placement/ScheduleInterviewModal';
import { MockInterviewModal } from '@/components/placement/MockInterviewModal';
import { DeadlineAlert } from '@/components/placement/DeadlineAlert';
import { EmptyState } from '@/components/ui/index';

export default function InterviewsPage() {
  const { interviews, scheduleInterview, deleteInterview, stats, isLoading } = usePlacement();

  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const [isMockOpen, setIsMockOpen] = useState(false);
  const [mockTopic, setMockTopic] = useState('Java');
  const [mockCompany, setMockCompany] = useState('Target Company');

  const upcomingInterviews = interviews.filter((i) => i.status === 'Scheduled');
  const completedInterviews = interviews.filter((i) => i.status === 'Completed');

  const handleOpenDetails = (interview: Interview) => {
    setSelectedInterview(interview);
    setIsDetailOpen(true);
  };

  const handleStartMock = (topic: string, company?: string) => {
    setMockTopic(topic);
    if (company) setMockCompany(company);
    setIsMockOpen(true);
  };

  const prepTopicsList = [
    { title: 'Java', desc: 'OOP, Interfaces, HashMap, Multithreading' },
    { title: 'SQL', desc: 'Inner/Outer Joins, Group By, Indexes, Queries' },
    { title: 'Data Structures', desc: 'Trees, Graphs, Sorting, LinkedLists' },
    { title: 'OOP', desc: 'Abstraction, Inheritance, Polymorphism, SOLID' },
    { title: 'Problem Solving', desc: 'Dynamic Programming, Two Pointers' },
    { title: 'HR Questions', desc: 'Behavioral, Strengths, Career Goals' },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-kit-200 border-t-kit-600"></div>
          <p className="text-sm font-medium text-gray-500">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Interviews</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Prepare, schedule, and track all your placement interviews.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsScheduleOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4" />
            Schedule Interview
          </Button>
        </div>

        {/* Reminders / Deadline Intelligence Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DeadlineAlert
            type="interview_scheduled"
            message="Interview scheduled: Zoho Technical Round on Aug 12 at 10:30 AM"
            subtext="Prepare SQL joins, OOP concepts, and data structure questions."
            actionText="Join / Details"
            onAction={() => {
              const intv = interviews.find((i) => i.companyName.toLowerCase().includes('zoho'));
              if (intv) handleOpenDetails(intv);
            }}
          />

          <DeadlineAlert
            type="high_priority_task"
            message="Interview Reminder: Prepare SQL joins and OOP concepts"
            subtext="Due before Zoho technical round."
            actionText="Start Practice"
            onAction={() => handleStartMock('SQL', 'Zoho')}
          />
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Upcoming Interviews"
            value={stats.upcomingInterviewsCount}
            icon={CalendarCheck}
            color="text-kit-600"
            bg="bg-kit-50"
            index={0}
          />
          <StatCard
            label="Completed"
            value={stats.completedInterviewsCount}
            icon={CheckCircle2}
            color="text-emerald-600"
            bg="bg-emerald-50"
            index={1}
          />
          <StatCard
            label="This Week"
            value={stats.interviewsThisWeekCount}
            icon={Clock}
            color="text-blue-600"
            bg="bg-blue-50"
            index={2}
          />
          <StatCard
            label="Selected"
            value={1}
            icon={Award}
            color="text-kit-600"
            bg="bg-kit-50"
            index={3}
          />
          <StatCard
            label="Pending Feedback"
            value={2}
            icon={AlertCircle}
            color="text-amber-600"
            bg="bg-amber-50"
            index={4}
          />
        </div>

        {/* Upcoming Interviews Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Upcoming Interviews</h2>
            <span className="text-xs font-semibold text-gray-400">
              {upcomingInterviews.length} Scheduled
            </span>
          </div>

          {upcomingInterviews.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-10 w-10 text-kit-500" />}
              title="No upcoming interviews"
              description="Your scheduled interviews will appear here."
              action={
                <Button variant="primary" onClick={() => setIsScheduleOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Schedule Interview
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
              {upcomingInterviews.map((int) => (
                <InterviewCard
                  key={int.id}
                  interview={int}
                  onViewDetails={handleOpenDetails}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recommended Preparation Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-kit-600" />
                Recommended Preparation
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Practice topic-wise mock interview questions curated for campus placement drives.
              </p>
            </div>

            <Button variant="primary" onClick={() => handleStartMock('Java')} className="shadow-sm">
              <Sparkles className="h-4 w-4" />
              Start Mock Interview
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prepTopicsList.map((item) => (
              <div
                key={item.title}
                onClick={() => handleStartMock(item.title)}
                className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-all hover:border-kit-200 hover:bg-kit-50/40 hover:shadow-xs cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-gray-900 text-sm group-hover:text-kit-600 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-kit-600 transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Past / Completed Interviews History */}
        {completedInterviews.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Completed Interviews</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {completedInterviews.map((int) => (
                <InterviewCard
                  key={int.id}
                  interview={int}
                  onViewDetails={handleOpenDetails}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        <InterviewDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          interview={selectedInterview}
          onDelete={deleteInterview}
          onStartMock={(int) => handleStartMock(int.prepTopics[0] || 'Java', int.companyName)}
        />

        <ScheduleInterviewModal
          isOpen={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
          onSchedule={scheduleInterview}
        />

        <MockInterviewModal
          isOpen={isMockOpen}
          onClose={() => setIsMockOpen(false)}
          topic={mockTopic}
          companyName={mockCompany}
        />
      </div>
    );
  }
