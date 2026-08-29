'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentAnnouncementsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/notifications');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-kit-600 border-t-transparent" />
    </div>
  );
}
