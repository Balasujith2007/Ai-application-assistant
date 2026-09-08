'use client';

import { Zap, Check, Bot, Clock, Sparkles } from 'lucide-react';

export default function ProductPreview() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
      <div className="relative mx-auto max-w-5xl">
        {/* Floating Card 1: Resume Ready */}
        <div className="hidden lg:flex absolute -left-6 top-16 z-20 items-center gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl shadow-slate-200/60 backdrop-blur-md">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Resume Ready</p>
            <p className="text-[11px] text-slate-500">
              ATS Match Score: <span className="font-semibold text-emerald-600">94%</span>
            </p>
          </div>
        </div>

        {/* Floating Card 2: Application Submitted */}
        <div className="hidden lg:flex absolute -right-6 top-24 z-20 items-center gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl shadow-slate-200/60 backdrop-blur-md">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kit-50 text-kit-600">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Application Submitted</p>
            <p className="text-[11px] text-slate-500">Google • SWE Intern 2026</p>
          </div>
        </div>

        {/* Floating Card 3: AI Career Insight */}
        <div className="hidden lg:flex absolute -left-6 bottom-16 z-20 items-center gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl shadow-slate-200/60 backdrop-blur-md">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">AI Career Insight</p>
            <p className="text-[11px] text-slate-500">3 Target skills matched for Cloud roles</p>
          </div>
        </div>

        {/* Floating Card 4: Interview Upcoming */}
        <div className="hidden lg:flex absolute -right-6 bottom-12 z-20 items-center gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl shadow-slate-200/60 backdrop-blur-md">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Interview Upcoming</p>
            <p className="text-[11px] text-slate-500">Technical Round • Tomorrow, 10:30 AM</p>
          </div>
        </div>

        {/* Browser Window Mockup */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 overflow-hidden">
          {/* Browser Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-1 text-xs font-medium text-slate-500 shadow-2xs max-w-sm w-full justify-center">
              <span className="text-slate-400">https://</span>
              <span className="text-slate-800 font-semibold">app.careerai.com</span>
              <span className="text-slate-400">/dashboard/student</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-600">Live Portal</span>
            </div>
          </div>

          {/* Dashboard Body */}
          <div className="flex flex-col md:flex-row bg-slate-50/60">
            {/* Sidebar */}
            <div className="hidden md:block w-52 border-r border-slate-200 bg-white p-3.5 shrink-0">
              <div className="mb-5 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 border border-slate-100">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-kit-600 text-white font-bold text-xs">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800">CareerAI Student</span>
              </div>

              <div className="space-y-1">
                {[
                  { name: 'Dashboard Overview', active: true },
                  { name: 'My Profile & Skills', active: false },
                  { name: 'Resume Manager', active: false },
                  { name: 'Applications Pipeline', active: false },
                  { name: 'Internship Drives', active: false },
                  { name: 'Hackathon Hub', active: false },
                  { name: 'AI Career Assistant', active: false },
                ].map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      item.active
                        ? 'bg-kit-50 text-kit-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.active ? 'bg-kit-600' : 'bg-slate-300'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-lg border border-kit-100 bg-kit-50/50 p-3 text-left">
                <div className="flex items-center gap-1.5 text-kit-700 font-bold text-[11px] mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>CareerAI Agent</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Ready to auto-fill campus applications safely.
                </p>
              </div>
            </div>

            {/* Main Panel */}
            <div className="flex-1 p-4 sm:p-5 text-left">
              {/* Header inside mock */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Welcome back, Arjun Sharma 👋</h4>
                  <p className="text-xs text-slate-500">B.Tech Computer Science & Engineering • 2026 Batch</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Profile Score: 88%
                  </span>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500">Total Applications</p>
                  <p className="text-lg font-bold text-slate-900">14</p>
                  <span className="text-[10px] text-emerald-600 font-semibold">↑ +3 this week</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500">Active Pipeline</p>
                  <p className="text-lg font-bold text-kit-600">6</p>
                  <span className="text-[10px] text-slate-500">4 under review</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500">Interviews</p>
                  <p className="text-lg font-bold text-amber-600">2</p>
                  <span className="text-[10px] text-amber-700 font-medium">1 scheduled tomorrow</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500">Offers Received</p>
                  <p className="text-lg font-bold text-emerald-600">1</p>
                  <span className="text-[10px] text-emerald-700 font-medium">Verified offer</span>
                </div>
              </div>

              {/* Recent Applications & AI Widget */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Recent Applications</span>
                    <span className="text-[10px] font-semibold text-kit-600 cursor-pointer hover:underline">
                      View All (14) →
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        company: 'Google',
                        role: 'SWE Intern — Summer 2026',
                        date: '2d ago',
                        status: 'Interview Scheduled',
                        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
                      },
                      {
                        company: 'Microsoft',
                        role: 'Software Development Engineer',
                        date: '4d ago',
                        status: 'Under Review',
                        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                      },
                      {
                        company: 'Razorpay',
                        role: 'Frontend Engineering Intern',
                        date: '1w ago',
                        status: 'Offer Received',
                        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      },
                    ].map((row) => (
                      <div
                        key={row.company + row.role}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5 text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-900">{row.company}</span>
                          <span className="mx-1.5 text-slate-300">•</span>
                          <span className="text-slate-600 truncate">{row.role}</span>
                        </div>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${row.badgeColor}`}
                        >
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-kit-100 bg-white p-3 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-kit-700 font-bold text-xs mb-1.5">
                      <Bot className="h-4 w-4" />
                      <span>AI Smart Guidance</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">
                      Your profile matches <strong className="text-slate-900">92%</strong> with upcoming campus hiring criteria for Fullstack & Cloud roles.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">ATS Resume Check:</span>
                    <span className="font-bold text-emerald-600">Passed (A+)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
