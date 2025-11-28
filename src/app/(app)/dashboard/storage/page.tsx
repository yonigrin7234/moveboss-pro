import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Warehouse, MapPin, Phone, Package, Building2, Truck, AlertTriangle, Ban, Clock, Key } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { getStorageLocationsWithLoadCount, StorageLocation } from '@/data/storage-locations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const locationTypeLabels: Record<string, string> = {
  warehouse: 'Warehouse',
  public_storage: 'Public Storage',
  partner_facility: 'Partner Facility',
  container_yard: 'Container Yard',
  vault_storage: 'Vault Storage',
  other: 'Other',
};

const locationTypeColors: Record<string, string> = {
  warehouse: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  public_storage: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  partner_facility: 'bg-green-500/20 text-green-600 dark:text-green-400',
  container_yard: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  vault_storage: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  other: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
};

const accessibilityLabels: Record<string, string> = {
  full: 'Full Truck Access',
  limited: 'Limited Access',
  none: 'No Truck Access',
};

const accessibilityColors: Record<string, string> = {
  full: 'bg-green-500/20 text-green-600 dark:text-green-400',
  limited: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  none: 'bg-red-500/20 text-red-600 dark:text-red-400',
};

const AccessibilityIcon = ({ accessibility }: { accessibility: string | null }) => {
  if (accessibility === 'full') return <Truck className="h-3 w-3" />;
  if (accessibility === 'limited') return <AlertTriangle className="h-3 w-3" />;
  if (accessibility === 'none') return <Ban className="h-3 w-3" />;
  return <Truck className="h-3 w-3" />;
};

function LocationCard({ location }: { location: StorageLocation }) {
  return (
    <Link href={`/dashboard/storage/${location.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{location.name}</CardTitle>
              {location.code && (
                <p className="text-sm text-muted-foreground">{location.code}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge
                className={
                  locationTypeColors[location.location_type] || locationTypeColors.other
                }
              >
                {locationTypeLabels[location.location_type] || location.location_type}
              </Badge>
              {location.truck_accessibility && (
                <Badge
                  variant="outline"
                  className={`text-xs ${accessibilityColors[location.truck_accessibility] || ''}`}
                >
                  <AccessibilityIcon accessibility={location.truck_accessibility} />
                  <span className="ml-1">{accessibilityLabels[location.truck_accessibility] || location.truck_accessibility}</span>
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Address */}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                {location.address_line1 && <p>{location.address_line1}</p>}
                <p>
                  {location.city}, {location.state} {location.zip}
                </p>
              </div>
            </div>

            {/* Warehouse-specific info */}
            {location.location_type === 'warehouse' && (
              <>
                {location.operating_hours && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{location.operating_hours}</span>
                  </div>
                )}
                {location.has_loading_dock && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>Loading dock available{location.dock_height ? ` (${location.dock_height})` : ''}</span>
                  </div>
                )}
              </>
            )}

            {/* Public Storage-specific info */}
            {location.location_type === 'public_storage' && (
              <>
                {location.facility_brand && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{location.facility_brand}</span>
                  </div>
                )}
                {location.unit_numbers && (
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span>Units: {location.unit_numbers}</span>
                  </div>
                )}
              </>
            )}

            {/* Contact */}
            {location.contact_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>
                  {location.contact_name ? `${location.contact_name}: ` : ''}
                  {location.contact_phone}
                </span>
              </div>
            )}

            {/* Loads Count */}
            <div className="flex items-center gap-2 text-sm pt-2 border-t">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>
                {location.loads_count || 0} load
                {(location.loads_count || 0) !== 1 ? 's' : ''} in storage
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LocationsGrid({ locations, emptyMessage }: { locations: StorageLocation[]; emptyMessage: string }) {
  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
          <p className="text-muted-foreground mb-4">
            Add your warehouses, public storage units, and partner facilities
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/storage/new?type=warehouse">
                <Building2 className="h-4 w-4 mr-2" />
                Add Warehouse
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/storage/new?type=public_storage">
                <Warehouse className="h-4 w-4 mr-2" />
                Add Public Storage
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((location) => (
        <LocationCard key={location.id} location={location} />
      ))}
    </div>
  );
}

export default async function StorageLocationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const locations = await getStorageLocationsWithLoadCount(user.id);
  const totalLoads = locations.reduce((sum, loc) => sum + (loc.loads_count || 0), 0);

  const warehouses = locations.filter((l) => l.location_type === 'warehouse');
  const publicStorages = locations.filter((l) => l.location_type === 'public_storage');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Storage Locations</h1>
          <p className="text-muted-foreground">
            Manage your warehouses and storage facilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/storage/new?type=warehouse">
              <Building2 className="h-4 w-4 mr-2" />
              Add Warehouse
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/storage/new?type=public_storage">
              <Warehouse className="h-4 w-4 mr-2" />
              Add Public Storage
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{locations.length}</p>
                <p className="text-sm text-muted-foreground">Total Locations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warehouses.length}</p>
                <p className="text-sm text-muted-foreground">Warehouses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Warehouse className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publicStorages.length}</p>
                <p className="text-sm text-muted-foreground">Public Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLoads}</p>
                <p className="text-sm text-muted-foreground">Loads in Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Locations ({locations.length})
          </TabsTrigger>
          <TabsTrigger value="warehouses">
            Warehouses ({warehouses.length})
          </TabsTrigger>
          <TabsTrigger value="public_storage">
            Public Storage ({publicStorages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <LocationsGrid
            locations={locations}
            emptyMessage="No storage locations yet"
          />
        </TabsContent>

        <TabsContent value="warehouses" className="mt-4">
          <LocationsGrid
            locations={warehouses}
            emptyMessage="No warehouses yet"
          />
        </TabsContent>

        <TabsContent value="public_storage" className="mt-4">
          <LocationsGrid
            locations={publicStorages}
            emptyMessage="No public storage locations yet"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
