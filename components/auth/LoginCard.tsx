'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  Building2,
  UserCheck,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LoginCardProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

type DemoRoleType = 'STUDENT' | 'HOD' | 'ADVISOR' | 'SUPER_ADMIN';

interface DemoRoleOption {
  id: DemoRoleType;
  label: string;
  roleBadge: string;
  icon: React.ElementType;
}

const DEMO_ROLES: DemoRoleOption[] = [
  {
    id: 'STUDENT',
    label: 'Student Demo',
    roleBadge: 'Student',
    icon: GraduationCap,
  },
  {
    id: 'HOD',
    label: 'HOD Demo',
    roleBadge: 'Department Head',
    icon: Building2,
  },
  {
    id: 'ADVISOR',
    label: 'Advisor Demo',
    roleBadge: 'Advisor / Mentor',
    icon: UserCheck,
  },
  {
    id: 'SUPER_ADMIN',
    label: 'Super Admin Demo',
    roleBadge: 'Super Admin',
    icon: ShieldCheck,
  },
];

export default function LoginCard({ onSuccess, isModal = false }: LoginCardProps) {
  const { login, demoLogin } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDemoRole, setLoadingDemoRole] = useState<DemoRoleType | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const errorParam = searchParams?.get('error');
    const reasonParam = searchParams?.get('reason');

    if (errorParam) {
      if (errorParam === 'GoogleTokenExchangeFailed') {
        setError(`Google Authentication Failed: ${reasonParam || 'Invalid Google OAuth credentials or secret mismatch.'}`);
      } else if (errorParam === 'GoogleAccessDenied') {
        setError('Google login request was canceled.');
      } else if (errorParam === 'GoogleProfileFetchFailed') {
        setError('Could not retrieve user profile from Google.');
      } else {
        setError(`Authentication error: ${errorParam}`);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid email or password';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (roleId: DemoRoleType) => {
    if (isLoading || loadingDemoRole) return;
    setError('');
    setLoadingDemoRole(roleId);
    try {
      await demoLogin(roleId);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to authenticate demo account. Please try again.';
      setError(msg);
    } finally {
      setLoadingDemoRole(null);
    }
  };

  const isAnyLoading = isLoading || loadingDemoRole !== null;

  return (
    <div className="w-full">
      {/* Top Logo & Title */}
      <div className="flex flex-col items-center text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm border border-gray-200 group-hover:scale-105 transition-transform">
            <img src="/kit-logo.png" alt="KIT Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">CareerAI</span>
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Sign in to continue your career journey
        </p>
      </div>

      {/* Demo Login Section */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-kit-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Demo Login
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">1-Click Instant Access</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {DEMO_ROLES.map((demo) => {
            const Icon = demo.icon;
            const isThisRoleLoading = loadingDemoRole === demo.id;

            return (
              <button
                key={demo.id}
                type="button"
                id={`demo-login-${demo.id.toLowerCase()}`}
                onClick={() => handleDemoLogin(demo.id)}
                disabled={isAnyLoading}
                className={`group relative flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2.5 rounded-xl border p-2.5 sm:p-3 text-left transition-all cursor-pointer select-none ${
                  isThisRoleLoading
                    ? 'border-kit-600 bg-red-50/80 ring-2 ring-kit-600/20 shadow-xs'
                    : 'border-gray-200 bg-gray-50/80 hover:bg-white hover:border-kit-300 hover:shadow-xs active:scale-[0.98]'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isThisRoleLoading
                      ? 'bg-kit-600 text-white'
                      : 'bg-white text-kit-700 shadow-2xs border border-gray-200/80 group-hover:bg-kit-600 group-hover:text-white group-hover:border-kit-600'
                  }`}
                >
                  {isThisRoleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-900 leading-snug group-hover:text-kit-700 transition-colors truncate">
                    {isThisRoleLoading ? 'Logging in...' : demo.label}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{demo.roleBadge}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="w-full border-t border-gray-200"></div>
        <span className="absolute bg-white px-3 text-xs text-gray-400 font-medium">
          or sign in with credentials
        </span>
      </div>

      {/* Google Login Button */}
      <div>
        <a
          href="/api/auth/google"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kit-500 focus:ring-offset-2 transition-all"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          <span>Continue with Google</span>
        </a>
      </div>

      {/* Or continue with email divider */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="w-full border-t border-gray-200"></div>
        <span className="absolute bg-white px-3 text-xs text-gray-500 font-medium">
          Or continue with email
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="card-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            id="card-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dhanapal123@gmail.com"
            autoComplete="email"
            required
            className="block w-full rounded-xl border border-gray-300 bg-blue-50/30 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-2xs transition-all focus:border-kit-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-kit-600/20"
          />
        </div>

        <div>
          <label htmlFor="card-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="card-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="block w-full rounded-xl border border-gray-300 bg-blue-50/30 px-3.5 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-2xs transition-all focus:border-kit-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-kit-600/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              id="card-remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-kit-600 focus:ring-kit-500 accent-kit-600"
            />
            <span>Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-kit-700 hover:text-kit-800 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Big Crimson Sign In Button */}
        <button
          type="submit"
          disabled={isAnyLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-kit-600 hover:bg-kit-700 active:bg-kit-800 px-4 py-3 text-sm font-bold text-white shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <span>Sign in</span>
          )}
        </button>
      </form>

      {/* Footer Register Link */}
      <div className="mt-6 text-center text-xs text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-bold text-kit-700 hover:text-kit-800 hover:underline">
          Create one free
        </Link>
      </div>
    </div>
  );
}
