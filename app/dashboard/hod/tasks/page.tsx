'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { CheckSquare, Plus, Loader2, Calendar, UserCheck } from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: string;
  deadline: string | null;
  createdAt: string;
  user: {
    name: string;
    role: string;
  };
}

export default function HODTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetRole, setTargetRole] = useState('STUDENTS');
  const [priority, setPriority] = useState('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data.data);
      setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to load HOD tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/hod/tasks',
        { title, targetRole, priority, deadline },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast('Task created and assigned successfully!');
      setTitle('');
      setModalOpen(false);
      fetchTasks();
    } catch {
      setToast('Failed to create task.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {toast}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-kit-600" /> Department Tasks & Actions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Assign preparation deadlines, action items, and task tracking for the department</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-kit-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Department Task
        </button>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-400">Total Department Tasks</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Completed Tasks</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.completed}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-amber-600">Pending Tasks</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Task Title</th>
                  <th className="px-6 py-4 text-left font-semibold">Assigned To</th>
                  <th className="px-6 py-4 text-left font-semibold">Priority</th>
                  <th className="px-6 py-4 text-left font-semibold">Deadline</th>
                  <th className="px-6 py-4 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{task.title}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{task.user.name} ({task.user.role})</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          task.isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {task.isCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Create Department Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Task Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Upload Updated Resume by Friday"
                  className="w-full rounded-xl border border-gray-200 p-2.5 focus:border-kit-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Assign Target</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 focus:border-kit-500 focus:outline-none"
                >
                  <option value="STUDENTS">All Students</option>
                  <option value="MENTORS">All Mentors</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 focus:border-kit-500 focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 focus:border-kit-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-kit-600 py-2.5 font-semibold text-white hover:bg-kit-700 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
