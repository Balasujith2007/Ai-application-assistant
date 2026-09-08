'use client';

import { useState, useEffect, useRef } from 'react';
import { UserPlus, FileText, Target, TrendingUp, ArrowRight } from 'lucide-react';

interface StepData {
  id: number;
  step: string;
  title: string;
  desc: string;
  supporting: string;
  icon: typeof UserPlus;
}

const WORKFLOW_STEPS: StepData[] = [
  {
    id: 1,
    step: '01',
    title: 'Create Your Profile',
    desc: 'Add your education, skills, projects, experience and career preferences.',
    supporting: 'Set up your unified profile with verified academics, competencies, and aspirational roles.',
    icon: UserPlus,
  },
  {
    id: 2,
    step: '02',
    title: 'Build Your Professional Presence',
    desc: 'Upload and manage your resume and professional information.',
    supporting: 'Upload multiple resume versions and improve your professional readiness.',
    icon: FileText,
  },
  {
    id: 3,
    step: '03',
    title: 'Discover Opportunities',
    desc: 'Explore internships, jobs, hackathons and placement opportunities.',
    supporting: 'Discover campus recruitment drives, off-campus opportunities, and relevant career programs.',
    icon: Target,
  },
  {
    id: 4,
    step: '04',
    title: 'Grow Your Career',
    desc: 'Track your progress and build your professional future.',
    supporting: 'Monitor your applications, prepare for interviews, and improve your career journey.',
    icon: TrendingUp,
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const sectionRef = useRef<HTMLElement>(null);
  const stepRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll observer to trigger active step progression
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const windowHeight = window.innerHeight;

      stepRowRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Activate step when its row passes through the active detection zone
        if (rect.top <= windowHeight * 0.58 && rect.bottom >= windowHeight * 0.2) {
          setActiveStep(index + 1);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-28 bg-[#F8FAFC]/70 overflow-hidden border-y border-[#E5E7EB]/80"
    >
      {/* Background Subtle Ambience */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[650px] w-[950px] rounded-full bg-[#FFF5F6]/80 blur-3xl opacity-80" />
        <div className="absolute top-1/4 right-1/4 h-80 w-80 rounded-full bg-[#FBECEF]/60 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ========================================================================= */}
        {/* SECTION HEADING AREA */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-3xl text-center mb-20">
          {/* Small Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F5CED6] bg-[#FFF5F6] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#A91532] shadow-2xs mb-4">
            <span>🎓</span>
            <span>4 Simple Steps to Kickstart Your Career</span>
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl font-extrabold tracking-tight text-[#172033] sm:text-4xl md:text-5xl">
            How It <span className="text-[#A91532]">Works</span>
          </h2>

          {/* Description */}
          <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto">
            Start your career journey in 4 simple steps, structured to take you from profile creation to placement success.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* WORKFLOW MAIN CONTAINER (Perfect 2-Column Row Alignment) */}
        {/* ========================================================================= */}
        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-col space-y-8 sm:space-y-12 relative">
            
            {WORKFLOW_STEPS.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeStep === item.id;
              const isPassed = activeStep >= item.id;
              const isLast = index === WORKFLOW_STEPS.length - 1;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    stepRowRefs.current[index] = el;
                  }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center relative"
                >
                  {/* --------------------------------------------------------------- */}
                  {/* LEFT COLUMN: 3D WORKFLOW NODE + NUMBER BADGE (35% on Desktop)   */}
                  {/* --------------------------------------------------------------- */}
                  <div className="lg:col-span-4 flex items-center justify-center lg:justify-end relative">
                    {/* Connecting SVG Path to next step below */}
                    {!isLast && (
                      <div className="hidden lg:block absolute top-[68px] left-[calc(50%+28px)] lg:left-auto lg:right-[34px] w-6 h-[88px] sm:h-[104px] pointer-events-none z-0">
                        <svg
                          className="w-full h-full"
                          viewBox="0 0 24 90"
                          fill="none"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <filter id={`glow-${item.id}`} x="-30%" y="-30%" width="160%" height="160%">
                              <feGaussianBlur stdDeviation="2.5" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <linearGradient id={`grad-${item.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#A91532" />
                              <stop offset="50%" stopColor="#E85B73" />
                              <stop offset="100%" stopColor="#8F1028" />
                            </linearGradient>
                          </defs>

                          {/* Base Path (gray/soft pink dashed) */}
                          <path
                            d="M 12 0 Q 18 45, 12 90"
                            stroke="#E5E7EB"
                            strokeWidth="3"
                            strokeDasharray="4 4"
                          />

                          {/* Active Glowing Path */}
                          {activeStep > item.id && (
                            <path
                              d="M 12 0 Q 18 45, 12 90"
                              stroke={`url(#grad-${item.id})`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              filter={`url(#glow-${item.id})`}
                              className="animate-in fade-in duration-300"
                            />
                          )}

                          {/* Glowing traveling energy particle */}
                          {activeStep === item.id + 1 && (
                            <circle
                              cx="12"
                              cy="45"
                              r="4"
                              fill="#FFF"
                              stroke="#A91532"
                              strokeWidth="2.5"
                              className="animate-pulse"
                              style={{ filter: 'drop-shadow(0 0 6px rgba(169, 21, 50, 0.8))' }}
                            />
                          )}
                        </svg>
                      </div>
                    )}

                    {/* Left Node Container */}
                    <div
                      onClick={() => setActiveStep(item.id)}
                      className="group cursor-pointer flex items-center gap-4 relative z-10"
                    >
                      {/* Circular Number Badge */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
                          isActive
                            ? 'bg-[#A91532] text-white ring-4 ring-[#FFF5F6] scale-110 shadow-md shadow-[#A91532]/30'
                            : isPassed
                            ? 'bg-[#A91532] text-white shadow-xs'
                            : 'bg-white border border-[#E5E7EB] text-[#64748B]'
                        }`}
                      >
                        {item.step}
                      </div>

                      {/* 3D Diamond / Rotated-Square Floating Platform Node */}
                      <div className="relative flex items-center justify-center">
                        {/* 3D Depth Underlayer */}
                        <div
                          className={`absolute inset-0 rounded-2xl transform rotate-45 translate-y-1.5 transition-all duration-300 ${
                            isActive
                              ? 'bg-[#760820]'
                              : isPassed
                              ? 'bg-[#E5E7EB]'
                              : 'bg-[#F1F5F9]'
                          }`}
                        />

                        {/* Top Surface */}
                        <div
                          className={`relative flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-2xl transform rotate-45 transition-all duration-300 ${
                            isActive
                              ? 'bg-gradient-to-br from-[#A91532] to-[#8F1028] text-white scale-105 shadow-xl shadow-[#A91532]/30 ring-2 ring-[#FFF5F6]'
                              : isPassed
                              ? 'bg-white border border-[#F5CED6] text-[#A91532] shadow-md'
                              : 'bg-white border border-[#E5E7EB] text-[#64748B] shadow-xs hover:border-[#F5CED6]'
                          }`}
                          style={{
                            boxShadow: isActive
                              ? '0 10px 25px -3px rgba(169, 21, 50, 0.35), 0 4px 6px -2px rgba(169, 21, 50, 0.1)'
                              : undefined,
                          }}
                        >
                          {/* Inner Icon un-rotated back to normal angle */}
                          <div className="transform -rotate-45 flex items-center justify-center">
                            <Icon
                              className={`h-7 w-7 transition-transform duration-200 ${
                                isActive ? 'text-white scale-110' : isPassed ? 'text-[#A91532]' : 'text-[#64748B]'
                              }`}
                            />
                          </div>

                          {/* Glowing Connection Point at bottom corner */}
                          <div
                            className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white transition-colors duration-200 ${
                              isPassed ? 'bg-[#A91532]' : 'bg-[#CBD5E1]'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --------------------------------------------------------------- */}
                  {/* RIGHT COLUMN: INFORMATION CARD (65% on Desktop)                 */}
                  {/* --------------------------------------------------------------- */}
                  <div className="lg:col-span-8">
                    <div
                      onClick={() => setActiveStep(item.id)}
                      className={`group cursor-pointer rounded-2xl sm:rounded-3xl border bg-white p-6 sm:p-7 transition-all duration-300 ${
                        isActive
                          ? 'border-[#A91532]/40 shadow-xl shadow-[#A91532]/5 ring-1 ring-[#A91532]/20 -translate-y-1'
                          : 'border-[#E5E7EB] shadow-xs hover:border-[#F5CED6] hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Card Content Layout: [ ICON ]  [ 01 ] Title       → */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 sm:gap-5">
                          {/* Left Pale-Red Icon Square */}
                          <div
                            className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-200 ${
                              isActive
                                ? 'bg-[#FFF5F6] border-[#F5CED6] text-[#A91532]'
                                : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#64748B] group-hover:bg-[#FFF5F6] group-hover:text-[#A91532] group-hover:border-[#F5CED6]'
                            }`}
                          >
                            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                          </div>

                          {/* Center Text Block */}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                              {/* Step Pill Badge */}
                              <span
                                className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                                  isActive
                                    ? 'bg-[#A91532] text-white'
                                    : 'bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#FFF5F6] group-hover:text-[#A91532]'
                                }`}
                              >
                                {item.step}
                              </span>

                              {/* Title */}
                              <h3 className="text-lg sm:text-xl font-bold text-[#172033] tracking-tight">
                                {item.title}
                              </h3>
                            </div>

                            {/* Description */}
                            <p className="text-sm sm:text-base text-[#64748B] leading-relaxed font-normal">
                              {item.desc}
                            </p>

                            {/* Supporting Text */}
                            <div
                              className={`mt-3 pt-3 border-t border-[#F1F5F9] text-xs sm:text-sm transition-colors duration-200 ${
                                isActive ? 'text-[#A91532] font-medium' : 'text-[#94A3B8]'
                              }`}
                            >
                              <span>✦ {item.supporting}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Circular Arrow Button */}
                        <div className="shrink-0 pt-1 sm:pt-2">
                          <button
                            type="button"
                            aria-label={`Explore step ${item.step}: ${item.title}`}
                            className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-all duration-200 ${
                              isActive
                                ? 'bg-[#A91532] text-white border-[#A91532] shadow-sm shadow-[#A91532]/30 translate-x-1'
                                : 'bg-[#F8FAFC] text-[#94A3B8] border-[#E5E7EB] group-hover:text-[#A91532] group-hover:border-[#F5CED6] group-hover:translate-x-1'
                            }`}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </section>
  );
}
