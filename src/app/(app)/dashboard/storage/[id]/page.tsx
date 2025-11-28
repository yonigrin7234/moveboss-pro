import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Clock,
  Key,
  Package,
  Edit,
  Trash2,
  Navigation,
  Building2,
  Truck,
  AlertTriangle,
  Ban,
  Calendar,
  FileText,
  DollarSign,
} from 'lucide-react';

import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getStorageLocationById, deleteStorageLocation } from '@/data/storage-locations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  if (accessibility === 'full') return <Truck className="h-4 w-4" />;
  if (accessibility === 'limited') return <AlertTriangle className="h-4 w-4" />;
  if (accessibility === 'none') return <Ban className="h-4 w-4" />;
  return <Truck className="h-4 w-4" />;
};

export default async function StorageLocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const location = await getStorageLocationById(id, user.id);

  if (!location) {
    notFound();
  }

  // Get loads at this location
  const supabase = await createClient();
  const { data: loads } = await supabase
    .from('loads')
    .select('id, load_number, customer_name, cubic_feet, load_status, storage_unit')
    .eq('storage_location_id', id)
    .in('load_status', ['pending', 'accepted', 'loading', 'loaded'])
    .order('created_at', { ascending: false });

  async function deleteAction() {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const { id } = await params;
    const result = await deleteStorageLocation(id, user.id);
    if (result.success) {
      revalidatePath('/dashboard/storage');
      redirect('/dashboard/storage');
    }
  }

  const fullAddress = [
    location.address_line1,
    location.address_line2,
    `${location.city}, ${location.state} ${location.zip}`,
  ]
    .filter(Boolean)
    .join(', ');

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/storage">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Storage Locations
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{location.name}</h1>
            <Badge className={locationTypeColors[location.location_type] || locationTypeColors.other}>
              {locationTypeLabels[location.location_type] || location.location_type}
            </Badge>
            {location.truck_accessibility && (
              <Badge
                variant="outline"
                className={accessibilityColors[location.truck_accessibility] || ''}
              >
                <AccessibilityIcon accessibility={location.truck_accessibility} />
                <span className="ml-1">{accessibilityLabels[location.truck_accessibility]}</span>
              </Badge>
            )}
          </div>
          {location.code && <p className="text-muted-foreground">{location.code}</p>}
          {location.location_type === 'public_storage' && location.facility_brand && (
            <p className="text-muted-foreground capitalize">{location.facility_brand.replace('_', ' ')}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/storage/${location.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <form action={deleteAction}>
            <Button variant="destructive" size="icon" type="submit">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              {location.address_line1 && <p>{location.address_line1}</p>}
              {location.address_line2 && <p>{location.address_line2}</p>}
              <p>
                {location.city}, {location.state} {location.zip}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-4 w-4 mr-2" />
                Open in Maps
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Contact Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {location.contact_name && <p className="font-medium">{location.contact_name}</p>}
            {location.contact_phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${location.contact_phone}`} className="hover:underline">
                  {location.contact_phone}
                </a>
              </p>
            )}
            {location.contact_email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${location.contact_email}`} className="hover:underline">
                  {location.contact_email}
                </a>
              </p>
            )}
            {!location.contact_name && !location.contact_phone && !location.contact_email && (
              <p className="text-muted-foreground">No contact info added</p>
            )}
          </CardContent>
        </Card>

        {/* Access Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Access Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {location.access_hours && (
              <div>
                <p className="text-sm text-muted-foreground">Hours</p>
                <p>{location.access_hours}</p>
              </div>
            )}
            {location.gate_code && (
              <div>
                <p className="text-sm text-muted-foreground">Gate Code</p>
                <p className="font-mono bg-muted px-2 py-1 rounded inline-block">
                  {location.gate_code}
                </p>
              </div>
            )}
            {location.access_instructions && (
              <div>
                <p className="text-sm text-muted-foreground">Instructions</p>
                <p>{location.access_instructions}</p>
              </div>
            )}
            {location.special_notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p>{location.special_notes}</p>
              </div>
            )}
            {!location.access_hours &&
              !location.gate_code &&
              !location.access_instructions &&
              !location.special_notes && (
                <p className="text-muted-foreground">No access info added</p>
              )}
          </CardContent>
        </Card>

        {/* Rental Info Card */}
        {(location.monthly_rent || location.rent_due_day) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Rental Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {location.monthly_rent && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rent</span>
                  <span className="font-medium">${location.monthly_rent.toFixed(2)}</span>
                </div>
              )}
              {location.rent_due_day && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Day</span>
                  <span className="font-medium">{location.rent_due_day}th of month</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Warehouse Details Card */}
        {location.location_type === 'warehouse' &&
          (location.operating_hours ||
            location.has_loading_dock ||
            location.appointment_required) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Warehouse Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {location.operating_hours && (
                  <div>
                    <p className="text-sm text-muted-foreground">Operating Hours</p>
                    <p>{location.operating_hours}</p>
                  </div>
                )}
                {location.has_loading_dock && (
                  <div>
                    <p className="text-sm text-muted-foreground">Loading Dock</p>
                    <p>
                      Yes{location.dock_height ? ` - ${location.dock_height}` : ''}
                    </p>
                  </div>
                )}
                {location.appointment_required && (
                  <div>
                    <p className="text-sm text-muted-foreground">Appointment</p>
                    <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                      Required
                    </p>
                    {location.appointment_instructions && (
                      <p className="text-sm mt-1">{location.appointment_instructions}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Public Storage Account Card */}
        {location.location_type === 'public_storage' &&
          (location.unit_numbers ||
            location.account_name ||
            location.account_number ||
            location.authorization_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {location.unit_numbers && (
                  <div>
                    <p className="text-sm text-muted-foreground">Unit Numbers</p>
                    <p className="font-mono bg-muted px-2 py-1 rounded inline-block">
                      {location.unit_numbers}
                    </p>
                  </div>
                )}
                {location.account_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Account Name</p>
                    <p>{location.account_name}</p>
                  </div>
                )}
                {location.account_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-mono">{location.account_number}</p>
                  </div>
                )}
                {location.facility_phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Facility Phone</p>
                    <a href={`tel:${location.facility_phone}`} className="hover:underline">
                      {location.facility_phone}
                    </a>
                  </div>
                )}
                {location.authorization_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Authorization Notes</p>
                    <p>{location.authorization_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Truck Accessibility Card */}
        {(location.truck_accessibility || location.accessibility_notes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Truck Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {location.truck_accessibility && (
                <div className="flex items-center gap-2">
                  <Badge
                    className={accessibilityColors[location.truck_accessibility] || ''}
                  >
                    <AccessibilityIcon accessibility={location.truck_accessibility} />
                    <span className="ml-1">{accessibilityLabels[location.truck_accessibility]}</span>
                  </Badge>
                </div>
              )}
              {location.accessibility_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{location.accessibility_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loads at this Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Loads at This Location ({loads?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loads || loads.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No loads currently at this location
            </p>
          ) : (
            <div className="space-y-2">
              {loads.map((load) => (
                <Link
                  key={load.id}
                  href={`/dashboard/loads/${load.id}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{load.load_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {load.customer_name || 'No customer'}
                      {load.storage_unit && ` • ${load.storage_unit}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{load.cubic_feet} CUFT</p>
                    <Badge variant="outline">{load.load_status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
