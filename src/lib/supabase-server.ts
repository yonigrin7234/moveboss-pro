import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export interface UserPermissions {
  id: string;
  is_admin: boolean;
  can_post_pickups: boolean;
  can_post_loads: boolean;
  can_manage_carrier_requests: boolean;
  can_manage_drivers: boolean;
  can_manage_vehicles: boolean;
  can_manage_trips: boolean;
  can_manage_loads: boolean;
  can_view_financials: boolean;
  can_manage_settlements: boolean;
}

/**
 * Get current user's permissions from their profile.
 * Returns null if user is not authenticated or has no profile.
 * Owner/operators (no company_id) get full permissions by default.
 */
export async function getCurrentUserPermissions(): Promise<UserPermissions | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      company_id,
      is_admin,
      can_post_pickups,
      can_post_loads,
      can_manage_carrier_requests,
      can_manage_drivers,
      can_manage_vehicles,
      can_manage_trips,
      can_manage_loads,
      can_view_financials,
      can_manage_settlements
    `)
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  // Owner/operators (those without a company_id) or admins get full access
  const isOwnerOperator = !profile.company_id;
  const isAdmin = profile.is_admin === true;
  const hasFullAccess = isOwnerOperator || isAdmin;

  return {
    id: profile.id,
    is_admin: hasFullAccess,
    can_post_pickups: hasFullAccess || profile.can_post_pickups === true,
    can_post_loads: hasFullAccess || profile.can_post_loads === true,
    can_manage_carrier_requests: hasFullAccess || profile.can_manage_carrier_requests === true,
    can_manage_drivers: hasFullAccess || profile.can_manage_drivers === true,
    can_manage_vehicles: hasFullAccess || profile.can_manage_vehicles === true,
    can_manage_trips: hasFullAccess || profile.can_manage_trips === true,
    can_manage_loads: hasFullAccess || profile.can_manage_loads === true,
    can_view_financials: hasFullAccess || profile.can_view_financials === true,
    can_manage_settlements: hasFullAccess || profile.can_manage_settlements === true,
  };
}

