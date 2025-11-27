import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            onboarding_completed: false,
          });

          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
        }

        // Redirect based on onboarding status
        if (!profile.onboarding_completed) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
        }

        // Redirect to appropriate dashboard
        const dashboards: Record<string, string> = {
          company: '/company/dashboard',
          carrier: '/dashboard',
          owner_operator: '/dashboard',
          driver: '/driver',
        };

        const destination = dashboards[profile.role || ''] || '/dashboard';
        return NextResponse.redirect(new URL(destination, requestUrl.origin));
      }
    }
  }

  // Something went wrong, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
