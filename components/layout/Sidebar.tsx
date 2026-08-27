'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import axios from 'axios';
import {
  LayoutDashboard,
  User,
  FileText,
  Laptop,
  Trophy,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  CheckSquare,
  Users,
  Building2,
  PieChart,
  ShieldCheck,
  Activity,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/index';

const ICON_MAP: Record<string, any> = {
  'Dashboard': LayoutDashboard,
  'Overview': LayoutDashboard,
  'My Students': Users,
  'Our Students': Users,
  'Students': Users,
  'User Management': Users,
  'Mentors': Building2,
  'Companies': Building2,
  'Student Assignment': CheckSquare,
  'Student Progress': PieChart,
  'My Progress': PieChart,
  'Analytics': PieChart,
  'Opportunities': Trophy,
  'Opportunity History': Trophy,
  'Internship / Hackathon': Trophy,
  'Resumes': FileText,
  'My Resume': FileText,
  'Resume': FileText,
  'Reports': FileText,
  'Audit Logs': FileText,
  'Tasks': CheckSquare,
  'My Tasks': CheckSquare,
  'Forms': CheckSquare,
  'Announcements': Bell,
  'Notifications': Bell,
  'Roles & Permissions': ShieldCheck,
  'Sidebar Management': Settings,
  'Feature Management': Settings,
  'Settings': Settings,
  'Auto-Fill Agent': Zap,
  'AI Features': Sparkles,
  'System Health': Activity,
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchSidebar = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/sidebar', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMenuItems(res.data.data);
      } catch (err) {
        console.error('Failed to load dynamic sidebar', err);
      }
    };
    fetchSidebar();
  }, [user]);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <img src="/kit-logo.png" alt="KIT Logo" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold text-gray-900">CareerAI</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center mx-auto">
            <img src="/kit-logo.png" alt="KIT Logo" className="h-8 w-8 object-contain" />
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors',
            collapsed && 'hidden',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {menuItems.map(({ title, path }) => {
          const Icon = ICON_MAP[title] || FileText;
          const isActive = pathname === path || pathname.startsWith(path.split('?')[0] + '/');
          return (
            <Link
              key={title}
              href={path}
              title={collapsed ? title : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-kit-100 text-kit-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                collapsed && 'justify-center',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-kit-600' : 'text-gray-400',
                )}
              />
              {!collapsed && <span>{title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t border-gray-200 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 rounded-lg p-2">
              <Avatar name={user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-gray-500 capitalize">
                  {user.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              title="Logout"
              className="mx-auto flex rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
