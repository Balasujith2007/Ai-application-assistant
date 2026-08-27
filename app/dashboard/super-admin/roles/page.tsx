'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const RESOURCES = [
  'Dashboard',
  'Opportunities',
  'My Applications',
  'My Tasks',
  'My Resume',
  'My Progress',
  'Announcements',
  'Notifications',
  'Reports',
  'Forms',
  'User Management',
  'Roles & Permissions',
  'Sidebar Management',
  'Feature Management',
  'System Health',
  'Audit Logs',
  'Settings'
];

const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE'];

interface PermissionItem {
  resource: string;
  action: string;
  allowed: boolean;
}

export default function RolesPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/roles', {
        headers: { Authorization: `Bearer ${token}` },
        params: { role: selectedRole }
      });

      const dbData = res.data.data as Array<{ resource: string; action: string; allowed: boolean }>;
      
      // Build matrix
      const matrix: Record<string, Record<string, boolean>> = {};
      RESOURCES.forEach(r => {
        matrix[r] = {};
        ACTIONS.forEach(a => {
          matrix[r][a] = false;
        });
      });

      dbData.forEach(item => {
        if (matrix[item.resource]) {
          matrix[item.resource][item.action] = item.allowed;
        }
      });

      setPermissions(matrix);
    } catch {
      setError('Failed to fetch role permissions.');
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleCheckboxChange = (resource: string, action: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [action]: checked
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const list: PermissionItem[] = [];
      
      Object.keys(permissions).forEach(r => {
        Object.keys(permissions[r]).forEach(a => {
          list.push({
            resource: r,
            action: a,
            allowed: permissions[r][a]
          });
        });
      });

      await axios.post('/api/super-admin/roles', {
        role: selectedRole,
        permissions: list
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Permissions updated successfully.');
    } catch {
      setError('Failed to save permissions configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Roles & Permissions</h1>
          <p className="mt-1 text-gray-500">Configure access control levels for Student, Mentor, and HOD roles</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-xl border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-kit-600 focus:ring-kit-600"
          >
            <option value="STUDENT">Student</option>
            <option value="MENTOR">Mentor</option>
            <option value="HOD">HOD</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-kit-600 hover:bg-kit-700 text-white flex items-center gap-2 rounded-xl px-4 py-2.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Permissions
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      {/* Permissions Matrix */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-semibold text-center">
                  <th className="p-4 text-left min-w-[200px]">Resource / Module</th>
                  {ACTIONS.map(a => (
                    <th key={a} className="p-4">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {RESOURCES.map((r) => (
                  <tr key={r} className="hover:bg-gray-50/50">
                    <td className="p-4 font-semibold text-gray-900">{r}</td>
                    {ACTIONS.map(a => {
                      const isChecked = permissions[r]?.[a] || false;
                      return (
                        <td key={a} className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(r, a, e.target.checked)}
                            disabled={selectedRole === 'SUPER_ADMIN'}
                            className="h-4 w-4 rounded border-gray-300 text-kit-600 focus:ring-kit-600 cursor-pointer disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
