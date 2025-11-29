import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Load } from '../types';
import { useAuth } from '../providers/AuthProvider';

export function useLoadDetail(loadId: string | null) {
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLoad = useCallback(async () => {
    if (!user || !loadId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get driver record
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        setError('Driver profile not found');
        return;
      }

      // Fetch load with company info
      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select(`
          *,
          companies (
            name,
            phone,
            email
          )
        `)
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .single();

      if (loadError) {
        throw loadError;
      }

      setLoad(loadData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch load');
    } finally {
      setLoading(false);
    }
  }, [user, loadId]);

  useEffect(() => {
    fetchLoad();
  }, [fetchLoad]);

  return { load, loading, error, refetch: fetchLoad };
}
