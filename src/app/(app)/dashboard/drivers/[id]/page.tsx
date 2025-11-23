import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getDriverById, updateDriver, deleteDriver, type Driver } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { DriverForm } from '@/components/drivers/DriverForm';
import { DeleteDriverButton } from './delete-driver-button';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPrimaryCompanyForUser } from '@/data/companies';

function formatStatus(status: Driver['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'suspended':
      return 'Suspended';
    default:
      return status;
  }
}

interface DriverDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DriverDetailPage({ params }: DriverDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const primaryCompany = await getPrimaryCompanyForUser(user.id);

  const [driver, trucks, trailers] = await Promise.all([
    getDriverById(id, user.id, primaryCompany?.id),
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
  ]);

  if (!driver) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Driver Not Found</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The driver you're looking for doesn't exist or you don't have permission to view it.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/drivers">Back to Drivers</Link>
        </Button>
      </div>
    );
  }

  async function updateDriverAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
    'use server';

    const user = await getCurrentUser();
      if (!user) {
        return { errors: { _form: 'Not authenticated' } };
      }
    const currentCompany = await getPrimaryCompanyForUser(user.id);
    const companyId = currentCompany?.id ?? primaryCompany?.id;

    const fields = [
      'first_name',
      'last_name',
      'phone',
      'email',
      'date_of_birth',
      'start_date',
      'has_login',
      'license_number',
      'license_state',
      'license_expiry',
      'medical_card_expiry',
      'status',
      'assigned_truck_id',
      'assigned_trailer_id',
      'pay_mode',
      'rate_per_mile',
      'rate_per_cuft',
      'percent_of_revenue',
      'flat_daily_rate',
      'pay_notes',
      'notes',
    ];

    const rawData = extractFormValues(formData, fields, {
      booleanFields: ['has_login'],
    });
    const cleanedData = cleanFormValues(rawData);

    // Handle empty assigned_truck_id and assigned_trailer_id
    if (cleanedData.assigned_truck_id === '') {
      cleanedData.assigned_truck_id = null;
    }
    if (cleanedData.assigned_trailer_id === '') {
      cleanedData.assigned_trailer_id = null;
    }

    // Clear unused compensation fields based on pay_mode
    const payMode = cleanedData.pay_mode as string | undefined;
    if (payMode) {
      if (payMode !== 'per_mile' && payMode !== 'per_mile_and_cuft') {
        cleanedData.rate_per_mile = null;
      }
      if (payMode !== 'per_cuft' && payMode !== 'per_mile_and_cuft') {
        cleanedData.rate_per_cuft = null;
      }
      if (payMode !== 'percent_of_revenue') {
        cleanedData.percent_of_revenue = null;
      }
      if (payMode !== 'flat_daily_rate') {
        cleanedData.flat_daily_rate = null;
      }
    }

    try {
      const { updateDriverInputSchema } = await import('@/data/drivers');
      const validated = updateDriverInputSchema.parse(cleanedData);
      await updateDriver(id, validated, user.id, companyId);
      redirect('/dashboard/drivers');
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to update driver' } };
    }
  }

  async function deleteDriverAction() {
    'use server';
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    await deleteDriver(id, user.id);
    redirect('/dashboard/drivers');
  }

  const initialData = {
    first_name: driver.first_name,
    last_name: driver.last_name,
    phone: driver.phone || undefined,
    email: driver.email || undefined,
    date_of_birth: driver.date_of_birth || undefined,
    start_date: driver.start_date || undefined,
    has_login: driver.has_login,
    license_number: driver.license_number || undefined,
    license_state: driver.license_state || undefined,
    license_expiry: driver.license_expiry || undefined,
    medical_card_expiry: driver.medical_card_expiry || undefined,
    status: driver.status,
    assigned_truck_id: driver.assigned_truck_id || undefined,
    assigned_trailer_id: driver.assigned_trailer_id || undefined,
    pay_mode: driver.pay_mode,
    rate_per_mile: driver.rate_per_mile || undefined,
    rate_per_cuft: driver.rate_per_cuft || undefined,
    percent_of_revenue: driver.percent_of_revenue || undefined,
    flat_daily_rate: driver.flat_daily_rate || undefined,
    pay_notes: driver.pay_notes || undefined,
    notes: driver.notes || undefined,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {driver.first_name} {driver.last_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Edit driver information and compensation</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/drivers">Back to Drivers</Link>
          </Button>
          <DeleteDriverButton deleteAction={deleteDriverAction} />
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex gap-2">
        <Badge
          variant="secondary"
          className={
            driver.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : driver.status === 'suspended'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : 'bg-muted text-muted-foreground'
          }
        >
          {formatStatus(driver.status)}
        </Badge>
      </div>

      {/* Edit Form */}
      <DriverForm
        initialData={initialData}
        trucks={trucks}
        trailers={trailers}
        onSubmit={updateDriverAction}
        submitLabel="Save changes"
        cancelHref={`/dashboard/drivers/${id}`}
      />
    </div>
  );
}
