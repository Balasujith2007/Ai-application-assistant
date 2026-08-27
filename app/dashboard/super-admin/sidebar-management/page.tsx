'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Loader2, Save, MoveUp, MoveDown, Check, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface SidebarItem {
  id: string;
  title: string;
  path: string;
  order: number;
  enabled: boolean;
}

export default function SidebarManagementPage() {
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSidebarItems = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/sidebar-management', {
        headers: { Authorization: `Bearer ${token}` },
        params: { role: selectedRole }
      });
      setItems(res.data.data);
    } catch {
      setError('Failed to fetch sidebar configuration.');
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchSidebarItems();
  }, [fetchSidebarItems]);

  const handleToggleEnable = (index: number) => {
    const updated = [...items];
    updated[index].enabled = !updated[index].enabled;
    setItems(updated);
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (sourceIndex === targetIndex) return;

    const list = [...items];
    const [moved] = list.splice(sourceIndex, 1);
    list.splice(targetIndex, 0, moved);

    // Re-assign orders
    const reordered = list.map((item, idx) => ({
      ...item,
      order: idx
    }));

    setItems(reordered);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const list = [...items];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;

    const reordered = list.map((item, idx) => ({
      ...item,
      order: idx
    }));
    setItems(reordered);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const list = [...items];
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;

    const reordered = list.map((item, idx) => ({
      ...item,
      order: idx
    }));
    setItems(reordered);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/super-admin/sidebar-management', {
        role: selectedRole,
        items
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Sidebar layout updated successfully.');
    } catch {
      setError('Failed to save sidebar layout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sidebar Menu Builder</h1>
          <p className="mt-1 text-gray-500">Arrange link ordering and toggle visibility of sidebar sections dynamically</p>
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
            Save Sidebar Layout
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      {/* Main Panel */}
      <Card className="border-gray-200 shadow-sm p-6 max-w-3xl space-y-4">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Drag and drop rows or use arrow buttons to sort</p>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center py-12 text-gray-500 text-sm">No sidebar items configured.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.title}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, idx)}
                className={`flex items-center justify-between border rounded-xl p-3 bg-white hover:bg-gray-50/50 transition-colors shadow-sm cursor-grab active:cursor-grabbing ${
                  item.enabled ? 'border-gray-200' : 'border-gray-150 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.path}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Arrow Buttons */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MoveUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === items.length - 1}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MoveDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() => handleToggleEnable(idx)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                      item.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {item.enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {item.enabled ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
