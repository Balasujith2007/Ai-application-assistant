'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/index';

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Opportunity History', href: '/dashboard/student/opportunity-history', icon: Trophy },
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'Resume', href: '/resume', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">CareerAI</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 mx-auto">
            <Zap className="h-4 w-4 text-white" />
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
        {(() => {
          let items = NAV_ITEMS;
          if (user?.role === 'MENTOR') {
            items = [
              { label: 'Dashboard', href: '/dashboard/mentor', icon: LayoutDashboard },
              { label: 'My Students', href: '/dashboard/mentor/students', icon: User },
              { label: 'Our Students', href: '/dashboard/mentor/our-students', icon: User },
              { label: 'Resumes', href: '/dashboard/mentor/resumes', icon: FileText },
              { label: 'Tasks', href: '/dashboard/mentor/tasks', icon: CheckSquare },
              { label: 'Student Progress', href: '/dashboard/mentor/progress', icon: Laptop },
              { label: 'Reports', href: '/dashboard/mentor/reports', icon: FileText },
              { label: 'Forms', href: '/dashboard/mentor/forms', icon: CheckSquare },
              { label: 'Notifications', href: '/dashboard/mentor/notifications', icon: Bell },
              { label: 'Settings', href: '/settings', icon: Settings },
            ];
          } else if (user?.role === 'HOD') {
            items = [
              { label: 'Dashboard', href: '/dashboard/hod', icon: LayoutDashboard },
              { label: 'Students', href: '/dashboard/hod/students', icon: User },
              { label: 'Mentors', href: '/dashboard/hod/mentors', icon: Laptop },
              { label: 'Student Assignment', href: '/dashboard/hod/assign-mentor', icon: CheckSquare },
              { label: 'Student Progress', href: '/dashboard/hod/progress', icon: Laptop },
              { label: 'Internship / Hackathon', href: '/dashboard/hod/placements', icon: Trophy },
              { label: 'Resumes', href: '/dashboard/hod/resumes', icon: FileText },
              { label: 'Tasks', href: '/dashboard/hod/tasks', icon: CheckSquare },
              { label: 'Announcements', href: '/dashboard/hod/announcements', icon: Bell },
              { label: 'Reports', href: '/dashboard/hod/reports', icon: FileText },
              { label: 'Forms', href: '/dashboard/hod/forms', icon: CheckSquare },
            ];
          }
          return items.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href.split('?')[0] + '/');
            return (
              <Link
                key={label}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  collapsed && 'justify-center',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive ? 'text-indigo-600' : 'text-gray-400',
                  )}
                />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          });
        })()}
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
