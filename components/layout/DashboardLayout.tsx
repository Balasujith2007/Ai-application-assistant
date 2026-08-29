'use client';

import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return <div className="space-y-6">{children}</div>;
}
