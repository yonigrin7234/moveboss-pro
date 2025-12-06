import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getLatestLocationsForOwner } from '@/data/location';
import { LiveFleetDashboard } from '@/components/fleet/LiveFleetDashboard';

export default async function LiveFleetPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const locations = await getLatestLocationsForOwner(user.id);

  // Calculate initial stats
  const totalDrivers = locations.length;
  const availableDrivers = locations.filter((loc) => loc.is_available_for_loads).length;
  const averageCapacity =
    locations.length > 0
      ? Math.round(
          locations.reduce((sum, loc) => sum + (loc.available_cubic ?? 0), 0) / locations.length
        )
      : 0;

  return (
    <LiveFleetDashboard
      initialLocations={locations}
      initialStats={{
        totalDrivers,
        availableDrivers,
        averageCapacity,
      }}
    />
  );
}
