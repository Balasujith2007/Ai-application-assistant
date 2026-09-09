'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import {
  Zap,
  UserPlus,
  FileText,
  Target,
  UserCheck,
  Send,
  ArrowRight,
  Check,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface StepItem {
  id: number;
  step: string;
  title: string;
  desc: string;
  icon: typeof UserPlus;
}

const WORKFLOW_STEPS: StepItem[] = [
  {
    id: 1,
    step: '01',
    title: 'Student Profile',
    desc: 'Saved profile data',
    icon: UserPlus,
  },
  {
    id: 2,
    step: '02',
    title: 'AI Field Detection',
    desc: 'Identifies form fields',
    icon: FileText,
  },
  {
    id: 3,
    step: '03',
    title: 'Smart Information Mapping',
    desc: 'Pre-fills supported inputs',
    icon: Target,
  },
  {
    id: 4,
    step: '04',
    title: 'Student Review',
    desc: 'Review & verify details',
    icon: UserCheck,
  },
  {
    id: 5,
    step: '05',
    title: 'Final Submission by Student',
    desc: 'Manual student submission',
    icon: Send,
  },
];

const CAPABILITIES = [
  'Detects supported application fields',
  'Maps available student information',
  'Reuses saved answers where appropriate',
  'Supports resume attachment where technically supported',
];

const SAFETY_RULES = [
  'CAPTCHA requires student action',
  'Sensitive questions remain under student control',
  'Legal declarations are not automatically accepted',
  'Final submission remains with the student',
];

