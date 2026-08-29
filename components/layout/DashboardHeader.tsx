'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Menu, X, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/index';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const closeProfile = useCallback(() => setProfileOpen(false), []);

  // Outside click + Escape — only active while dropdown is open (mirrors NotificationDropdown pattern)
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

  // Derive a clean role label, e.g. "SUPER_ADMIN" → "Super Admin"
  const roleLabel = user?.role
    ? user.role
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  return (
    <>
      {/* Mobile sidebar drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 z-50">
            <Sidebar />
          </div>
          <button
            className="absolute right-4 top-4 z-50 rounded-full bg-white p-2 text-gray-500 shadow"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 z-30 relative">
        {/* Left — mobile burger + page title */}
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs text-gray-500 hidden sm:block leading-tight">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right — search, notifications, profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search — hidden on mobile */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              className="w-52 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-600 placeholder-gray-400 focus:border-kit-400 focus:outline-none focus:ring-1 focus:ring-kit-400"
            />
          </div>

          {/* Notifications bell */}
          <NotificationDropdown />

          {/* ── Profile dropdown ── */}
          {user && (
            <div className="relative" ref={profileRef}>
              {/* Trigger button */}
              <button
                id="profile-menu-button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kit-400"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-controls="profile-menu"
              >
                <Avatar
                  name={user.name}
                  size="sm"
                  className={`ring-2 transition-all ${profileOpen ? 'ring-kit-500' : 'ring-transparent hover:ring-kit-300'}`}
                />
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-sm font-semibold text-gray-800">{user.name}</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{roleLabel}</span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 hidden sm:block ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown panel */}
              {profileOpen && (
                <div
                  id="profile-menu"
                  role="menu"
                  aria-labelledby="profile-menu-button"
                  className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden"
                  style={{
                    animation: 'profileDropIn 0.15s cubic-bezier(0.22,1,0.36,1) both',
                  }}
                >
                  {/* ── User info banner ── */}
                  <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-kit-50 via-white to-white border-b border-gray-100">
                    <Avatar name={user.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">
                        {user.email}
                      </p>
                      <span className="inline-block mt-1 rounded-md bg-kit-100 px-1.5 py-0.5 text-[10px] font-semibold text-kit-700 border border-kit-200 leading-none">
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  {/* ── Menu items ── */}
                  <div role="none" className="py-1.5">
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={closeProfile}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-kit-50 hover:text-kit-700 transition-colors group"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-kit-100 transition-colors">
                        <User className="h-3.5 w-3.5 text-gray-500 group-hover:text-kit-600" />
                      </span>
                      My Profile
                    </Link>

                    <Link
                      href="/dashboard/settings"
                      role="menuitem"
                      onClick={closeProfile}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-kit-50 hover:text-kit-700 transition-colors group"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-kit-100 transition-colors">
                        <Settings className="h-3.5 w-3.5 text-gray-500 group-hover:text-kit-600" />
                      </span>
                      Settings
                    </Link>
                  </div>

                  {/* ── Logout ── */}
                  <div role="none" className="border-t border-gray-100 py-1.5">
                    <button
                      role="menuitem"
                      onClick={() => {
                        closeProfile();
                        logout(); // clears localStorage token + user, redirects to /login
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors group"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors">
                        <LogOut className="h-3.5 w-3.5 text-red-500" />
                      </span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Keyframe for dropdown entrance animation */}
      <style>{`
        @keyframes profileDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </>
  );
}
