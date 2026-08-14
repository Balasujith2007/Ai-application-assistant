'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  CalendarDays,
  PieChart,
  Bell,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  Building2,
  CheckSquare,
  Zap,
} from 'lucide-react';

import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Determine role-based links
  let mainLinks = [];
  if (user?.role === 'STUDENT') {
    mainLinks = [
      { name: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
      { name: 'My Profile', href: '/profile', icon: Users },
      { name: 'Resume', href: '/resume', icon: FileText },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    ];
  } else if (user?.role === 'MENTOR') {
    mainLinks = [
      { name: 'Dashboard', href: '/dashboard/mentor', icon: LayoutDashboard },
      { name: 'My Students', href: '/dashboard/mentor/students', icon: Users },
      { name: 'Resumes', href: '/dashboard/mentor/resumes', icon: FileText },
      { name: 'Interviews', href: '/dashboard/mentor/interviews', icon: CalendarDays },
      { name: 'Tasks', href: '/dashboard/mentor/tasks', icon: CheckSquare },
      { name: 'Student Progress', href: '/dashboard/mentor/progress', icon: PieChart },
    ];
  } else if (user?.role === 'HOD') {
    mainLinks = [
      { name: 'Dashboard', href: '/dashboard/hod', icon: LayoutDashboard },
      { name: 'Students', href: '/dashboard/hod/students', icon: Users },
      { name: 'Mentors', href: '/dashboard/hod/mentors', icon: Building2 },
      { name: 'Student Assignment', href: '/dashboard/hod/assign-mentor', icon: CheckSquare },
      { name: 'Student Progress', href: '/dashboard/hod/progress', icon: PieChart },
      { name: 'Internship / Hackathon', href: '/dashboard/hod/placements', icon: Briefcase },
      { name: 'Resumes', href: '/dashboard/hod/resumes', icon: FileText },
      { name: 'Tasks', href: '/dashboard/hod/tasks', icon: CheckSquare },
      { name: 'Announcements', href: '/dashboard/hod/announcements', icon: Bell },
      { name: 'Reports', href: '/dashboard/hod/reports', icon: FileText },
    ];
  } else {
    // Placement cell / ADMIN
    mainLinks = [
      { name: 'Dashboard', href: '/dashboard/placement', icon: LayoutDashboard },
      { name: 'Students', href: '/dashboard/placement/students', icon: Users },
      { name: 'Companies', href: '/dashboard/placement/companies', icon: Building2 },
      { name: 'Analytics', href: '/dashboard/placement/analytics', icon: PieChart },
    ];
  }

  const commonLinks = [
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50/50 font-[var(--font-inter)]">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:static lg:flex lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">CareerAI</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-900">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          <div className="space-y-1 mb-8">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Main Menu</p>
            {mainLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <link.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="space-y-1 mt-auto">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Preferences</p>
            {commonLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <link.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {link.name}
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="w-full group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 shrink-0 text-red-500" />
              Logout
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
            <form className="flex flex-1" action="#" method="GET">
              <label htmlFor="search-field" className="sr-only">
                Search
              </label>
              <div className="relative w-full max-w-md">
                <Search
                  className="absolute inset-y-0 left-0 h-full w-5 text-gray-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="search-field"
                  className="block h-full w-full border-0 bg-transparent py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                  placeholder="Search students, companies, tasks..."
                  type="search"
                  name="search"
                />
              </div>
            </form>
            
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <NotificationDropdown />

              {/* Separator */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

              {/* Profile */}
              <div className="flex items-center gap-x-4">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:flex lg:flex-col lg:items-start lg:justify-center">
                  <span className="text-sm font-semibold text-gray-900">{user?.name}</span>
                  <span className="text-xs font-medium text-gray-500 capitalize">{user?.role.toLowerCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
