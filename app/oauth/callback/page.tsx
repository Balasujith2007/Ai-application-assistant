'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        loginWithToken(token, user);
        
        // Redirect to appropriate dashboard based on role
        if (user.role === 'STUDENT') router.push('/dashboard/student');
        else if (user.role === 'MENTOR') router.push('/dashboard/mentor');
        else if (user.role === 'FACULTY') router.push('/dashboard/faculty');
        else if (user.role === 'HOD') router.push('/dashboard/hod');
        else if (user.role === 'PLACEMENT_CELL') router.push('/dashboard/placement');
        else if (user.role === 'ADMIN') router.push('/dashboard/admin');
        else router.push('/');
      } catch (e) {
        console.error('Failed to parse user from OAuth callback', e);
        router.push('/login?error=oauth_failed');
      }
    } else {
      router.push('/login?error=oauth_missing_data');
    }
  }, [router, searchParams, loginWithToken]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm font-medium text-gray-500">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
