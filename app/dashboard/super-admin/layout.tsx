'use client';

import React from 'react';
import RoleGuard from '@/components/layout/RoleGuard';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
      {children}
    </RoleGuard>
  );
}
