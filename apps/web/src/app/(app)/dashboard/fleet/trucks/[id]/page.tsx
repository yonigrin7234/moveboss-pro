import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getTruckById, updateTruck } from '@/data/fleet';
import { getDriversForUser } from '@/data/drivers';
import { TruckForm } from '@/components/fleet/TruckForm';
import { StatusActions } from '@/components/fleet/status-actions';
import { Badge } from '@/components/ui/badge';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';

interface TruckDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TruckDetailPage({ params }: TruckDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const [truck, drivers] = await Promise.all([
    getTruckById(id, user.id),
    getDriversForUser(user.id),
  ]);

  if (!truck) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Truck Not Found</h1>
          <p className="text-muted-foreground">
            {"The truck doesn't exist or you don't have permission."}
          </p>
        </div>
        <Link
          href="/dashboard/fleet"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Back to Fleet
        </Link>
      </div>
    );
  }

  async function updateTruckAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { errors: { _form: 'Not authenticated' } };

    const fields = [
      'unit_number',
      'plate_number',
      'plate_state',
      'vin',
      'make',
      'model',
      'year',
      'current_odometer',
      'registration_expiry',
      'inspection_expiry',
      'insurance_policy_number',
      'insurance_expiry',
      'assigned_driver_id',
      'status',
      'vehicle_type',
      'cubic_capacity',
      'is_rental_unit',
      'rental_company',
      'rental_company_other',
      'rental_truck_number',
      'notes',
    ];

    const rawData = extractFormValues(formData, fields, {
      booleanFields: ['is_rental_unit'],
    });
    const cleanedData = cleanFormValues(rawData);

    // Handle empty assigned_driver_id
    if (cleanedData.assigned_driver_id === '') {
      cleanedData.assigned_driver_id = null;
    }
    // Handle empty vehicle_type and cubic_capacity
    if (cleanedData.vehicle_type === '') {
      cleanedData.vehicle_type = null;
    }
    // Tractors don't have cubic capacity
    if (cleanedData.vehicle_type === 'tractor') {
      cleanedData.cubic_capacity = null;
    }
    if (cleanedData.cubic_capacity === '' || cleanedData.cubic_capacity === null) {
      cleanedData.cubic_capacity = null;
    }
    // Handle rental fields
    if (!cleanedData.is_rental_unit) {
      cleanedData.rental_company = null;
      cleanedData.rental_company_other = null;
      cleanedData.rental_truck_number = null;
    } else {
      // Clear rental_company_other if not 'other'
      if (cleanedData.rental_company !== 'other') {
        cleanedData.rental_company_other = null;
      }
      // Handle empty rental fields
      if (cleanedData.rental_company === '') {
        cleanedData.rental_company = null;
      }
      if (cleanedData.rental_truck_number === '') {
        cleanedData.rental_truck_number = null;
      }
    }

    try {
      const { updateTruckInputSchema } = await import('@/data/fleet');
      const validated = updateTruckInputSchema.parse(cleanedData);
      await updateTruck(id, validated, user.id);
      redirect(`/dashboard/fleet/trucks/${id}`);
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        const errors: Record<string, string> = {};
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        });
        return { errors };
      }
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to update truck' } };
    }
  }

  const truckDisplayName = truck.unit_number || truck.plate_number || `Truck ${truck.id.slice(0, 8)}`;

  const initialData = {
    unit_number: truck.unit_number ?? undefined,
    plate_number: truck.plate_number ?? undefined,
    plate_state: truck.plate_state ?? undefined,
    vin: truck.vin ?? undefined,
    make: truck.make ?? undefined,
    model: truck.model ?? undefined,
    year: truck.year ?? undefined,
    current_odometer: truck.current_odometer ?? undefined,
    registration_expiry: truck.registration_expiry ?? undefined,
    inspection_expiry: truck.inspection_expiry ?? undefined,
    insurance_policy_number: (truck as any).insurance_policy_number ?? undefined,
    insurance_expiry: (truck as any).insurance_expiry ?? undefined,
    assigned_driver_id: truck.assigned_driver_id ?? undefined,
    status: truck.status,
    vehicle_type: truck.vehicle_type ?? undefined,
    cubic_capacity: truck.cubic_capacity ?? undefined,
    is_rental_unit: truck.is_rental_unit ?? false,
    rental_company: truck.rental_company ?? undefined,
    rental_company_other: truck.rental_company_other ?? undefined,
    rental_truck_number: truck.rental_truck_number ?? undefined,
    notes: truck.notes ?? undefined,
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    maintenance: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    inactive: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    archived: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              {truckDisplayName}
            </h1>
            <Badge variant="outline" className={statusColors[truck.status] || ''}>
              {truck.status.charAt(0).toUpperCase() + truck.status.slice(1)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/fleet"
            className="px-4 py-2 bg-card text-foreground border border-border rounded-md hover:bg-muted"
          >
            Back to Fleet
          </Link>
          <StatusActions
            entityType="truck"
            entityId={truck.id}
            currentStatus={truck.status}
            entityName={truckDisplayName}
          />
        </div>
      </div>
      <TruckForm
        initialData={initialData}
        drivers={drivers}
        onSubmit={updateTruckAction}
        submitLabel="Save changes"
      />
    </div>
  );
}
