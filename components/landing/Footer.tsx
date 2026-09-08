'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/90 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-5 lg:gap-12">
          {/* Brand column */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-kit-600 shadow-xs">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Career<span className="text-kit-600">AI</span>
              </span>
            </Link>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              CAREER INTELLIGENCE
            </p>
            <p className="mt-2 max-w-sm text-sm text-slate-600 leading-relaxed">
              An intelligent career and placement management platform for students, mentors, and placement departments.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>All systems operational • Enterprise ready</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              PRODUCT
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#apply-assistant" className="text-slate-600 hover:text-slate-900 transition-colors">
                  AI Apply Assistant
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: For Users */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              FOR USERS
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/students" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Students
                </Link>
              </li>
              <li>
                <Link href="/mentors" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Mentors
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Placement Cell
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Account */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              ACCOUNT
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-xs text-slate-500">
            &copy; 2026 CareerAI. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="hover:text-slate-900 transition-colors cursor-pointer">Security</span>
            <span className="hover:text-slate-900 transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-slate-900 transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-slate-900 transition-colors cursor-pointer">Contact Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
