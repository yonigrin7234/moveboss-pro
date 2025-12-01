'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
  initialError?: string;
}

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    // Refresh to trigger middleware redirect
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5 text-left">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-[13px] font-medium text-white/70">
            Email
          </label>
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full py-3 pl-[42px] pr-3.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:bg-sky-500/5"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-[13px] font-medium text-white/70">
            Password
          </label>
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full py-3 pl-[42px] pr-10 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:bg-sky-500/5"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors p-1"
            >
              {showPassword ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 bg-white hover:bg-white/95 text-[#080B12] font-semibold text-sm rounded-lg transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed mt-1.5"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 mx-auto animate-spin" /> : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-[11px] text-white/35 uppercase tracking-[0.05em]">or continue with</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>

      {/* Social Login */}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[13px] font-medium text-white hover:bg-white/[0.06] hover:border-white/[0.12] transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[13px] font-medium text-white hover:bg-white/[0.06] hover:border-white/[0.12] transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Apple
        </button>
      </div>
    </div>
  );
}
