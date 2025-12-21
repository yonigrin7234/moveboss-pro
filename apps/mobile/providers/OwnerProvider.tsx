import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

type CompanyRecord = {
  id: string;
  name: string;
  dba_name: string | null;
  is_broker: boolean;
  is_carrier: boolean;
  owner_id: string;
};

type CompanyMembershipRecord = {
  id: string;
  user_id: string;
  company_id: string;
  role: 'owner' | 'admin' | 'dispatcher' | 'driver' | 'viewer';
  company: CompanyRecord;
};

type OwnerContextValue = {
  /** Current user's company membership (owner/admin/dispatcher roles only) */
  membership: CompanyMembershipRecord | null;
  /** The company the user belongs to */
  company: CompanyRecord | null;
  /** User's role in the company */
  role: 'owner' | 'admin' | 'dispatcher' | null;
  /** Whether user is an owner/admin/dispatcher (has access to owner UI) */
  isOwnerRole: boolean;
  /** Whether data is loading */
  loading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Whether the provider is ready (loaded without error) */
  isReady: boolean;
  /** Refetch membership data */
  refetch: () => Promise<void>;
};

const OwnerContext = createContext<OwnerContextValue | undefined>(undefined);

const OWNER_ROLES = ['owner', 'admin', 'dispatcher'] as const;

export function OwnerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [membership, setMembership] = useState<CompanyMembershipRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembership = useCallback(async () => {
    if (!user?.id) {
      setMembership(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch company membership with company details
      // Only get memberships where user has owner/admin/dispatcher role
      const { data, error: membershipError } = await supabase
        .from('company_memberships')
        .select(`
          id,
          user_id,
          company_id,
          role,
          company:companies!inner(
            id,
            name,
            dba_name,
            is_broker,
            is_carrier,
            owner_id
          )
        `)
        .eq('user_id', user.id)
        .in('role', OWNER_ROLES)
        .limit(1)
        .single();

      if (membershipError) {
        // PGRST116 = no rows - not an error, just means user isn't an owner/admin/dispatcher
        if (membershipError.code === 'PGRST116') {
          setMembership(null);
          setError(null);
        } else {
          console.error('Error fetching company membership:', membershipError);
          setMembership(null);
          setError(membershipError.message);
        }
        return;
      }

      if (!data) {
        setMembership(null);
        return;
      }

      // Supabase returns company as array due to join, extract first element
      const companyData = Array.isArray(data.company) ? data.company[0] : data.company;

      setMembership({
        id: data.id,
        user_id: data.user_id,
        company_id: data.company_id,
        role: data.role as 'owner' | 'admin' | 'dispatcher',
        company: companyData,
      });
    } catch (err) {
      console.error('Error in fetchMembership:', err);
      setMembership(null);
      setError(err instanceof Error ? err.message : 'Failed to load company membership');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  const value = useMemo<OwnerContextValue>(() => {
    const memberRole = membership?.role;
    const isValidOwnerRole = memberRole === 'owner' || memberRole === 'admin' || memberRole === 'dispatcher';

    return {
      membership,
      company: membership?.company ?? null,
      role: isValidOwnerRole ? memberRole : null,
      isOwnerRole: isValidOwnerRole,
      loading,
      error,
      isReady: !loading,
      refetch: fetchMembership,
    };
  }, [membership, loading, error, fetchMembership]);

  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>;
}

export function useOwner() {
  const ctx = useContext(OwnerContext);
  if (!ctx) {
    throw new Error('useOwner must be used within an OwnerProvider');
  }
  return ctx;
}

/**
 * Hook to determine which app experience the user should see
 * Returns 'owner' if user has owner/admin/dispatcher role, 'driver' otherwise
 */
export function useAppExperience() {
  const { isOwnerRole, loading: ownerLoading, isReady: ownerReady } = useOwner();

  return useMemo(() => ({
    experience: isOwnerRole ? 'owner' as const : 'driver' as const,
    loading: ownerLoading,
    isReady: ownerReady,
  }), [isOwnerRole, ownerLoading, ownerReady]);
}
