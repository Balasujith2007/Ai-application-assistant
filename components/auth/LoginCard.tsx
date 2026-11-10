'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LoginCardProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export default function LoginCard({ onSuccess, isModal = false }: LoginCardProps) {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <div className="w-full">
      {/* Logo & Heading */}
      <div className="flex flex-col items-center text-center">
        <Link href="/" className="group inline-flex items-center gap-2.5 mb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm transition-transform group-hover:scale-105">
            <img src="/kit-logo.png" alt="CareerAI Logo" className="h-full w-full object-contain" />
          </span>
          <span className="text-2xl font-bold tracking-tight text-slate-900">CareerAI</span>
        </Link>

        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900">
          Welcome Back
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Sign in to continue your career journey.
        </p>
      </div>

      {/* Google Login Button */}
      <div className="mt-7">
        <a
          href="/api/auth/google"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kit-600/30 focus-visible:ring-offset-2"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          <span>Continue with Google</span>
        </a>
      </div>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="w-full border-t border-slate-200" />
        <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Or continue with email
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="card-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Email address
          </label>
          <input
            id="card-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600/15"
          />
        </div>

        <div>
          <label htmlFor="card-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
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
              className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              id="card-remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-kit-600 accent-kit-600 focus:ring-kit-500"
            />
            <span>Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-kit-700 transition-colors hover:text-kit-800 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-kit-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-kit-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-kit-600/40 focus-visible:ring-offset-2 active:bg-kit-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Footer Register Link */}
      <div className="mt-6 text-center text-xs text-slate-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-bold text-kit-700 transition-colors hover:text-kit-800 hover:underline">
          Create one free
        </Link>
      </div>
    </div>
  );
}
