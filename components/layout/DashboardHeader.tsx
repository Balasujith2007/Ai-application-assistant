'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, Search, Menu, X } from 'lucide-react';
import { Avatar } from '@/components/ui/index';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
        {/* Mobile menu + Title */}
        <div className="flex items-center gap-4">
          <button
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-xs text-gray-500 hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-56 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-600 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600" />
          </Link>

          {/* Avatar */}
          {user && (
            <Link href="/profile">
              <Avatar name={user.name} size="sm" className="cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all" />
            </Link>
          )}
        </div>
      </header>
    </>
  );
}
