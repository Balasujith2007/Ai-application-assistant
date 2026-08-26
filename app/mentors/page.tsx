'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  BarChart,
  FileCheck,
  Video,
  Compass,
  ClipboardList,
  Bell,
  MessageSquare,
  PieChart,
  FileSpreadsheet,
  Bot,
  ArrowRight,
  Check,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

// --- DATA ---

const STATS = [
  { value: '1,200+', label: 'Students Guided' },
  { value: '5,000+', label: 'Resumes Reviewed' },
  { value: '3,000+', label: 'Mock Interviews' },
  { value: '98%', label: 'Placement Rate' },
];

const CATEGORIES = [
  {
    id: 'student-management',
    title: 'Student Management',
    description: 'Manage and monitor all your assigned students efficiently.',
    badge: 'Admin',
    cards: [
      {
        title: 'Student Management',
        icon: Users,
        color: 'indigo',
        description: 'Manage assigned students efficiently.',
        features: ['Assigned Students', 'Student Search', 'Batch Management', 'Student Overview'],
        totalFeatures: 5,
      },
      {
        title: 'Progress Monitoring',
        icon: BarChart,
        color: 'blue',
        description: 'Track every student\'s career progress.',
        features: ['Profile Completion', 'Resume Completion', 'Internship Progress', 'Hackathon Participation'],
        totalFeatures: 5,
      },
      {
        title: 'Resume Review',
        icon: FileCheck,
        color: 'emerald',
        description: 'Review and improve resumes.',
        features: ['Resume Submission', 'Feedback Comments', 'Resume Rating', 'Revision Requests'],
        totalFeatures: 5,
      },
    ],
  },
  {
    id: 'guidance',
    title: 'Mentoring & Guidance',
    description: 'Provide personalized guidance, conduct interviews, and assign tasks.',
    badge: 'Mentorship',
    cards: [
      {
        title: 'Mock Interview Management',
        icon: Video,
        color: 'orange',
        description: 'Conduct interviews and evaluate performance.',
        features: ['Schedule Interview', 'Online Interview', 'Interview Notes', 'Performance Score'],
        totalFeatures: 5,
      },
      {
        title: 'Student Guidance',
        icon: Compass,
        color: 'purple',
        description: 'Help students personally.',
        features: ['One-to-One Mentoring', 'Career Roadmap', 'Learning Resources', 'Skill Suggestions'],
        totalFeatures: 5,
      },
      {
        title: 'Task & Assignment',
        icon: ClipboardList,
        color: 'rose',
        description: 'Assign tasks to students.',
        features: ['Create Task', 'Deadline Tracking', 'Submission Portal', 'Completion Tracking'],
        totalFeatures: 5,
      },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    description: 'Stay connected with your students and receive timely updates.',
    badge: 'Engagement',
    cards: [
      {
        title: 'Notifications',
        icon: Bell,
        color: 'cyan',
        description: 'Stay updated on student actions.',
        features: ['Student Submission', 'Interview Reminder', 'Resume Uploaded', 'Assignment Completed'],
        totalFeatures: 5,
      },
      {
        title: 'Communication Center',
        icon: MessageSquare,
        color: 'yellow',
        description: 'Communicate easily with batches and individuals.',
        features: ['Live Chat', 'Email Students', 'Announcements', 'File Sharing'],
        totalFeatures: 5,
      },
    ],
  },
];

// Map colors to tailwind classes
const COLOR_MAP: Record<string, { bg: string; text: string; borderHover: string }> = {
  indigo: { bg: 'bg-kit-50', text: 'text-kit-600', borderHover: 'hover:border-kit-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', borderHover: 'hover:border-blue-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', borderHover: 'hover:border-emerald-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', borderHover: 'hover:border-orange-500' },
  purple: { bg: 'bg-kit-50', text: 'text-kit-600', borderHover: 'hover:border-kit-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', borderHover: 'hover:border-rose-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', borderHover: 'hover:border-cyan-500' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', borderHover: 'hover:border-yellow-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', borderHover: 'hover:border-pink-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', borderHover: 'hover:border-teal-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', borderHover: 'hover:border-violet-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', borderHover: 'hover:border-sky-500' },
  lime: { bg: 'bg-lime-50', text: 'text-lime-600', borderHover: 'hover:border-lime-500' },
};

// --- COMPONENTS ---

export default function MentorsPage() {
  return (
    <div className="min-h-screen bg-white font-[var(--font-inter)] selection:bg-kit-100 selection:text-kit-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/kit-logo.png" alt="KIT Logo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">CareerAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-all hover:shadow-md">
              Start Mentoring
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Everything Mentors Need for <br className="hidden sm:block" />
              <span className="text-kit-600">Student Success</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-500 max-w-2xl mx-auto">
              Manage your assigned students, track their progress, review resumes, and conduct mock interviews—all in one intelligent platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Statistics Band */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-32">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 p-6 text-center transition-all hover:shadow-lg hover:border-gray-200"
            >
              <span className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{stat.value}</span>
              <span className="mt-2 text-sm font-medium text-gray-500">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Grouped Feature Categories */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 space-y-32 mb-32">
        {CATEGORIES.map((category, catIdx) => (
          <div key={category.id} className="relative">
            {/* Category Header */}
            <div className="mb-12 max-w-2xl">
              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4">
                {category.badge}
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
                {category.title}
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                {category.description}
              </p>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.cards.map((card, idx) => {
                const color = COLOR_MAP[card.color];
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    whileHover={{ y: -8 }}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl ${color.borderHover}`}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${color.bg} ${color.text}`}>
                        <card.icon className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {category.title}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                          {card.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-6 flex-1">
                      {card.description}
                    </p>

                    {/* Features List */}
                    <div className="mb-8">
                      <ul className="space-y-2.5">
                        {card.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-3 text-sm text-gray-600">
                            <Check className={`h-4 w-4 shrink-0 opacity-70 ${color.text}`} strokeWidth={2.5} />
                            <span className="font-medium">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {card.totalFeatures > card.features.length && (
                        <div className="mt-3 pl-7">
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500">
                            +{card.totalFeatures - card.features.length} More Features
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Button */}
                    <div className="mt-auto pt-6 border-t border-gray-100">
                      <button className="group/btn relative flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-kit-600 hover:bg-kit-600 hover:text-white">
                        <span>Learn More</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Premium Insights Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-32">
        <div className="mb-12 max-w-2xl">
          <span className="inline-block rounded-full bg-kit-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-kit-600 mb-4">
            INSIGHTS & AI
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
            Accelerate Mentoring with AI
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Gain deep mentor insights, generate comprehensive reports, and leverage AI to scale your guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Analytics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -8 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-pink-500"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 bg-pink-50 text-pink-600">
                <PieChart className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ANALYTICS</span>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">Analytics Dashboard</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6 flex-1">Mentor insights and visual charts.</p>
            <div className="mb-8">
              <ul className="space-y-2.5">
                {['Total/Active Students', 'Pending/Completed Reviews', 'Upcoming Interviews', 'Placement Ready Students'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 shrink-0 opacity-70 text-pink-600" strokeWidth={2.5} />
                    <span className="font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pl-7">
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500">
                  +2 More Analytics
                </span>
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <button className="group/btn relative flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-kit-600 hover:bg-kit-600 hover:text-white">
                <span>Learn More</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </motion.div>

          {/* Card 2: Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileHover={{ y: -8 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-teal-500"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 bg-teal-50 text-teal-600">
                <FileSpreadsheet className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">REPORTS</span>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">Reports</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6 flex-1">Generate comprehensive reports for administration.</p>
            <div className="mb-8">
              <ul className="space-y-2.5">
                {['Student Report', 'Progress Report', 'Placement Report', 'Export PDF / Excel'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 shrink-0 opacity-70 text-teal-600" strokeWidth={2.5} />
                    <span className="font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pl-7">
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500">
                  +1 More Feature
                </span>
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <button className="group/btn relative flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-kit-600 hover:bg-kit-600 hover:text-white">
                <span>Learn More</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </motion.div>

          {/* Card 3: AI Mentor Assistant */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ y: -8 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-sky-500 hover:shadow-sky-100"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 bg-sky-50 text-sky-600">
                <Bot className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">AI POWERED</span>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">AI Mentor Assistant</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6 flex-1">Scale your mentoring capabilities with artificial intelligence.</p>
            <div className="mb-8">
              <ul className="space-y-2.5">
                {['AI Resume Reviewer', 'Performance Analysis', 'AI Interview Feedback', 'Skill Gap Detection'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 shrink-0 opacity-70 text-sky-600" strokeWidth={2.5} />
                    <span className="font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pl-7">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                  Phase 2
                </span>
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <button className="group/btn relative flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                <span>Explore AI</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Future AI Features Section */}
      <section className="bg-gray-50 py-32 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Coming Soon
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Next-generation AI tools designed specifically to augment human mentors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[
              { title: 'AI Resume Reviewer', desc: 'Auto-scan resumes and generate comprehensive feedback.' },
              { title: 'Performance Analysis', desc: 'Predictive analytics on student success.' },
              { title: 'Interview Feedback', desc: 'Transcribe and analyze mock interviews via AI.' },
              { title: 'Skill Gap Detection', desc: 'Automatically map student skills to job requirements.' },
              { title: 'Career Suggestions', desc: 'Personalized career tracks for each student.' },
              { title: 'Risk Prediction', desc: 'Identify students at risk of not getting placed.' },
              { title: 'Learning Recommendations', desc: 'Curated resources to bridge skill gaps.' },
              { title: 'AI Communication', desc: 'Draft personalized emails to students instantly.' },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -6 }}
                className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-kit-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kit-50 text-kit-600 transition-colors group-hover:bg-kit-600 group-hover:text-white">
                    <Bot className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <span className="inline-block rounded bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Coming Soon
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Full-Width Final CTA */}
      <section className="bg-gradient-to-br from-kit-50 via-white to-blue-50 py-32 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-[3rem] bg-white border border-kit-100 px-6 py-24 sm:px-16 lg:px-24 shadow-2xl relative overflow-hidden text-center"
          >
            {/* Subtle floating abstract shapes */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-kit-100/50 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100/50 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight">
                Ready to Empower the <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-kit-600 to-blue-500">
                  Next Generation?
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
                Manage your assigned students, review resumes, track progress, and provide guidance—all from one intelligent mentor dashboard.
              </p>
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto rounded-xl bg-kit-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-kit-200 transition-all hover:bg-kit-700 hover:scale-[1.02] active:scale-95"
                >
                  Start Mentoring Today
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-10 py-4 text-base font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300"
                >
                  Explore Dashboard
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
