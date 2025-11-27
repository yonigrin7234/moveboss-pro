import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /dashboard and /companies routes
  if (
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/companies')) &&
    !user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect /login to appropriate page if already logged in
  if (request.nextUrl.pathname === '/login' && user) {
    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();

    if (profile?.onboarding_completed && profile?.role) {
      // Go to role-appropriate dashboard
      // Note: 'company', 'carrier', 'owner_operator' all use /dashboard
      // Only 'driver' uses /driver
      if (profile.role === 'driver') {
        url.pathname = '/driver';
      } else {
        url.pathname = '/dashboard';
      }
    } else {
      // Go to onboarding
      url.pathname = '/onboarding';
    }

    return NextResponse.redirect(url);
  }

  // Check onboarding status for authenticated users accessing protected routes
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding');
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/driver');

  if (user && (isProtectedRoute || isOnboardingRoute)) {
    // Get user's onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single();

    const hasCompletedOnboarding = profile?.onboarding_completed === true && profile?.role;

    // If user hasn't completed onboarding and is trying to access protected routes
    if (!hasCompletedOnboarding && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    // If user has completed onboarding and is on main onboarding page, redirect to appropriate dashboard
    if (hasCompletedOnboarding && request.nextUrl.pathname === '/onboarding') {
      const url = request.nextUrl.clone();
      // Note: 'company', 'carrier', 'owner_operator' all use /dashboard
      // Only 'driver' uses /driver
      if (profile.role === 'driver') {
        url.pathname = '/driver';
      } else {
        url.pathname = '/dashboard';
      }
      return NextResponse.redirect(url);
    }
  }

  // Ensure workspace company exists before accessing dashboard areas (legacy check)
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    // Get profile to check if they have completed new onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    // Skip workspace check if user completed new onboarding flow
    if (profile?.onboarding_completed) {
      return supabaseResponse;
    }

    const allowWorkspaceSetup =
      request.nextUrl.pathname.startsWith('/dashboard/settings/company-profile') ||
      request.nextUrl.pathname.startsWith('/onboarding/workspace');
    const { data: workspace, error: workspaceError } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_workspace_company', true)
      .maybeSingle();

    const canCheckWorkspace =
      !workspaceError ||
      (typeof workspaceError.message === 'string' && !workspaceError.message.toLowerCase().includes('is_workspace_company'));

    if (canCheckWorkspace && !workspace && !allowWorkspaceSetup) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding/workspace';
      return NextResponse.redirect(url);
    }
  }

  // Redirect legacy MoveOps driver routes to new MoveBoss Pro driver portal
  const legacyDriverRoutes = ['/driver/app', '/driver/home', '/driver/dashboard'];
  if (legacyDriverRoutes.includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/driver';
    return NextResponse.redirect(url);
  }

  // Redirect root to appropriate page if logged in, /login if not
  if (request.nextUrl.pathname === '/' && user) {
    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();

    if (profile?.onboarding_completed && profile?.role) {
      // Go to role-appropriate dashboard
      // Note: 'company', 'carrier', 'owner_operator' all use /dashboard
      // Only 'driver' uses /driver
      if (profile.role === 'driver') {
        url.pathname = '/driver';
      } else {
        url.pathname = '/dashboard';
      }
    } else {
      // Go to onboarding
      url.pathname = '/onboarding';
    }

    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname === '/' && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
