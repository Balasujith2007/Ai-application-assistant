'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Briefcase,
  ExternalLink,
  Pencil,
  Trash2,
  Calendar,
  Building2,
  Clock,
  MapPin,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/index';
import { usePlacement } from '@/context/PlacementContext';
import { ExtendedApplication, ApplicationStatus, ApplicationType } from '@/types/placement';
import { StatCard } from '@/components/placement/StatCard';
import { ApplicationDetailModal } from '@/components/placement/ApplicationDetailModal';
import { AddApplicationModal } from '@/components/placement/AddApplicationModal';
import { DeadlineAlert } from '@/components/placement/DeadlineAlert';

import { useAuth } from '@/context/AuthContext';

export default function ApplicationsPage() {
  const { user } = useAuth();
  const {
    applications,
    addApplication,
    updateApplication,
    updateApplicationStatus,
    deleteApplication,
    addNoteToApplication,
    stats,
    isLoading,
  } = usePlacement();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline'>('newest');

  const [selectedApp, setSelectedApp] = useState<ExtendedApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ExtendedApplication | null>(null);

  // Filtered & Sorted applications
  const filteredApps = useMemo(() => {
    return applications
      .filter((app) => {
        const matchesSearch =
          app.companyName.toLowerCase().includes(search.toLowerCase()) ||
          app.position.toLowerCase().includes(search.toLowerCase()) ||
          (app.location && app.location.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
        const matchesType = typeFilter === 'ALL' || app.applicationType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          return new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime();
        }
        return new Date(b.appliedDate || '').getTime() - new Date(a.appliedDate || '').getTime();
      });
  }, [applications, search, statusFilter, typeFilter, sortBy]);

  const handleOpenDetail = (app: ExtendedApplication) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingApp(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (app: ExtendedApplication) => {
    setEditingApp(app);
    setIsAddOpen(true);
  };

  const handleSaveApp = async (data: any) => {
    if (editingApp) {
      await updateApplication(editingApp.id, data);
    } else {
      await addApplication(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-kit-200 border-t-kit-600"></div>
          <p className="text-sm font-medium text-gray-500">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Applications</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Track and manage all your internship and job applications in one place.
            </p>
          </div>
          {user?.role !== 'STUDENT' && (
            <Button variant="primary" onClick={handleOpenAdd} className="shadow-sm">
              <Plus className="h-4 w-4" />
              Add Application
            </Button>
          )}
        </div>

        {/* Deadline Alerts */}
        <DeadlineAlert
          type="application_deadline"
          message="Application deadline tomorrow for Infosys Software Engineering Intern"
          subtext="Deadline: Aug 12, 2026 • Make sure all assessment documents are submitted."
          actionText="View Application"
          onAction={() => {
            const app = applications.find((a) => a.companyName.toLowerCase().includes('infosys'));
            if (app) handleOpenDetail(app);
          }}
        />

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total Applications"
            value={stats.totalApplications}
            icon={Briefcase}
            color="text-kit-600"
            bg="bg-kit-50"
            index={0}
          />
          <StatCard
            label="Active Applications"
            value={stats.activeApplications}
            icon={TrendingUp}
            color="text-blue-600"
            bg="bg-blue-50"
            index={1}
          />
          <StatCard
            label="Interviews"
            value={stats.interviewsCount}
            icon={Calendar}
            color="text-kit-600"
            bg="bg-kit-50"
            index={2}
          />
          <StatCard
            label="Offers (Selected)"
            value={stats.offersCount}
            icon={CheckCircle2}
            color="text-emerald-600"
            bg="bg-emerald-50"
            index={3}
          />
          <StatCard
            label="Rejected"
            value={stats.rejectedCount}
            icon={XCircle}
            color="text-rose-600"
            bg="bg-rose-50"
            index={4}
          />
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search company, role, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2 pl-9 pr-4 text-sm text-gray-900 focus:border-kit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-kit-500/20"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-kit-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPLIED">Applied</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="INTERVIEW">Interview</option>
              <option value="SELECTED">Selected</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-kit-500 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="JOB">Full-time Job</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="HACKATHON">Hackathon</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 shrink-0">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'deadline')}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-kit-500 focus:outline-none"
            >
              <option value="newest">Newest Applied</option>
              <option value="deadline">Upcoming Deadline</option>
            </select>
          </div>
        </div>

        {/* Applications List / Table */}
        {filteredApps.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-10 w-10 text-kit-500" />}
            title="No applications found"
            description="Start tracking your internship and job applications."
            action={
              <Button variant="primary" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4" />
                Add Application
              </Button>
            }
          />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-4 px-6">Company</th>
                    <th className="py-4 px-4">Role</th>
                    <th className="py-4 px-4">Location</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Applied Date</th>
                    <th className="py-4 px-4">Deadline</th>
                    <th className="py-4 px-4">Next Action</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium">
                  {filteredApps.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => handleOpenDetail(app)}
                      className="group cursor-pointer transition-colors hover:bg-kit-50/30"
                    >
                      {/* Company */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kit-50 text-kit-600 font-bold text-sm">
                            {app.companyName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 group-hover:text-kit-600 transition-colors">
                              {app.companyName}
                            </span>
                            <div className="mt-0.5">
                              <TypeBadge type={app.applicationType} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4 text-gray-900 font-semibold">{app.position}</td>

                      {/* Location */}
                      <td className="py-4 px-4 text-gray-600">{app.location}</td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <StatusBadge status={app.status} />
                      </td>

                      {/* Applied Date */}
                      <td className="py-4 px-4 text-gray-600">{app.appliedDate}</td>

                      {/* Deadline */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-gray-700 font-semibold">
                          <Clock className="h-3.5 w-3.5 text-rose-500" />
                          {app.deadline}
                        </span>
                      </td>

                      {/* Next Action */}
                      <td className="py-4 px-4 max-w-[200px]">
                        {app.nextAction ? (
                          <span className="truncate block text-xs font-semibold text-kit-700 bg-kit-50 px-2.5 py-1 rounded-md">
                            {app.nextAction}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Awaiting update</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetail(app)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-kit-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(app)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-kit-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete application for ${app.companyName}?`)) {
                                deleteApplication(app.id);
                              }
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modals */}
        <ApplicationDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          application={selectedApp}
          onEdit={(app) => handleOpenEdit(app)}
          onDelete={(id) => deleteApplication(id)}
          onUpdateStatus={(id, st) => updateApplicationStatus(id, st)}
          onAddNote={(id, note) => addNoteToApplication(id, note)}
        />

        <AddApplicationModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSave={handleSaveApp}
          initialData={editingApp}
        />
      </div>
    );
  }
