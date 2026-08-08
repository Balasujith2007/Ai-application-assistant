import React from 'react';
import RoleGuard from '@/components/layout/RoleGuard';

export default function HODLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['HOD', 'ADMIN']}>
      {children}
    </RoleGuard>
  );
}
