'use client';

import React, { Suspense } from 'react';
import LoginCard from '@/components/auth/LoginCard';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/70 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 sm:p-10 shadow-lg border border-gray-100/80">
        <Suspense fallback={<div className="text-center py-12 text-sm text-gray-400">Loading authentication...</div>}>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}


