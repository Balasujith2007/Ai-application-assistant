'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Flame,
  ListChecks,
  Filter,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { usePlacement } from '@/context/PlacementContext';
import { Task, TaskCategory, TaskPriority } from '@/types/placement';
import { StatCard } from '@/components/placement/StatCard';
import { TaskCard } from '@/components/placement/TaskCard';
import { AddTaskModal } from '@/components/placement/AddTaskModal';
import { DeadlineAlert } from '@/components/placement/DeadlineAlert';
import { EmptyState } from '@/components/ui/index';

import { useAuth } from '@/context/AuthContext';

export default function TasksPage() {
  const { user } = useAuth();
  const { tasks, addTask, toggleTask, updateTask, deleteTask, stats, isLoading } = usePlacement();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const todayStr = '2026-08-08';

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

      let matchesStatus = true;
      const isToday = t.dueDate === 'Today' || t.dueDate === todayStr;
      const isOverdue = !t.completed && !isToday && new Date(t.dueDate) < new Date(todayStr);

      if (statusFilter === 'TODAY') matchesStatus = isToday && !t.completed;
      else if (statusFilter === 'UPCOMING') matchesStatus = !t.completed && !isToday && !isOverdue;
      else if (statusFilter === 'OVERDUE') matchesStatus = isOverdue;
      else if (statusFilter === 'COMPLETED') matchesStatus = t.completed;

      const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tasks, search, statusFilter, priorityFilter, categoryFilter]);

  const handleOpenAdd = () => {
    setEditingTask(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setIsAddOpen(true);
  };

  const handleSaveTask = (data: any) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Tasks" subtitle="Loading your tasks...">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="text-sm font-medium text-gray-500">Loading tasks...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Tasks"
      subtitle="Stay organized and complete every important placement activity on time."
    >
      <div className="space-y-8 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Stay organized and complete every important placement activity on time.
            </p>
          </div>
          {user?.role !== 'STUDENT' && (
            <Button variant="primary" onClick={handleOpenAdd} className="shadow-sm">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          )}
        </div>

        {/* Deadline Intelligence Alert */}
        <DeadlineAlert
          type="high_priority_task"
          message="🔥 High priority task due today: Update Resume"
          subtext="Incorporate recent React projects before sending to TCS & Infosys."
          actionText="Mark Complete"
          onAction={() => {
            const t = tasks.find((item) => item.title.includes('Update Resume'));
            if (t) toggleTask(t.id);
          }}
        />

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Today's Tasks"
            value={stats.todaysTasksCount}
            icon={ListChecks}
            color="text-indigo-600"
            bg="bg-indigo-50"
            index={0}
          />
          <StatCard
            label="Upcoming"
            value={stats.upcomingTasksCount}
            icon={Clock}
            color="text-blue-600"
            bg="bg-blue-50"
            index={1}
          />
          <StatCard
            label="Overdue"
            value={stats.overdueTasksCount}
            icon={AlertCircle}
            color="text-rose-600"
            bg="bg-rose-50"
            index={2}
          />
          <StatCard
            label="Completed"
            value={stats.completedTasksCount}
            icon={CheckCircle2}
            color="text-emerald-600"
            bg="bg-emerald-50"
            index={3}
          />
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2 pl-9 pr-4 text-sm text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {[
                { label: 'All', value: 'ALL' },
                { label: 'Today', value: 'TODAY' },
                { label: 'Upcoming', value: 'UPCOMING' },
                { label: 'Overdue', value: 'OVERDUE' },
                { label: 'Completed', value: 'COMPLETED' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    statusFilter === tab.value
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Resume">Resume</option>
              <option value="Applications">Applications</option>
              <option value="Interviews">Interviews</option>
              <option value="Skill Development">Skill Development</option>
              <option value="Hackathons">Hackathons</option>
              <option value="Documents">Documents</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="h-10 w-10 text-indigo-500" />}
            title="No tasks found"
            description="Create your first placement task to keep your drive activities on schedule."
            action={
              <Button variant="primary" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleComplete={toggleTask}
                onEdit={handleOpenEdit}
                onDelete={deleteTask}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <AddTaskModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSave={handleSaveTask}
          initialData={editingTask}
        />
      </div>
    </DashboardLayout>
  );
}
