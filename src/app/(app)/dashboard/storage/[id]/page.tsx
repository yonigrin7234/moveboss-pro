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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{location.name}</h1>
            <Badge>
              {locationTypeLabels[location.location_type] || location.location_type}
            </Badge>
          </div>
          {location.code && <p className="text-muted-foreground">{location.code}</p>}
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
                <Key className="h-5 w-5" />
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
