import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getDriverById, updateDriver, getDriversForUser, type Driver } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { DriverForm } from '@/components/drivers/DriverForm';
import { StatusActions } from '@/components/fleet/status-actions';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPrimaryCompanyForUser } from '@/data/companies';

// Force dynamic rendering to ensure fresh data after updates
export const dynamic = 'force-dynamic';

function formatStatus(status: Driver['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'suspended':
      return 'Suspended';
    case 'archived':
      return 'Archived';
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

  const [driver, trucks, trailers, allDrivers] = await Promise.all([
    getDriverById(id, user.id, primaryCompany?.id),
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
    getDriversForUser(user.id),
  ]);

  // Create driver lookup for showing which equipment is assigned to which driver
  const driverLookup: Record<string, string> = {};
  allDrivers.forEach((d) => {
    driverLookup[d.id] = `${d.first_name} ${d.last_name}`;
  });

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
    prevState: { errors?: Record<string, string>; success?: boolean } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean } | null> {
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
      'login_method',
      'license_number',
      'license_state',
      'license_expiry',
      'cdl_class',
      'cdl_endorsements',
      'cdl_restrictions',
      'medical_card_expiry',
      'twic_card_number',
      'twic_card_expiry',
      'mvr_date',
      'status',
      'assigned_truck_id',
      'assigned_trailer_id',
      'default_truck_id',
      'default_trailer_id',
      'pay_mode',
      'rate_per_mile',
      'rate_per_cuft',
      'percent_of_revenue',
      'flat_daily_rate',
      'pay_notes',
      'notes',
      'login_method',
      'reset_portal_password',
      // Location & matching settings
      'location_sharing_enabled',
      'auto_post_capacity',
      'capacity_visibility',
    ];

    const rawData = extractFormValues(formData, fields, {
      booleanFields: ['has_login', 'location_sharing_enabled', 'auto_post_capacity'],
    });
    const cleanedData = cleanFormValues(rawData);

    // Debug logging for location settings
    console.log('DRIVER_LOCATION_SETTINGS_DEBUG', {
      form_location_sharing: formData.get('location_sharing_enabled'),
      form_auto_post: formData.get('auto_post_capacity'),
      form_capacity_visibility: formData.get('capacity_visibility'),
      raw_location_sharing: rawData.location_sharing_enabled,
      raw_auto_post: rawData.auto_post_capacity,
      cleaned_location_sharing: cleanedData.location_sharing_enabled,
      cleaned_auto_post: cleanedData.auto_post_capacity,
      cleaned_capacity_visibility: cleanedData.capacity_visibility,
    });

    if (cleanedData.login_method === 'sms') cleanedData.login_method = 'phone';

    // Handle empty assigned_truck_id and assigned_trailer_id
    if (cleanedData.assigned_truck_id === '' || cleanedData.assigned_truck_id === 'unassigned') {
      cleanedData.assigned_truck_id = null;
    }
    if (cleanedData.assigned_trailer_id === '' || cleanedData.assigned_trailer_id === 'unassigned') {
      cleanedData.assigned_trailer_id = null;
    }
    // Handle empty default_truck_id and default_trailer_id
    if (cleanedData.default_truck_id === '' || cleanedData.default_truck_id === 'none') {
      cleanedData.default_truck_id = null;
    }
    if (cleanedData.default_trailer_id === '' || cleanedData.default_trailer_id === 'none') {
      cleanedData.default_trailer_id = null;
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

    // Validate portal access requirements
    const requestedHasLogin = (formData.get('has_login') as string) === 'true';
    const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const loginMethodRaw = cleanedData.login_method as string | undefined;
    const loginMethod = loginMethodRaw === 'sms' ? 'phone' : (loginMethodRaw || 'email');
    const email = cleanedData.email as string | undefined;
    const phone = cleanedData.phone as string | undefined;
    const password = (formData.get('driver_password') as string) || '';
    const passwordConfirm = (formData.get('driver_password_confirm') as string) || '';
    const reset = formData.get('reset_portal_password') === 'true';

    // Early validation: if portal access requested but service role key missing
    if (requestedHasLogin && !hasServiceRoleKey) {
      return {
        errors: {
          _form: 'Portal access cannot be enabled: SUPABASE_SERVICE_ROLE_KEY is not configured.',
        },
      };
    }

    // Force has_login to false if service role key is missing (prevent client tampering)
    if (!hasServiceRoleKey) {
      cleanedData.has_login = false;
    } else if (requestedHasLogin) {
      // Validate email or phone based on login method
      if (loginMethod === 'email' && !email) {
        return { errors: { _form: 'Email is required when enabling portal access with email login.' } };
      }
      if (loginMethod === 'phone' && !phone) {
        return { errors: { _form: 'Phone is required when enabling portal access with phone login.' } };
      }

      // Validate password requirements
      const existingAuthUserId = (driver as any).auth_user_id;
      if (reset || (requestedHasLogin && !existingAuthUserId)) {
        if (!password || !passwordConfirm) {
          return { errors: { _form: 'Password and confirmation are required for portal access.' } };
        }
        if (password !== passwordConfirm) {
          return { errors: { _form: 'Passwords do not match.' } };
        }
      } else if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
          return { errors: { _form: 'Passwords do not match.' } };
        }
      }
    }

    try {
      // DEBUG: Log cleanedData BEFORE validation
      console.log('PRE_VALIDATION_DEBUG', {
        cleanedData_location_sharing: cleanedData.location_sharing_enabled,
        cleanedData_auto_post: cleanedData.auto_post_capacity,
        cleanedData_keys: Object.keys(cleanedData),
        cleanedData_full: JSON.stringify(cleanedData),
      });

      const { updateDriverInputSchema } = await import('@/data/drivers');
      const validated = updateDriverInputSchema.parse(cleanedData);

      // CRITICAL FIX: Zod's .partial() strips boolean fields from output
      // Explicitly preserve boolean values from cleanedData (before Zod)
      const validatedWithBooleans = {
        ...validated,
        location_sharing_enabled: cleanedData.location_sharing_enabled === true,
        auto_post_capacity: cleanedData.auto_post_capacity === true,
      };

      // DEBUG: Log validated data AFTER validation
      console.log('POST_VALIDATION_DEBUG', {
        validated_location_sharing: validated.location_sharing_enabled,
        validated_auto_post: validated.auto_post_capacity,
        fixed_location_sharing: validatedWithBooleans.location_sharing_enabled,
        fixed_auto_post: validatedWithBooleans.auto_post_capacity,
        validated_keys: Object.keys(validated),
      });

      // Derive effectiveHasLogin ONLY from validated value
      const effectiveHasLogin = validated.has_login === true;

      console.log('DRIVER_ACTION_DEBUG', {
        hasServiceRoleKey,
        form_has_login: formData.get('has_login'),
        validated_has_login: validated.has_login,
        effectiveHasLogin,
        login_method: loginMethod,
        email,
        phone,
        // Location settings after fix
        fixed_location_sharing: validatedWithBooleans.location_sharing_enabled,
        fixed_auto_post: validatedWithBooleans.auto_post_capacity,
      });

      await updateDriver(id, validatedWithBooleans, user.id, companyId, {
        effectiveHasLogin,
        login_method: loginMethod as 'email' | 'phone',
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        password: password || null,
        resetPassword: reset,
      });
      // TEMPORARY DEBUG: Return what was sent to help debug
      return {
        success: true,
        _debug: {
          form_location_sharing: formData.get('location_sharing_enabled'),
          form_auto_post: formData.get('auto_post_capacity'),
          validated_location_sharing: validated.location_sharing_enabled,
          validated_auto_post: validated.auto_post_capacity,
          validated_default_truck: validated.default_truck_id,
          validated_default_trailer: validated.default_trailer_id,
        }
      } as { errors?: Record<string, string>; success?: boolean; _debug?: Record<string, unknown> };
    } catch (error) {
      // LOG THE FULL ERROR SO WE CAN SEE IT
      console.error('UPDATE_DRIVER_ACTION_ERROR', {
        error_type: error?.constructor?.name,
        error_message: error instanceof Error ? error.message : String(error),
        error_full: JSON.stringify(error, Object.getOwnPropertyNames(error || {})),
      });

      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        console.error('ZOD_VALIDATION_ERROR', { issues: zodError.issues });
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

  const driverDisplayName = `${driver.first_name} ${driver.last_name}`;

  // DEBUG: Log what we're reading from the database
  console.log('DRIVER_DETAIL_PAGE_DEBUG', {
    driver_id: driver.id,
    driver_first_name: driver.first_name,
    driver_location_sharing: (driver as any).location_sharing_enabled,
    driver_auto_post: (driver as any).auto_post_capacity,
    driver_capacity_visibility: (driver as any).capacity_visibility,
    driver_raw: JSON.stringify(driver),
  });

  const initialData = {
    first_name: driver.first_name,
    last_name: driver.last_name,
    phone: driver.phone ?? undefined,
    email: driver.email ?? undefined,
    date_of_birth: driver.date_of_birth ?? undefined,
    start_date: driver.start_date ?? undefined,
    has_login: driver.has_login,
    login_method: (driver as any).login_method || 'email',
    license_number: driver.license_number ?? undefined,
    license_state: driver.license_state ?? undefined,
    license_expiry: driver.license_expiry ?? undefined,
    cdl_class: (driver as any).cdl_class ?? undefined,
    cdl_endorsements: (driver as any).cdl_endorsements ?? undefined,
    cdl_restrictions: (driver as any).cdl_restrictions ?? undefined,
    medical_card_expiry: driver.medical_card_expiry ?? undefined,
    twic_card_number: (driver as any).twic_card_number ?? undefined,
    twic_card_expiry: (driver as any).twic_card_expiry ?? undefined,
    mvr_date: (driver as any).mvr_date ?? undefined,
    status: driver.status,
    assigned_truck_id: driver.assigned_truck_id ?? undefined,
    assigned_trailer_id: driver.assigned_trailer_id ?? undefined,
    default_truck_id: driver.default_truck_id ?? undefined,
    default_trailer_id: driver.default_trailer_id ?? undefined,
    pay_mode: driver.pay_mode,
    rate_per_mile: driver.rate_per_mile ?? undefined,
    rate_per_cuft: driver.rate_per_cuft ?? undefined,
    percent_of_revenue: driver.percent_of_revenue ?? undefined,
    flat_daily_rate: driver.flat_daily_rate ?? undefined,
    pay_notes: driver.pay_notes ?? undefined,
    notes: driver.notes ?? undefined,
    auth_user_id: driver.auth_user_id ?? undefined,
    // Location & matching settings
    location_sharing_enabled: (driver as any).location_sharing_enabled ?? false,
    auto_post_capacity: (driver as any).auto_post_capacity ?? false,
    capacity_visibility: (driver as any).capacity_visibility ?? 'private',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    inactive: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
    suspended: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    archived: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {driverDisplayName}
            </h1>
            <Badge
              variant="outline"
              className={statusColors[driver.status] || 'bg-muted text-muted-foreground'}
            >
              {formatStatus(driver.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Edit driver information and compensation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/drivers">Back to Drivers</Link>
          </Button>
          <StatusActions
            entityType="driver"
            entityId={driver.id}
            currentStatus={driver.status}
            entityName={driverDisplayName}
          />
        </div>
      </div>

      {/* Edit Form */}
      <DriverForm
        initialData={initialData}
        trucks={trucks}
        trailers={trailers}
        driverLookup={driverLookup}
        currentDriverId={id}
        onSubmit={updateDriverAction}
        submitLabel="Save changes"
        cancelHref={`/dashboard/drivers/${id}`}
        hasServiceRoleKey={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}
      />
    </div>
  );
}
