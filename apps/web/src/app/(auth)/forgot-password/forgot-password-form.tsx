'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-white">Check your email</h3>
        <p className="text-zinc-400">
          We&apos;ve sent a password reset link to <span className="text-white font-medium">{email}</span>.
        </p>
        <p className="text-sm text-zinc-500">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <button onClick={() => setSuccess(false)} className="text-white hover:text-zinc-300 transition-colors">
            try again
          </button>
        </p>
        <Button
          variant="outline"
          asChild
          className="w-full bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700"
        >
          <Link href="/login">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to login
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300 text-sm font-medium">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-zinc-700"
              required
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>
        )}

        {/* Submit */}
        <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-medium" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Send Reset Link
        </Button>
      </form>
    </div>
  );
}
