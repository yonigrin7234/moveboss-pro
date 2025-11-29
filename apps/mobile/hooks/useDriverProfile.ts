import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

interface DriverProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive' | 'suspended';
}

export function useDriverProfile() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDriver = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: driverError } = await supabase
        .from('drivers')
        .select('id, first_name, last_name, phone, email, status')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError) {
        throw driverError;
      }

      setDriver(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch driver profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  const fullName = driver ? `${driver.first_name} ${driver.last_name}` : null;

  return { driver, fullName, loading, error, refetch: fetchDriver };
}
