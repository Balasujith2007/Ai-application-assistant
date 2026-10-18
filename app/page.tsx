'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';

// Lazy-load all below-the-fold sections to reduce initial bundle size
const ProductPreview = dynamic(() => import('@/components/landing/ProductPreview'), { ssr: false });
const FeaturesSection = dynamic(() => import('@/components/landing/FeaturesSection'), { ssr: false });
const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks'), { ssr: false });
const RoleSection = dynamic(() => import('@/components/landing/RoleSection'), { ssr: false });
const ProfileCompletionSection = dynamic(() => import('@/components/landing/ProfileCompletionSection'), { ssr: false });
const SafetySection = dynamic(() => import('@/components/landing/SafetySection'), { ssr: false });
const FinalCTA = dynamic(() => import('@/components/landing/FinalCTA'), { ssr: false });
const Footer = dynamic(() => import('@/components/landing/Footer'), { ssr: false });

function LandingPageContent() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-[var(--font-inter)] selection:bg-kit-100 selection:text-kit-800">
      {/* 1. Navigation Bar */}
      <Navbar />

      <main>
        {/* 2. Hero Section */}
        <HeroSection />

        {/* 3. High-Fidelity Product Preview */}
        <ProductPreview />

        {/* 4. Why CareerAI / Everything You Need */}
        <FeaturesSection />

        {/* 5. How It Works / AI Apply Assistant Showcase */}
        <HowItWorks />

        {/* 6. Built for Everyone in Placement Ecosystem */}
        <RoleSection />

        {/* 8. Profile Completeness Section */}
        <ProfileCompletionSection />

        {/* 9. Student Control & Safety Section */}
        <SafetySection />

        {/* 10. Final Call to Action */}
        <FinalCTA />
      </main>

      {/* 11. Footer */}
      <Footer />
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  );
}
