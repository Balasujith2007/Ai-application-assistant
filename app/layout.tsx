import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { PlacementProvider } from '@/context/PlacementContext';
import { NotificationProvider } from '@/context/NotificationContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'CareerAI — AI Career Management Platform',
    template: '%s | CareerAI',
  },
  description:
    'Manage resumes, track applications, internships, and hackathons from one intelligent career platform.',
  keywords: [
    'career management',
    'resume tracker',
    'internship tracker',
    'placement portal',
    'AI career assistant',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>
          <PlacementProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </PlacementProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