export default function ApplyAssistantSection() {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [scrollActiveStep, setScrollActiveStep] = useState<number>(1);
  const [isTimelineInView, setIsTimelineInView] = useState<boolean>(false);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const stepElementsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Track scroll progress across the timeline section
  const { scrollYProgress } = useScroll({
    target: timelineContainerRef,
    offset: ['start 75%', 'end 35%'],
  });

  // Calculate active step based on scroll position & step proximity
  useEffect(() => {
    const handleScroll = () => {
      if (!timelineContainerRef.current) return;

      const containerRect = timelineContainerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Check if timeline is in viewport
      const inView =
        containerRect.top < viewportHeight * 0.85 && containerRect.bottom > viewportHeight * 0.15;
      setIsTimelineInView(inView);

      if (!inView) return;

      // Find which step is closest to the focus zone (45% to 55% of viewport height)
      const focusZone = viewportHeight * 0.5;
      let closestStep = 1;
      let minDistance = Infinity;

      stepElementsRef.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const stepCenter = rect.top + rect.height / 2;
        const distance = Math.abs(stepCenter - focusZone);

        if (distance < minDistance) {
          minDistance = distance;
          closestStep = idx + 1;
        }
      });

      setScrollActiveStep(closestStep);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync with framer-motion scroll progress as additional smooth fallback
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest <= 0.05) {
      setScrollActiveStep(1);
    } else if (latest <= 0.28) {
      setScrollActiveStep(2);
    } else if (latest <= 0.52) {
      setScrollActiveStep(3);
    } else if (latest <= 0.76) {
      setScrollActiveStep(4);
    } else {
      setScrollActiveStep(5);
    }
  });

  // Active step priority: Hover > Click > Scroll Position
  const activeStepId =
    hoveredStep !== null
      ? hoveredStep
      : selectedStep !== null
      ? selectedStep
      : isTimelineInView
      ? scrollActiveStep
      : null;

  const handleMouseEnter = (stepId: number) => {
    setHoveredStep(stepId);
  };

  const handleMouseLeave = () => {
    setHoveredStep(null);
  };

  const handleClick = (stepId: number) => {
    setSelectedStep((prev) => (prev === stepId ? null : stepId));
  };

  return (
    <section
      id="how-it-works"
      className="relative py-24 sm:py-28 bg-white overflow-hidden scroll-mt-16"
    >
      {/* Anchor for backward compatibility with #apply-assistant */}
      <div id="apply-assistant" className="absolute -top-16 left-0" />

      {/* ========================================================================= */}
      {/* AMBIENT BACKGROUND GLOWS & SUBTLE DOT MATRICES                            */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Soft Pink Ambient Blur - Top Left */}
        <div className="absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full bg-[#FFF0F2] blur-3xl opacity-90" />
        
        {/* Soft Pink Ambient Blur - Bottom Right */}
        <div className="absolute -bottom-24 -right-24 h-[580px] w-[580px] rounded-full bg-[#FFF0F2] blur-3xl opacity-90" />

        {/* Left Side Dotted Pattern Grid */}
        <div className="hidden xl:block absolute left-6 top-1/3 -translate-y-1/2 opacity-40">
          <svg width="120" height="200" fill="none" viewBox="0 0 120 200">
            <defs>
              <pattern id="dot-grid-left" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.8" fill="#F43F5E" fillOpacity="0.45" />
              </pattern>
            </defs>
            <rect width="120" height="200" fill="url(#dot-grid-left)" />
          </svg>
        </div>

        {/* Right Side Dotted Pattern Grid */}
        <div className="hidden xl:block absolute right-8 top-20 opacity-40">
          <svg width="120" height="180" fill="none" viewBox="0 0 120 180">
            <defs>
              <pattern id="dot-grid-right" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.8" fill="#F43F5E" fillOpacity="0.45" />
              </pattern>
            </defs>
            <rect width="120" height="180" fill="url(#dot-grid-right)" />
          </svg>
        </div>

        {/* Bottom-Left Dotted Grid */}
        <div className="hidden xl:block absolute left-8 bottom-28 opacity-40">
          <svg width="120" height="140" fill="none" viewBox="0 0 120 140">
            <rect width="120" height="140" fill="url(#dot-grid-left)" />
          </svg>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION (MATCHING REFERENCE IMAGE)                                */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          {/* Soft Pink Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F5CED6] bg-[#FFF5F6] px-4 py-1.5 text-xs font-semibold text-[#A30D2D] shadow-2xs mb-5">
            <Zap className="h-3.5 w-3.5 fill-[#C51F3A] text-[#C51F3A]" />
            <span>AI Apply Assistant Showcase</span>
          </div>

          {/* Large Centered Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight text-[#0F172A] leading-[1.15]">
            Apply Smarter.{' '}
            <span className="text-[#C51F3A] inline-block">Stay in Control.</span>
          </h2>

          {/* Subtitle / Description */}
          <p className="mt-4 text-sm sm:text-base md:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto font-normal">
            Intelligent form field detection and profile mapping built with responsible design, transparency, and complete student oversight.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 2. VERTICAL TIMELINE CONTAINER (LEFT 3D NODES + RIGHT STEP CARDS)         */}
        {/* ========================================================================= */}
        <div ref={timelineContainerRef} className="relative mx-auto max-w-4xl mb-20">
          <div className="flex flex-col space-y-5 sm:space-y-6 relative">
            {WORKFLOW_STEPS.map((item, index) => {
              const Icon = item.icon;
              const isCurrent = activeStepId === item.id;
              const isPassedOrCurrent = activeStepId !== null && activeStepId >= item.id;
              const isNextStepConnected = activeStepId !== null && activeStepId > item.id;
              const isLast = index === WORKFLOW_STEPS.length - 1;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    stepElementsRef.current[index] = el;
                  }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-center relative transition-all duration-300"
                >
                  {/* ------------------------------------------------------------- */}
                  {/* LEFT SIDE: RED NUMBER BADGE + 3D ISOMETRIC ICON TILE          */}
                  {/* ------------------------------------------------------------- */}
                  <div className="md:col-span-4 flex items-center justify-start md:justify-end relative">
                    {/* Left Step Node (Number Badge + 3D Diamond Tile) */}
                    <div
                      onClick={() => handleClick(item.id)}
                      onMouseEnter={() => handleMouseEnter(item.id)}
                      onMouseMove={() => handleMouseEnter(item.id)}
                      onMouseLeave={handleMouseLeave}
                      className="group cursor-pointer flex items-center gap-3.5 sm:gap-4 relative z-10"
                    >
                      {/* Red Circular Number Badge */}
                      <div
                        className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-black transition-all duration-300 shadow-md ${
                          isCurrent
                            ? 'bg-[#A30D2D] text-white ring-4 ring-[#FFF5F6] scale-110 shadow-[#A30D2D]/35'
                            : isPassedOrCurrent
                            ? 'bg-[#A30D2D] text-white ring-2 ring-[#FFF5F6] opacity-100'
                            : 'bg-[#A30D2D] text-white shadow-xs opacity-90 hover:opacity-100'
                        }`}
                      >
                        {item.step}
                      </div>

                      {/* 3D Isometric Rounded-Square Platform */}
                      <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center">
                        {/* 3D Depth Underlayer (Base Slab Thickness) */}
                        <div
                          className={`absolute inset-0 rounded-2xl transform rotate-45 translate-y-1.5 transition-all duration-300 ${
                            isCurrent
                              ? 'bg-[#760820]'
                              : isPassedOrCurrent
                              ? 'bg-[#A30D2D]/60'
                              : 'bg-[#E2E8F0]'
                          }`}
                        />

                        {/* Top Diamond Surface */}
                        <div
                          className={`relative flex h-full w-full items-center justify-center rounded-2xl transform rotate-45 transition-all duration-300 ${
                            isCurrent
                              ? 'bg-gradient-to-br from-[#C51F3A] to-[#8F0B28] text-white scale-105 ring-2 ring-[#FFF5F6]'
                              : isPassedOrCurrent
                              ? 'bg-white border-2 border-[#C51F3A] text-[#C51F3A] shadow-sm'
                              : 'bg-white border-2 border-[#F5CED6] text-[#C51F3A] hover:border-[#C51F3A] shadow-xs'
                          }`}
                          style={{
                            boxShadow: isCurrent
                              ? '0 12px 28px -4px rgba(197, 31, 58, 0.4), 0 4px 8px -2px rgba(197, 31, 58, 0.15)'
                              : isPassedOrCurrent
                              ? '0 6px 16px -2px rgba(197, 31, 58, 0.15)'
                              : '0 4px 12px rgba(0, 0, 0, 0.04)',
                          }}
                        >
                          {/* Inner Icon un-rotated back to upright */}
                          <div className="transform -rotate-45 flex items-center justify-center">
                            <Icon
                              className={`h-6 w-6 sm:h-7 sm:w-7 transition-transform duration-200 ${
                                isCurrent
                                  ? 'text-white scale-110'
                                  : 'text-[#C51F3A]'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Glowing Connection Point at Bottom Apex */}
                        <div
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-white transition-all duration-200 z-20 ${
                            isCurrent
                              ? 'bg-[#C51F3A] shadow-[0_0_8px_rgba(197,31,58,0.9)] ring-2 ring-[#FFF5F6] scale-110'
                              : isPassedOrCurrent
                              ? 'bg-[#C51F3A] shadow-[0_0_5px_rgba(197,31,58,0.5)]'
                              : 'bg-[#CBD5E1]'
                          }`}
                        />

                        {/* Straight Vertical Connection Line from Bottom of this Tile to Top of Next */}
                        {!isLast && (
                          <div className="hidden md:flex absolute top-[calc(100%+2px)] left-1/2 -translate-x-1/2 flex-col items-center justify-center w-6 h-[24px] sm:h-[28px] pointer-events-none z-0">
                            <svg
                              className="w-full h-full overflow-visible"
                              viewBox="0 0 24 28"
                              fill="none"
                              preserveAspectRatio="none"
                            >
                              <defs>
                                <linearGradient
                                  id={`straight-grad-${item.id}`}
                                  x1="0%"
                                  y1="0%"
                                  x2="0%"
                                  y2="100%"
                                >
                                  <stop offset="0%" stopColor="#C51F3A" />
                                  <stop offset="50%" stopColor="#FB7185" />
                                  <stop offset="100%" stopColor="#A30D2D" />
                                </linearGradient>
                                <filter
                                  id={`line-glow-${item.id}`}
                                  x="-50%"
                                  y="-50%"
                                  width="200%"
                                  height="200%"
                                >
                                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                              </defs>

                              {/* Base Straight Track */}
                              <line
                                x1="12"
                                y1="0"
                                x2="12"
                                y2="28"
                                stroke="#FCE7EB"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />

                              {/* Active Glowing Line when current or passed step */}
                              <line
                                x1="12"
                                y1="0"
                                x2="12"
                                y2="28"
                                stroke={`url(#straight-grad-${item.id})`}
                                strokeWidth={isCurrent || isNextStepConnected ? '3.5' : '1.5'}
                                strokeOpacity={isCurrent ? '0.95' : isNextStepConnected ? '0.85' : '0.2'}
                                strokeLinecap="round"
                                className="transition-all duration-300"
                              />

                              {/* Energy Particle on Active Connection */}
                              {(isCurrent || isNextStepConnected) && (
                                <circle
                                  cx="12"
                                  cy="14"
                                  r="3"
                                  fill="#FFF"
                                  stroke="#C51F3A"
                                  strokeWidth="2"
                                  filter={`url(#line-glow-${item.id})`}
                                  className="animate-pulse"
                                  style={{
                                    filter: 'drop-shadow(0 0 6px rgba(197, 31, 58, 0.8))',
                                  }}
                                />
                              )}
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* RIGHT SIDE: LARGE HORIZONTAL INFORMATION STEP CARD            */}
                  {/* ------------------------------------------------------------- */}
                  <div className="md:col-span-8">
                    <div
                      onClick={() => handleClick(item.id)}
                      onMouseEnter={() => handleMouseEnter(item.id)}
                      onMouseMove={() => handleMouseEnter(item.id)}
                      onMouseLeave={handleMouseLeave}
                      className={`group cursor-pointer rounded-2xl sm:rounded-3xl border bg-white p-4 sm:p-5 lg:p-6 transition-all duration-300 ${
                        isCurrent
                          ? 'border-[#F5CED6] shadow-xl shadow-[#C51F3A]/10 ring-1 ring-[#F5CED6] -translate-y-0.5'
                          : isPassedOrCurrent
                          ? 'border-[#FCE7EB] shadow-md shadow-[#C51F3A]/5 hover:border-[#F5CED6] hover:shadow-lg hover:-translate-y-0.5'
                          : 'border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-[#F5CED6] hover:shadow-lg hover:shadow-[#C51F3A]/5 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 sm:gap-4.5">
                          {/* Left Soft Pink Icon Container */}
                          <div
                            className={`flex h-12 w-12 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ${
                              isCurrent
                                ? 'bg-[#FFF0F2] border-[#F5CED6] text-[#C51F3A] scale-105'
                                : isPassedOrCurrent
                                ? 'bg-[#FFF5F6] border-[#FCE7EB] text-[#C51F3A]'
                                : 'bg-[#FFF5F6] border-[#FCE7EB] text-[#C51F3A] group-hover:bg-[#FFF0F2] group-hover:border-[#F5CED6]'
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>

                          {/* Center Content Block */}
                          <div>
                            {/* Step Label */}
                            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#C51F3A] block mb-0.5">
                              STEP {item.step}
                            </span>

                            {/* Title */}
                            <h3 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight leading-snug group-hover:text-[#A30D2D] transition-colors">
                              {item.title}
                            </h3>

                            {/* Description */}
                            <p className="text-xs sm:text-sm text-[#64748B] font-normal mt-0.5 leading-normal">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        {/* Right Red Action Arrow */}
                        <div className="shrink-0 pr-1 sm:pr-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                              isCurrent
                                ? 'text-[#C51F3A] translate-x-1'
                                : 'text-[#C51F3A] opacity-75 group-hover:opacity-100 group-hover:translate-x-1'
                            }`}
                          >
                            <ArrowRight className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. CAPABILITIES & RESPONSIBLE SAFETY CARDS (PRESERVING FUNCTIONALITY)      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pt-4">
          {/* Column 1: Core AI Capabilities */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-[#F5CED6] transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kit-50 text-kit-600 border border-kit-100">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Powerful AI Capabilities</h3>
                <p className="text-xs text-slate-500">Fast, streamlined data mapping</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {CAPABILITIES.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Safety & Student Control */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Responsible Safety Design</h3>
                <p className="text-xs text-slate-500">Zero unauthorized actions or bypasses</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {SAFETY_RULES.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    <Lock className="h-3 w-3 stroke-[2.5]" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
