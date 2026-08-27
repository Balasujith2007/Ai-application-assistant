'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Loader2, Plus, Edit2, ShieldAlert, Check, X, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  profile?: {
    department?: string | null;
  } | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    department: ''
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search,
          role: roleFilter,
          status: statusFilter
        }
      });
      setUsers(res.data.data);
    } catch {
      setError('Failed to fetch users list.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'STUDENT',
      department: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.profile?.department || ''
    });
    setModalOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch('/api/super-admin/users', {
        id: user.id,
        active: !user.active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(`Successfully ${user.active ? 'deactivated' : 'activated'} ${user.name}`);
      fetchUsers();
    } catch {
      setError('Failed to update user status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      if (editingUser) {
        // Edit User
        await axios.patch('/api/super-admin/users', {
          id: editingUser.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          password: formData.password || undefined
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess(`Successfully updated user ${formData.name}`);
      } else {
        // Create User
        await axios.post('/api/super-admin/users', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess(`Successfully created user ${formData.name}`);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="mt-1 text-gray-500">Create, edit, activate, and manage all CareerAI system roles</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-kit-600 hover:bg-kit-700 text-white flex items-center gap-2 rounded-xl px-4 py-2.5">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      {/* Filter panel */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 border-gray-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full border-gray-200 focus:border-kit-600 focus:ring-kit-600 rounded-xl"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-kit-600 focus:ring-kit-600"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="MENTOR">Mentor</option>
            <option value="HOD">HOD</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-kit-600 focus:ring-kit-600"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
          <Button onClick={fetchUsers} className="border border-gray-200 hover:bg-gray-50 p-2.5 rounded-xl">
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </Card>

      {/* Users table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-12 text-gray-500 text-sm">No users matched the criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-semibold">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-semibold text-gray-900">{u.name}</td>
                    <td className="p-4 text-gray-600">{u.email}</td>
                    <td className="p-4">
                      <span className="inline-flex rounded-md bg-kit-50 px-2 py-1 text-xs font-semibold text-kit-700 uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{u.profile?.department || 'N/A'}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer ${
                          u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {u.active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {u.active ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1 text-gray-400 hover:text-kit-600 rounded-lg hover:bg-gray-100 transition-colors inline-block mr-1"
                        title="Edit User"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-white p-6 rounded-2xl shadow-xl space-y-4 border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-gray-900">{editingUser ? 'Edit User Profile' : 'Add New System User'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Balasujith S"
                  className="rounded-xl border-gray-200 focus:border-kit-600 focus:ring-kit-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. balasu@student.careerai.edu"
                  className="rounded-xl border-gray-200 focus:border-kit-600 focus:ring-kit-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser && '(leave blank to keep unchanged)'}
                </label>
                <Input
                  required={!editingUser}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="********"
                  className="rounded-xl border-gray-200 focus:border-kit-600 focus:ring-kit-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-kit-600 focus:ring-kit-600"
                >
                  <option value="STUDENT">Student</option>
                  <option value="MENTOR">Mentor</option>
                  <option value="HOD">HOD</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Artificial Intelligence & Data Science"
                  className="rounded-xl border-gray-200 focus:border-kit-600 focus:ring-kit-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button type="button" onClick={() => setModalOpen(false)} className="border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-4 py-2 text-sm font-semibold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-kit-600 hover:bg-kit-700 text-white rounded-xl px-4 py-2 text-sm font-semibold">
                  {editingUser ? 'Save Changes' : 'Create User'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
