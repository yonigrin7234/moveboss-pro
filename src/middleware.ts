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

  // Redirect /login to /dashboard if already logged in
  if (request.nextUrl.pathname === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Ensure workspace company exists before accessing dashboard areas
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
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

  // Redirect root to /dashboard if logged in, /login if not
  if (request.nextUrl.pathname === '/' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
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
