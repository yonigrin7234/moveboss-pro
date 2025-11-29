import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as 'signup' | 'recovery' | 'email' | null;

  const supabase = await createClient();
  let authError: Error | null = null;

  // Handle email confirmation (signup, recovery, email change)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    authError = error;
  }
  // Handle OAuth callback (Google, etc.)
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  }

  if (!authError) {
    // Check if user needs onboarding
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, role')
        .eq('id', user.id)
        .single();

      // Create profile if doesn't exist
      if (!profile) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          onboarding_completed: false,
        });

        if (insertError) {
          console.error('Failed to create profile:', insertError);
          // Still redirect to onboarding even if profile creation fails
          // The onboarding flow will handle creating the profile
        }

        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
      }

      // Redirect based on onboarding status
      if (!profile.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
      }

      // Redirect to appropriate dashboard
      const dashboards: Record<string, string> = {
        company: '/dashboard',
        carrier: '/dashboard',
        owner_operator: '/dashboard',
        driver: '/driver',
      };

      const destination = dashboards[profile.role || ''] || '/dashboard';
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  // Something went wrong, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
