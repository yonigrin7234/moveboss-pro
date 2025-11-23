import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createDriver, newDriverInputSchema } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { DriverForm } from '@/components/drivers/DriverForm';
import { CreationPageShell } from '@/components/layout/CreationPageShell';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';
import { getPrimaryCompanyForUser } from '@/data/companies';

export default async function NewDriverPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const primaryCompany = await getPrimaryCompanyForUser(user.id);

  const [trucks, trailers] = await Promise.all([
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
  ]);

  async function createDriverAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
    'use server';

    const user = await getCurrentUser();
    if (!user) {
      return { errors: { _form: 'Not authenticated' } };
    }

    // re-fetch primary company in case it changed during the flow
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

    // tenancy defaults
    if (companyId) {
      cleanedData.company_id = companyId;
    }
    cleanedData.driver_type = 'company_driver';

    // Ensure required defaults so inserts don't fail when fields are skipped
    if (!cleanedData.pay_mode) {
      cleanedData.pay_mode = 'per_mile';
    }
    if (!cleanedData.license_number) {
      cleanedData.license_number = 'Pending';
    }
    if (!cleanedData.license_state) {
      cleanedData.license_state = 'NA';
    }
    const today = new Date().toISOString().split('T')[0];
    if (!cleanedData.license_expiry) {
      cleanedData.license_expiry = today;
    }
    if (!cleanedData.medical_card_expiry) {
      cleanedData.medical_card_expiry = today;
    }
    if (!cleanedData.pay_notes) {
      cleanedData.pay_notes = '';
    }
    if (!cleanedData.notes) {
      cleanedData.notes = '';
    }

    // Handle empty assigned_truck_id and assigned_trailer_id
    if (cleanedData.assigned_truck_id === '' || cleanedData.assigned_truck_id === 'unassigned') {
      cleanedData.assigned_truck_id = null;
    }
    if (cleanedData.assigned_trailer_id === '' || cleanedData.assigned_trailer_id === 'unassigned') {
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
      // Provide safe defaults so validation passes when left blank
      if (payMode === 'per_mile' && (cleanedData.rate_per_mile === undefined || cleanedData.rate_per_mile === null)) {
        cleanedData.rate_per_mile = 0;
      }
      if (payMode === 'per_cuft' && (cleanedData.rate_per_cuft === undefined || cleanedData.rate_per_cuft === null)) {
        cleanedData.rate_per_cuft = 0;
      }
      if (payMode === 'per_mile_and_cuft') {
        if (cleanedData.rate_per_mile === undefined || cleanedData.rate_per_mile === null) {
          cleanedData.rate_per_mile = 0;
        }
        if (cleanedData.rate_per_cuft === undefined || cleanedData.rate_per_cuft === null) {
          cleanedData.rate_per_cuft = 0;
        }
      }
      if (payMode === 'percent_of_revenue' && (cleanedData.percent_of_revenue === undefined || cleanedData.percent_of_revenue === null)) {
        cleanedData.percent_of_revenue = 0;
      }
      if (payMode === 'flat_daily_rate' && (cleanedData.flat_daily_rate === undefined || cleanedData.flat_daily_rate === null)) {
        cleanedData.flat_daily_rate = 0;
      }
    }

    try {
      // Pre-flight auth check
      const { createClient } = await import('@/lib/supabase-server');
      const supabase = await createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        const authErrMsg = `Authentication check failed: ${authError?.message || 'No authenticated user'}. This suggests the session isn't being picked up in the server action.`;
        console.error('[createDriverAction]', authErrMsg, { userId: user.id, authError });
        return { errors: { _form: authErrMsg } };
      }
      
      if (authUser.id !== user.id) {
        const mismatchMsg = `User ID mismatch detected:\n- Server user.id: ${user.id}\n- Auth.uid(): ${authUser.id}\n\nThis suggests a session mismatch.`;
        console.error('[createDriverAction]', mismatchMsg);
        return { errors: { _form: mismatchMsg } };
      }
      
      const validated = newDriverInputSchema.parse(cleanedData);
      
      // Debug logging
      console.log('[createDriverAction] Creating driver with:', {
        userId: user.id,
        authUid: authUser.id,
        email: user.email,
        companyId,
        driverData: { 
          first_name: validated.first_name,
          last_name: validated.last_name,
          pay_mode: validated.pay_mode,
          company_id: validated.company_id,
          owner_id: user.id, // This is what will be inserted
        },
      });
      
      const createdDriver = await createDriver(validated, user.id);
      
      // Verify driver was actually created and is accessible
      console.log('[createDriverAction] Driver created successfully:', {
        driverId: createdDriver.id,
        ownerId: createdDriver.owner_id,
        name: `${createdDriver.first_name} ${createdDriver.last_name}`,
      });
      
      // Double-check: Verify we can fetch the driver back
      const { getDriverById } = await import('@/data/drivers');
      const verifyDriver = await getDriverById(createdDriver.id, user.id, companyId || undefined);
      
      if (!verifyDriver) {
        console.error('[createDriverAction] Driver was created but cannot be retrieved!', {
          driverId: createdDriver.id,
          userId: user.id,
          companyId,
        });
        return { 
          errors: { 
            _form: 'Driver was created but cannot be retrieved. This may indicate a Row Level Security (RLS) policy issue. Please check the database directly or contact support.' 
          } 
        };
      }
      
      console.log('[createDriverAction] Driver verified and accessible:', {
        driverId: verifyDriver.id,
        name: `${verifyDriver.first_name} ${verifyDriver.last_name}`,
      });
      
      // Only redirect if we successfully created and verified the driver
      redirect('/dashboard/drivers');
    } catch (error) {
      // Enhanced error handling - make sure we catch redirect errors separately
      if (error && typeof error === 'object' && 'digest' in error) {
        // This is a Next.js redirect - let it through
        throw error;
      }
      
      // Log the actual error with full details
      const errorDetails = {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: user.id,
        email: user.email,
      };
      console.error('[createDriverAction] Error creating driver:', JSON.stringify(errorDetails, null, 2));
      
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        const errors: Record<string, string> = {};
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        });
        return { errors };
      }
      
      // Return detailed error message to user - preserve newlines for better readability
      const errorMessage = error instanceof Error ? error.message : 'Failed to create driver';
      
      // Also log to console for server-side debugging
      console.error('[createDriverAction] Returning error to form:', errorMessage);
      
      return { errors: { _form: errorMessage } };
    }
  }

  return (
    <CreationPageShell
      title="Add Driver"
      subtitle="Capture the driver profile, compliance, equipment assignment, and pay in one guided flow."
      pill="People"
    >
      <DriverForm
        trucks={trucks}
        trailers={trailers}
        onSubmit={createDriverAction}
      />
    </CreationPageShell>
  );
}
