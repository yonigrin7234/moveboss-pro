import { useMemo } from 'react';
import { useDriver } from '../providers/DriverProvider';

interface DriverProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive' | 'suspended';
}

export function useDriverProfile() {
  const { driver, loading, error, refetch } = useDriver();
  const typedDriver = driver as DriverProfile | null;
  const fullName = useMemo(
    () => (typedDriver ? `${typedDriver.first_name} ${typedDriver.last_name}` : null),
    [typedDriver],
  );

  return { driver: typedDriver, fullName, loading, error, refetch };
}
