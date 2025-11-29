import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import {
  getStorageLocationById,
  updateStorageLocation,
  LocationType,
  TruckAccessibility,
} from '@/data/storage-locations';
import { Button } from '@/components/ui/button';
import { StorageLocationForm } from '../../new/_components/storage-location-form';

export default async function EditStorageLocationPage({
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

  async function updateAction(formData: FormData) {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const { id } = await params;
    const locationType = formData.get('location_type') as LocationType;

    const result = await updateStorageLocation(id, user.id, {
      name: formData.get('name') as string,
      code: (formData.get('code') as string) || null,
      location_type: locationType,
      address_line1: formData.get('address_line1') as string,
      address_line2: (formData.get('address_line2') as string) || null,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip: formData.get('zip') as string,
      contact_name: (formData.get('contact_name') as string) || null,
      contact_phone: (formData.get('contact_phone') as string) || null,
      contact_email: (formData.get('contact_email') as string) || null,
      access_hours: (formData.get('access_hours') as string) || null,
      access_instructions: (formData.get('access_instructions') as string) || null,
      special_notes: (formData.get('special_notes') as string) || null,
      gate_code: (formData.get('gate_code') as string) || null,
      monthly_rent: formData.get('monthly_rent')
        ? parseFloat(formData.get('monthly_rent') as string)
        : null,
      rent_due_day: formData.get('rent_due_day')
        ? parseInt(formData.get('rent_due_day') as string)
        : null,
      // Warehouse-specific fields
      operating_hours: (formData.get('operating_hours') as string) || null,
      has_loading_dock: formData.get('has_loading_dock') === 'on',
      dock_height: (formData.get('dock_height') as string) || null,
      appointment_required: formData.get('appointment_required') === 'on',
      appointment_instructions: (formData.get('appointment_instructions') as string) || null,
      // Public storage-specific fields
      facility_brand: (formData.get('facility_brand') as string) || null,
      facility_phone: (formData.get('facility_phone') as string) || null,
      unit_numbers: (formData.get('unit_numbers') as string) || null,
      account_name: (formData.get('account_name') as string) || null,
      account_number: (formData.get('account_number') as string) || null,
      authorization_notes: (formData.get('authorization_notes') as string) || null,
      // Accessibility
      truck_accessibility: (formData.get('truck_accessibility') as TruckAccessibility) || 'full',
      accessibility_notes: (formData.get('accessibility_notes') as string) || null,
      // Payment tracking
      track_payments: formData.get('track_payments') === 'on',
      alert_days_before: formData.get('alert_days_before')
        ? parseInt(formData.get('alert_days_before') as string)
        : 7,
      next_payment_due: (formData.get('next_payment_due') as string) || null,
    });

    if (result.success) {
      revalidatePath('/dashboard/storage');
      revalidatePath(`/dashboard/storage/${id}`);
      redirect(`/dashboard/storage/${id}`);
    }
  }

  const isWarehouse = location.location_type === 'warehouse';
  const title = isWarehouse ? 'Edit Warehouse' : 'Edit Public Storage';
  const description = isWarehouse
    ? 'Update warehouse details'
    : 'Update public storage details';

  return (
    <div className="container max-w-3xl py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/storage/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Location
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <StorageLocationForm
        action={updateAction}
        locationType={location.location_type as LocationType}
        submitLabel="Save Changes"
        initialData={location}
      />
    </div>
  );
}
