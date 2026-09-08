'use client';

import { UserCheck, FileText, Target, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';

interface FeatureCardData {
  id: string;
  title: string;
  badge?: string;
  desc: string;
  icon: typeof UserCheck;
  features: string[];
  safetyIndicator?: string;
  exploreLink?: string;
}

const FEATURE_CARDS: FeatureCardData[] = [
  {
    id: 'smart-profile',
    title: 'SMART PROFILE',
    desc: 'Build and manage your complete academic and professional identity from one intelligent workspace.',
    icon: UserCheck,
    features: [
      'Personal Information',
      'Education Details',
      'Skills & Competencies',
      'Projects & Portfolio',
      'Career Preferences',
    ],
    exploreLink: '/students',
  },
  {
    id: 'resume-management',
    title: 'RESUME MANAGEMENT',
    desc: 'Create, organize and manage professional resumes designed to support your career journey.',
    icon: FileText,
    features: [
      'Multiple Resume Versions',
      'Resume Storage',
      'Profile Synchronization',
      'ATS-Friendly Export',
      'Skill Highlight Formatting',
    ],
    exploreLink: '/register',
  },
  {
    id: 'opportunity-tracking',
    title: 'OPPORTUNITY TRACKING',
    desc: 'Discover and manage internships, jobs, hackathons and placement opportunities through one unified platform.',
    icon: Target,
    features: [
      'Internship Opportunities',
      'Full-Time Jobs',
      'Hackathons & Competitions',
      'Campus Recruitment Drives',
      'Application Tracking',
    ],
    exploreLink: '/register',
  },
  {
    id: 'ai-apply-assistant',
    title: 'AI APPLY ASSISTANT',
    badge: 'AI Powered',
    desc: 'Intelligently detect supported registration fields and map available student information while keeping students in complete control.',
    icon: Sparkles,
    features: [
      'Supported Field Detection',
      'Smart Information Mapping',
      'Profile-Based Suggestions',
      'Manual Review Before Submission',
    ],
    safetyIndicator: 'Student Stays in Control',
    exploreLink: '#apply-assistant',
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative py-28 bg-[#F8FAFC]/80 border-y border-[#E5E7EB]/90 overflow-hidden"
    >
      {/* Background Decorative Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[550px] w-[850px] rounded-full bg-[#FFF5F6]/90 blur-3xl opacity-80" />
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-[#FBECEF]/70 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-[#F5CED6]/40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ========================================================================= */}
        {/* SECTION HEADING AREA */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-3xl text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F5CED6] bg-[#FFF5F6] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#A71930] shadow-2xs mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Platform Capabilities</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-[#172033] sm:text-4xl md:text-5xl">
            Everything You Need for Your Career Journey
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed">
            One intelligent platform to manage your profile, opportunities,
            applications and professional growth.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 4 FEATURE CARDS GRID */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7 items-stretch">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#A71930]/15 bg-gradient-to-b from-white via-white to-[#F8FAFC] p-7 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-[#A71930]/35 hover:shadow-2xl hover:shadow-[#A71930]/12 shadow-sm"
                style={{
                  boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
                }}
              >
                {/* 3D Depth Back-Plate Layer */}
                <div className="absolute inset-0 -z-10 rounded-3xl bg-white/60 blur-xs transition-all group-hover:bg-[#FFF5F6]/40" />

                <div>
                  {/* Top Icon Area & Optional Badge */}
                  <div className="flex items-center justify-between mb-6">
                    {/* Premium Icon Container */}
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-[#F5CED6] shadow-sm shadow-[#A71930]/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#FFF5F6] group-hover:border-[#A71930]/40">
                      <div className="absolute inset-0 rounded-2xl bg-[#A71930]/5 blur-xs group-hover:bg-[#A71930]/10 transition-colors" />
                      <Icon className="h-7 w-7 text-[#A71930] transition-transform duration-300 group-hover:scale-105" />
                    </div>

                    {card.badge && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#F5CED6] bg-[#FFF5F6] px-3 py-1 text-[11px] font-bold text-[#A71930] shadow-2xs">
                        <Sparkles className="h-3 w-3" />
                        {card.badge}
                      </span>
                    )}
                  </div>

                  {/* Feature Title */}
                  <h3 className="text-lg font-extrabold tracking-tight text-[#172033] mb-2.5 group-hover:text-[#A71930] transition-colors duration-200">
                    {card.title}
                  </h3>

                  {/* Short Professional Description */}
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed font-normal mb-5 min-h-[44px]">
                    {card.desc}
                  </p>

                  {/* Divider Line */}
                  <div className="h-px w-full bg-[#E5E7EB] group-hover:bg-[#F5CED6] transition-colors duration-200 mb-4" />

                  {/* Feature Highlights List */}
                  <div className="space-y-2 mb-6">
                    {card.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5 text-xs text-[#475569]">
                        <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-[#A71930]" />
                        <span className="font-medium">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions & Status Indicators */}
                <div className="pt-4 border-t border-[#F1F5F9] flex flex-col gap-3">
                  {card.safetyIndicator && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/90 border border-emerald-200/80 rounded-xl px-3 py-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                      <span>{card.safetyIndicator}</span>
                    </div>
                  )}

                  <a
                    href={card.exploreLink || '#'}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#A71930] hover:text-[#8F1028] transition-colors group/link"
                  >
                    <span>Explore Feature</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-1.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
