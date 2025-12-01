import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as 'signup' | 'recovery' | 'email' | 'magiclink' | null;
  const error_description = requestUrl.searchParams.get('error_description');

  // If Supabase sends an error directly in the URL
  if (error_description) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', error_description);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();

  // Handle email confirmation (signup, recovery, email change, magic link)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      console.error('OTP verification failed:', error.message);
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', error.message);
      return NextResponse.redirect(loginUrl);
    }
  }
  // Handle OAuth callback or PKCE flow (Google, Apple, etc.)
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Code exchange failed:', error.message);
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', error.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  // At this point, auth should be successful - get the user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Failed to get user after auth:', userError?.message);
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', 'Authentication failed. Please try again.');
    return NextResponse.redirect(loginUrl);
  }

  // Check if user has a profile
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
      // Still redirect to onboarding - it will handle profile creation
    }

    return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
  }

  // Redirect based on onboarding status
  if (!profile.onboarding_completed) {
    return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
  }

  // Redirect to appropriate dashboard based on role
  const dashboards: Record<string, string> = {
    company: '/dashboard',
    carrier: '/dashboard',
    owner_operator: '/dashboard',
    driver: '/driver',
  };

  const destination = dashboards[profile.role || ''] || '/dashboard';
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
