import React from 'react';
import RoleGuard from '@/components/layout/RoleGuard';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      {children}
    </RoleGuard>
  );
}
