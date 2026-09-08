'use client';

import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import ProductPreview from '@/components/landing/ProductPreview';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorks from '@/components/landing/HowItWorks';
import RoleSection from '@/components/landing/RoleSection';
import ApplyAssistantSection from '@/components/landing/ApplyAssistantSection';
import ProfileCompletionSection from '@/components/landing/ProfileCompletionSection';
import SafetySection from '@/components/landing/SafetySection';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
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

        {/* 5. 4-Step How It Works Workflow */}
        <HowItWorks />

        {/* 6. Built for Everyone in Placement Ecosystem */}
        <RoleSection />

        {/* 7. AI Apply Assistant Showcase */}
        <ApplyAssistantSection />

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
