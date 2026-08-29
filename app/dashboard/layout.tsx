'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
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
  ShieldCheck,
  Activity,
  Sparkles,
  Trophy,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';
import { getDashboardRoute } from '@/lib/auth';

import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mainLinks, setMainLinks] = useState<any[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const closeProfile = useCallback(() => setProfileOpen(false), []);

  useEffect(() => {
    if (!profileOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        closeProfile();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProfile();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileOpen, closeProfile]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    const fetchSidebar = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/sidebar', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMainLinks(res.data.data);
      } catch (err) {
        console.error('Failed to load dynamic layout sidebar', err);
      }
    };
    fetchSidebar();
  }, [user]);

  // Client-side route protection
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || mainLinks.length === 0) return;

    // Super Admin bypasses client route guards
    if (user.role === 'SUPER_ADMIN') return;

    const currentPath = pathname;

    const allowedSubpaths = [
      '/dashboard/settings',
      '/dashboard/notifications',
      '/profile',
      '/resume'
    ];

    const isAllowed =
      allowedSubpaths.some(p => currentPath.startsWith(p)) ||
      mainLinks.some(link => currentPath.startsWith(link.path.split('?')[0]));

    if (currentPath.startsWith('/dashboard/') && !isAllowed) {
      router.replace(getDashboardRoute(user.role));
    }
  }, [pathname, mainLinks, user, isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-kit-600 border-t-transparent" />
      </div>
    );
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
            <img src="/kit-logo.png" alt="KIT Logo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">CareerAI</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-900">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          <div className="space-y-1 mb-8">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Main Menu</p>
            {mainLinks
              .filter((link) => link.title !== 'Notifications' && link.title !== 'Settings' && link.path !== '/dashboard/notifications' && link.path !== '/dashboard/settings')
              .map((link) => {
              const isActive = pathname === link.path;
              const LinkIcon = ICON_MAP[link.title] || FileText;
              return (
                <Link
                  key={link.title}
                  href={link.path}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-kit-100 text-kit-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <LinkIcon className={`h-5 w-5 shrink-0 ${isActive ? 'text-kit-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {link.title}
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
                      ? 'bg-kit-100 text-kit-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <link.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-kit-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
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

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  id="header-profile-menu-button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-x-3 rounded-xl p-1.5 hover:bg-gray-100/80 active:bg-gray-200/70 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kit-500 group"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  <div className={`h-8 w-8 rounded-full bg-kit-100 flex items-center justify-center text-kit-700 font-bold text-sm ring-2 transition-all ${profileOpen ? 'ring-kit-500' : 'ring-transparent group-hover:ring-kit-300'}`}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="hidden lg:flex lg:flex-col lg:items-start lg:justify-center text-left">
                    <span className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-kit-700 transition-colors">{user?.name}</span>
                    <span className="text-xs font-medium text-gray-500 capitalize leading-tight mt-0.5">
                      {user?.role ? user.role.toLowerCase().replace(/_/g, ' ') : 'student'}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 hidden lg:block ${
                      profileOpen ? 'rotate-180 text-kit-600' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {profileOpen && (
                  <div
                    role="menu"
                    aria-labelledby="header-profile-menu-button"
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden"
                    style={{
                      animation: 'profileDropdownIn 0.15s cubic-bezier(0.22, 1, 0.36, 1) both',
                    }}
                  >
                    {/* User Header */}
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-kit-50 via-white to-white border-b border-gray-100">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-kit-100 flex items-center justify-center text-kit-700 font-bold text-sm">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate leading-tight">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5 leading-tight">{user?.email}</p>
                        <span className="inline-block mt-1 rounded-md bg-kit-100 px-1.5 py-0.5 text-[10px] font-bold text-kit-700 border border-kit-200 uppercase tracking-wider leading-none">
                          {user?.role ? user.role.replace(/_/g, ' ') : 'STUDENT'}
                        </span>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div role="none" className="py-1.5">
                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={closeProfile}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-kit-50 hover:text-kit-700 transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-kit-100 group-hover:text-kit-600 transition-colors">
                          <UserIcon className="h-4 w-4" />
                        </span>
                        My Profile
                      </Link>

                      <Link
                        href="/dashboard/settings"
                        role="menuitem"
                        onClick={closeProfile}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-kit-50 hover:text-kit-700 transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-kit-100 group-hover:text-kit-600 transition-colors">
                          <Settings className="h-4 w-4" />
                        </span>
                        Settings
                      </Link>
                    </div>

                    {/* Logout */}
                    <div role="none" className="border-t border-gray-100 py-1.5">
                      <button
                        role="menuitem"
                        onClick={() => {
                          closeProfile();
                          logout();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 group-hover:bg-red-100 transition-colors">
                          <LogOut className="h-4 w-4" />
                        </span>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
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
