'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function AuthCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        loginWithToken(token, user);
      } catch (err) {
        console.error('Failed to parse OAuth user profile:', err);
        router.push('/login?error=InvalidOAuthPayload');
      }
    } else {
      router.push('/login?error=OAuthFailed');
    }
  }, [searchParams, loginWithToken, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-700">Completing Google Sign In...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Loading auth session...</p>
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  );
}
