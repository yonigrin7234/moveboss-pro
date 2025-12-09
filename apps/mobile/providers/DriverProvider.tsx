import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

type DriverRecord = {
  id: string;
  owner_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  location_sharing_enabled?: boolean | null;
};

type DriverContextValue = {
  driver: DriverRecord | null;
  driverId: string | null;
  ownerId: string | null;
  loading: boolean;
  error: string | null;
  isReady: boolean;
  refetch: () => Promise<void>;
};

const DriverContext = createContext<DriverContextValue | undefined>(undefined);

export function DriverProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDriver = useCallback(async () => {
    if (!user?.id) {
      setDriver(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id, first_name, last_name, phone, email, status, location_sharing_enabled')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !data) {
        setDriver(null);
        setError('Driver profile not found');
        return;
      }

      setDriver(data);
    } catch (err) {
      setDriver(null);
      setError(err instanceof Error ? err.message : 'Failed to load driver');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  const value = useMemo<DriverContextValue>(
    () => ({
      driver,
      driverId: driver?.id ?? null,
      ownerId: driver?.owner_id ?? null,
      loading,
      error,
      isReady: !loading && !!driver,
      refetch: fetchDriver,
    }),
    [driver, loading, error, fetchDriver],
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return ctx;
}

