'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, ArrowRight, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = ['features', 'how-it-works', 'roles', 'apply-assistant'];
      const current = sections.find((section) => {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          return rect.top <= 140 && rect.bottom >= 140;
        }
        return false;
      });
      if (current) setActiveSection(current);
      else if (window.scrollY < 200) setActiveSection('');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
          : 'bg-white/95 backdrop-blur-sm border-b border-slate-100'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-kit-500 rounded-lg"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kit-600 shadow-sm transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              Career<span className="text-kit-600">AI</span>
            </span>
            <span className="text-[9px] font-bold tracking-widest uppercase text-slate-500 mt-0.5">
              CAREER INTELLIGENCE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          <a
            href="#features"
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeSection === 'features'
                ? 'text-kit-700 bg-kit-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeSection === 'how-it-works' || activeSection === 'apply-assistant'
                ? 'text-slate-900 font-semibold after:absolute after:bottom-0.5 after:left-3.5 after:right-3.5 after:h-0.5 after:bg-[#C51F3A]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            How It Works
          </a>
          <Link
            href="/students"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            For Students
          </Link>
          <Link
            href="/mentors"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            For Mentors
          </Link>
        </nav>

        {/* Auth & CTA Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-1.5 rounded-lg bg-kit-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-kit-700 hover:shadow-md hover:shadow-kit-600/20 active:translate-y-px transition-all duration-150"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden focus:outline-none focus:ring-2 focus:ring-kit-500"
          aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pt-3 pb-6 md:hidden shadow-lg animate-in fade-in">
          <div className="flex flex-col space-y-1.5">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              How It Works
            </a>
            <Link
              href="/students"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              For Students
            </Link>
            <Link
              href="/mentors"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              For Mentors
            </Link>
          </div>
          <div className="mt-5 flex flex-col gap-2.5 border-t border-slate-100 pt-4">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center rounded-lg bg-kit-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-kit-700"
            >
              Get Started →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
