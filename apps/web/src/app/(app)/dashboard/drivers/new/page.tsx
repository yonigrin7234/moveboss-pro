import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createDriver, newDriverInputSchema, getDriversForUser } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { DriverForm } from '@/components/drivers/DriverForm';
import { CreationPageShell } from '@/components/layout/CreationPageShell';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';
import { getPrimaryCompanyForUser } from '@/data/companies';

export async function createDriverAction(
  prevState: { errors?: Record<string, string>; success?: boolean; driverId?: string } | null,
  formData: FormData
): Promise<{ errors?: Record<string, string>; success?: boolean; driverId?: string } | null> {
  'use server';

  console.log('[createDriverAction] Form submitted');

  const user = await getCurrentUser();
  if (!user) {
    console.error('[createDriverAction] No user found');
    return { errors: { _form: 'Not authenticated' } };
  }

  console.log('[createDriverAction] User authenticated:', user.id);

  // Extract form fields - match exactly what the debug endpoint does
  const first_name = formData.get('first_name') as string;
  const last_name = formData.get('last_name') as string;
  const phone = formData.get('phone') as string | null;
  const email = formData.get('email') as string | null;
  const status = (formData.get('status') as string) || 'active';
  const pay_mode = (formData.get('pay_mode') as string) || 'per_mile';
  const license_number = (formData.get('license_number') as string) || 'Pending';
  const license_state = (formData.get('license_state') as string) || 'NA';
  const license_expiry = (formData.get('license_expiry') as string) || new Date().toISOString().split('T')[0];
  const cdl_class = formData.get('cdl_class') as string | null;
  const cdl_endorsements = formData.get('cdl_endorsements') as string | null;
  const cdl_restrictions = formData.get('cdl_restrictions') as string | null;
  const medical_card_expiry = (formData.get('medical_card_expiry') as string) || new Date().toISOString().split('T')[0];
  const twic_card_number = formData.get('twic_card_number') as string | null;
  const twic_card_expiry = formData.get('twic_card_expiry') as string | null;
  const mvr_date = formData.get('mvr_date') as string | null;
  const assigned_truck_id = formData.get('assigned_truck_id') as string | null;
  const assigned_trailer_id = formData.get('assigned_trailer_id') as string | null;
  const default_truck_id = formData.get('default_truck_id') as string | null;
  const default_trailer_id = formData.get('default_trailer_id') as string | null;
  const rate_per_mile_raw = formData.get('rate_per_mile') as string | null;
  const rate_per_cuft_raw = formData.get('rate_per_cuft') as string | null;
  const percent_of_revenue_raw = formData.get('percent_of_revenue') as string | null;
  const flat_daily_rate_raw = formData.get('flat_daily_rate') as string | null;
  const requestedHasLogin = (formData.get('has_login') as string) === 'true';
  const login_method_raw = (formData.get('login_method') as string) || 'email';
  const login_method = login_method_raw === 'sms' ? 'phone' : login_method_raw;
  const password = (formData.get('driver_password') as string) || '';
  const passwordConfirm = (formData.get('driver_password_confirm') as string) || '';
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Early validation: if portal access requested but service role key missing
  if (requestedHasLogin && !hasServiceRoleKey) {
    return {
      errors: {
        _form: 'Portal access cannot be enabled: SUPABASE_SERVICE_ROLE_KEY is not configured.',
      },
    };
  }

  const toNumber = (val: string | null) => {
    if (val === null || val === undefined || val === '') return undefined;
    const num = parseFloat(val);
    return Number.isFinite(num) ? num : undefined;
  };

  // Validate required fields
  if (!first_name || !last_name) {
    return { errors: { _form: 'First name and last name are required' } };
  }

  // Build insert payload
  const insertPayload: any = {
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    phone: phone?.trim() || undefined,
    email: email?.trim() || undefined,
    status: status as 'active' | 'inactive' | 'suspended',
    pay_mode: pay_mode as 'per_mile' | 'per_cuft' | 'per_mile_and_cuft' | 'percent_of_revenue' | 'flat_daily_rate',
    driver_type: 'company_driver' as const,
    license_number: license_number || 'Pending',
    license_state: license_state || 'NA',
    license_expiry: license_expiry || new Date().toISOString().split('T')[0],
    medical_card_expiry: medical_card_expiry || new Date().toISOString().split('T')[0],
    has_login: requestedHasLogin && hasServiceRoleKey,
    login_method,
  };

  // Handle optional compliance fields
  if (cdl_class?.trim()) {
    insertPayload.cdl_class = cdl_class.trim();
  }
  if (cdl_endorsements?.trim()) {
    insertPayload.cdl_endorsements = cdl_endorsements.trim();
  }
  if (cdl_restrictions?.trim()) {
    insertPayload.cdl_restrictions = cdl_restrictions.trim();
  }
  if (twic_card_number?.trim()) {
    insertPayload.twic_card_number = twic_card_number.trim();
  }
  if (twic_card_expiry) {
    insertPayload.twic_card_expiry = twic_card_expiry;
  }
  if (mvr_date) {
    insertPayload.mvr_date = mvr_date;
  }

  // Handle optional fields
  if (assigned_truck_id && assigned_truck_id !== '' && assigned_truck_id !== 'unassigned') {
    insertPayload.assigned_truck_id = assigned_truck_id;
  }
  if (assigned_trailer_id && assigned_trailer_id !== '' && assigned_trailer_id !== 'unassigned') {
    insertPayload.assigned_trailer_id = assigned_trailer_id;
  }
  // Handle default equipment fields
  if (default_truck_id && default_truck_id !== '' && default_truck_id !== 'none') {
    insertPayload.default_truck_id = default_truck_id;
  }
  if (default_trailer_id && default_trailer_id !== '' && default_trailer_id !== 'none') {
    insertPayload.default_trailer_id = default_trailer_id;
  }

  // Compensation numbers based on pay mode
  if (pay_mode === 'per_mile' || pay_mode === 'per_mile_and_cuft') {
    insertPayload.rate_per_mile = toNumber(rate_per_mile_raw);
  }
  if (pay_mode === 'per_cuft' || pay_mode === 'per_mile_and_cuft') {
    insertPayload.rate_per_cuft = toNumber(rate_per_cuft_raw);
  }
  if (pay_mode === 'percent_of_revenue') {
    insertPayload.percent_of_revenue = toNumber(percent_of_revenue_raw);
  }
  if (pay_mode === 'flat_daily_rate') {
    insertPayload.flat_daily_rate = toNumber(flat_daily_rate_raw);
  }

  // Add company_id if available
  const currentCompany = await getPrimaryCompanyForUser(user.id);
  if (currentCompany?.id) {
    insertPayload.company_id = currentCompany.id;
  }

  // Validate portal access requirements if enabled
  if (requestedHasLogin && hasServiceRoleKey) {
    // Validate email or phone based on login method
    if (login_method === 'email' && !email) {
      return { errors: { _form: 'Email is required when enabling portal access with email login.' } };
    }
    if (login_method === 'phone' && !phone) {
      return { errors: { _form: 'Phone is required when enabling portal access with phone login.' } };
    }
    
    if (!password || !passwordConfirm) {
      return { errors: { _form: 'Password and confirmation are required for portal access.' } };
    }
    if (password !== passwordConfirm) {
      return { errors: { _form: 'Passwords do not match.' } };
    }
  }

  try {
    // Validate with schema
    const validated = newDriverInputSchema.parse(insertPayload);
    
    // Derive effectiveHasLogin ONLY from validated value
    const effectiveHasLogin = validated.has_login === true;

    console.log('DRIVER_ACTION_DEBUG', {
      hasServiceRoleKey,
      form_has_login: formData.get('has_login'),
      validated_has_login: validated.has_login,
      effectiveHasLogin,
      login_method,
      email,
      phone,
    });

    const createdDriver = await createDriver(validated, user.id, {
      effectiveHasLogin,
      login_method: login_method as 'email' | 'phone',
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      password: effectiveHasLogin ? password : null,
    });
    
    console.log('[createDriverAction] Driver created:', createdDriver.id);
    
    // Return success so client can toast then navigate
    return { success: true, driverId: createdDriver.id };
  } catch (error) {
    // Handle redirect separately
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    
    console.error('[createDriverAction] Error:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      const errors: Record<string, string> = {};
      zodError.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
      return { errors };
    }
    
    // Return error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to create driver';
    return { errors: { _form: errorMessage } };
  }
}

export default async function NewDriverPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [trucks, trailers, drivers] = await Promise.all([
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
    getDriversForUser(user.id),
  ]);

  // Create driver lookup for showing which equipment is assigned to which driver
  const driverLookup: Record<string, string> = {};
  drivers.forEach((driver) => {
    driverLookup[driver.id] = `${driver.first_name} ${driver.last_name}`;
  });

  // Check if service role key is configured
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <CreationPageShell
      title="Add Driver"
      subtitle="Capture the driver profile, compliance, equipment assignment, and pay in one guided flow."
      pill="People"
    >
      <DriverForm
        trucks={trucks}
        trailers={trailers}
        driverLookup={driverLookup}
        onSubmit={createDriverAction}
        hasServiceRoleKey={hasServiceRoleKey}
      />
    </CreationPageShell>
  );
}
