import React from 'react';
import RoleGuard from '@/components/layout/RoleGuard';

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['MENTOR', 'ADMIN']}>
      {children}
    </RoleGuard>
  );
}
