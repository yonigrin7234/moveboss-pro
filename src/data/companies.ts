import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { companyProfileSchema, type CompanyProfileFormValues } from '@/lib/validation/companyProfileSchema';

// Enums
export const companyTypeSchema = z.enum(['customer', 'carrier', 'both']);

export const statusSchema = z.enum(['active', 'inactive', 'suspended']);

export const verificationStatusSchema = z.enum(['unverified', 'pending', 'verified']);

export const loadingLocationTypeSchema = z.enum(['public_storage', 'warehouse']).optional();

export const trustLevelSchema = z.enum(['trusted', 'cod_required']).default('cod_required');

// Helper schemas for optional email/URL
const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
    message: 'Invalid email address',
  })
  .transform((val) => (val && val.trim() ? val.trim() : undefined));

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
    message: 'Invalid URL',
  })
  .transform((val) => (val && val.trim() ? val.trim() : undefined));

// Base schema
export const newCompanyInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    legal_name: z.string().trim().max(200).optional(),
    dba_name: z.string().trim().max(200).optional(),
    company_type: companyTypeSchema,
    relationship_role: z.enum(['takes_loads_from', 'gives_loads_to', 'both']).default('both'),
    status: statusSchema.optional().default('active'),
    dot_number: z.string().trim().max(50).optional(),
    mc_number: z.string().trim().max(50).optional(),
    scac_code: z.string().trim().max(50).optional(),

    // Primary contact
    primary_contact_name: z.string().trim().min(1, 'Primary contact name is required').max(200),
    primary_contact_email: optionalEmailSchema,
    primary_contact_phone: z.string().trim().min(1, 'Primary contact phone is required').max(50),

    // Dispatch / Loading contact
    dispatch_contact_name: z.string().trim().min(1, 'Dispatch contact name is required').max(200),
    dispatch_contact_email: optionalEmailSchema,
    dispatch_contact_phone: z.string().trim().min(1, 'Dispatch contact phone is required').max(50),
    dispatch_notes: z.string().trim().max(1000).optional(),
    loading_location_type: loadingLocationTypeSchema,
    trust_level: trustLevelSchema,

    // Main Company Address
    street: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(50).optional(),
    postal_code: z.string().trim().max(20).optional(),
    country: z.string().trim().max(50).optional().default('USA'),

    // Primary Contact Address
    primary_contact_street: z.string().trim().max(200).optional(),
    primary_contact_city: z.string().trim().max(100).optional(),
    primary_contact_state: z.string().trim().max(50).optional(),
    primary_contact_postal_code: z.string().trim().max(20).optional(),
    primary_contact_country: z.string().trim().max(50).optional().default('USA'),

    // Dispatch / Loading Contact Address
    dispatch_contact_street: z.string().trim().max(200).optional(),
    dispatch_contact_city: z.string().trim().max(100).optional(),
    dispatch_contact_state: z.string().trim().max(50).optional(),
    dispatch_contact_postal_code: z.string().trim().max(20).optional(),
    dispatch_contact_country: z.string().trim().max(50).optional().default('USA'),

    // Billing address
    billing_street: z.string().trim().max(200).optional(),
    billing_city: z.string().trim().max(100).optional(),
    billing_state: z.string().trim().max(50).optional(),
    billing_postal_code: z.string().trim().max(20).optional(),
    billing_country: z.string().trim().max(50).optional().default('USA'),
    billing_notes: z.string().trim().max(1000).optional(),
  });

export const updateCompanyInputSchema = newCompanyInputSchema.partial();

// TypeScript types
export type CompanyType = z.infer<typeof companyTypeSchema>;
export type Status = z.infer<typeof statusSchema>;
export type NewCompanyInput = z.infer<typeof newCompanyInputSchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanyInputSchema>;
export type TrustLevel = z.infer<typeof trustLevelSchema>;
export type CompanyRole = 'owner' | 'admin' | 'dispatcher' | 'driver' | 'viewer';

export interface Company {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_workspace_company: boolean;
  name: string;
  legal_name: string | null;
  dba_name: string | null;
  company_type: CompanyType;
  relationship_role: 'takes_loads_from' | 'gives_loads_to' | 'both';
  status: Status;
  is_preferred: boolean;
  dot_number: string | null;
  mc_number: string | null;
  scac_code: string | null;
  primary_contact_name: string;
  primary_contact_email: string | null;
  primary_contact_phone: string;
  dispatch_contact_name: string;
  dispatch_contact_email: string | null;
  dispatch_contact_phone: string;
  dispatch_notes: string | null;
  loading_location_type: 'public_storage' | 'warehouse' | null;
  trust_level: TrustLevel;
  // Main Company Address
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  // Primary Contact Address
  primary_contact_street: string | null;
  primary_contact_city: string | null;
  primary_contact_state: string | null;
  primary_contact_postal_code: string | null;
  primary_contact_country: string;
  // Dispatch Contact Address
  dispatch_contact_street: string | null;
  dispatch_contact_city: string | null;
  dispatch_contact_state: string | null;
  dispatch_contact_postal_code: string | null;
  dispatch_contact_country: string;
  // Billing Address
  billing_street: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string;
  billing_notes: string | null;
  // Extended profile fields
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  company_role?: string | null;
  company_capabilities?: string[] | null;
  default_distance_unit?: string | null;
  timezone?: string | null;
  notes?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  owner_name: string | null;
  owner_role: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  secondary_contact_name: string | null;
  secondary_contact_phone: string | null;
  secondary_contact_email: string | null;
}

export interface CompanyMembership {
  id: string;
  user_id: string;
  company_id: string;
  role: CompanyRole;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  company?: Company | null;
}

// Filter interface
export interface CompanyFilters {
  search?: string;
  type?: CompanyType | 'all';
  role?: 'takes_loads_from' | 'gives_loads_to' | 'both' | 'all';
  status?: Status | 'all';
}

// Data access functions
export async function getCompaniesForUser(
  userId: string,
  filters?: CompanyFilters
): Promise<Company[]> {
  const supabase = await createClient();
  let query = supabase.from('companies').select('*').eq('owner_id', userId).eq('is_workspace_company', false);

  // Apply filters
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `name.ilike.${searchTerm},dba_name.ilike.${searchTerm},primary_contact_name.ilike.${searchTerm},billing_city.ilike.${searchTerm}`
    );
  }

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('company_type', filters.type);
  }

  if (filters?.role && filters.role !== 'all') {
    query = query.eq('relationship_role', filters.role);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`);
  }

  return (data || []) as Company[];
}

export async function getCompanyById(id: string, userId: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .eq('owner_id', userId)
    .eq('is_workspace_company', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch company: ${error.message}`);
  }

  return data as Company;
}

export async function getCompaniesCountForUser(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('is_workspace_company', false);

  if (error) {
    throw new Error(`Failed to count companies: ${error.message}`);
  }

  return count || 0;
}

export async function getActiveCompaniesCountForUser(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('is_workspace_company', false)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to count active companies: ${error.message}`);
  }

  return count || 0;
}

export async function createCompany(input: NewCompanyInput, userId: string): Promise<Company> {
  const supabase = await createClient();

  const insertData: Record<string, unknown> = {
    ...input,
    owner_id: userId,
    is_workspace_company: false,
  };

  const { data, error } = await supabase.from('companies').insert(insertData).select().single();

  if (error) {
    throw new Error(`Failed to create company: ${error.message}`);
  }

  return data as Company;
}

export async function updateCompany(
  id: string,
  input: UpdateCompanyInput,
  userId: string
): Promise<Company> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('companies')
    .update(input)
    .eq('id', id)
    .eq('owner_id', userId)
    .eq('is_workspace_company', false)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Company not found or you do not have permission to update it');
    }
    throw new Error(`Failed to update company: ${error.message}`);
  }

  return data as Company;
}

export async function deleteCompany(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId)
    .eq('is_workspace_company', false);

  if (error) {
    throw new Error(`Failed to delete company: ${error.message}`);
  }
}

export async function getWorkspaceCompanyForUser(userId: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', userId)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (error.code === 'PGRST116' || msg.includes('is_workspace_company')) {
      return null;
    }
    throw new Error(`Failed to fetch workspace company: ${error.message}`);
  }

  return data as Company | null;
}

async function ensureWorkspaceMembership(userId: string, companyId: string): Promise<void> {
  const supabase = await createClient();

  // Clear any existing primaries for this user
  await supabase.from('company_memberships').update({ is_primary: false }).eq('user_id', userId);

  // Upsert the primary membership
  const { error } = await supabase.from('company_memberships').upsert(
    {
      user_id: userId,
      company_id: companyId,
      role: 'owner',
      is_primary: true,
    },
    {
      onConflict: 'user_id,company_id',
    }
  );

  if (error) {
    throw new Error(`Failed to link workspace membership: ${error.message}`);
  }
}

export async function upsertWorkspaceCompanyForUser(
  userId: string,
  values: CompanyProfileFormValues
): Promise<Company> {
  const parsed = companyProfileSchema.parse(values);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_workspace_company', true)
    .maybeSingle();

  let company: Company | null = null;

  const mapped = {
    name: parsed.name,
    phone: parsed.phone,
    email: parsed.email,
    state: parsed.state,
    city: parsed.city,
    address_line1: parsed.address_line1,
    address_line2: parsed.address_line2 ?? null,
    website: parsed.website ?? null,
    notes: parsed.notes ?? null,
    dot_number: parsed.dot_number ?? null,
    mc_number: parsed.mc_number ?? null,
    zip: parsed.zip ?? null,
    owner_name: parsed.owner_name,
    owner_role: parsed.owner_role ?? null,
    owner_phone: parsed.owner_phone,
    owner_email: parsed.owner_email,
    secondary_contact_name: parsed.secondary_contact_name ?? null,
    secondary_contact_phone: parsed.secondary_contact_phone ?? null,
    secondary_contact_email: parsed.secondary_contact_email ?? null,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('companies')
      .update({
        ...mapped,
        is_workspace_company: true,
      })
      .eq('id', existing.id)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update workspace company: ${error.message}`);
    }
    company = data as Company;
  } else {
    const { data, error } = await supabase
      .from('companies')
      .insert({
        ...mapped,
        owner_id: userId,
        is_workspace_company: true,
        relationship_role: 'both',
        company_type: 'customer',
        status: 'active',
        primary_contact_name: parsed.name,
        primary_contact_phone: parsed.phone,
        primary_contact_email: parsed.email,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workspace company: ${error.message}`);
    }
    company = data as Company;
  }

  await ensureWorkspaceMembership(userId, company.id);
  return company;
}

export async function getCompaniesStatsForUser(userId: string): Promise<{
  totalCompanies: number;
  activeCompanies: number;
}> {
  const [totalCompanies, activeCompanies] = await Promise.all([
    getCompaniesCountForUser(userId),
    getActiveCompaniesCountForUser(userId),
  ]);

  return {
    totalCompanies,
    activeCompanies,
  };
}

export type CompanySummary = Pick<Company, 'id' | 'name' | 'dba_name' | 'status' | 'owner_id'>;

export async function getMembershipsForUser(userId: string): Promise<CompanyMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company_memberships')
    .select('id, user_id, company_id, role, is_primary, created_at, updated_at, company:companies(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    // If the table does not exist yet, surface an empty list gracefully
    if (error.message?.toLowerCase().includes('company_memberships')) {
      return [];
    }
    // Network issues (e.g., fetch failed): fall back to empty to avoid crashing layout
    if (error.message?.toLowerCase().includes('fetch failed')) {
      console.error('[getMembershipsForUser] fetch failed, returning empty list');
      return [];
    }
    throw new Error(`Failed to fetch memberships: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    company_id: row.company_id,
    role: row.role,
    is_primary: row.is_primary,
    created_at: row.created_at,
    updated_at: row.updated_at,
    company: (row as any).company as Company | null,
  }));
}

export async function getPrimaryMembershipForUser(userId: string): Promise<CompanyMembership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company_memberships')
    .select('id, user_id, company_id, role, is_primary, created_at, updated_at, company:companies(*)')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle();

  if (error) {
    if (error.message?.toLowerCase().includes('company_memberships')) {
      return null;
    }
    throw new Error(`Failed to fetch primary membership: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    company_id: data.company_id,
    role: data.role,
    is_primary: data.is_primary,
    created_at: data.created_at,
    updated_at: data.updated_at,
    company: (data as any).company as Company | null,
  };
}

export async function setPrimaryCompanyForUser(userId: string, companyId: string): Promise<void> {
  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, owner_id, is_workspace_company')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate workspace company: ${error.message}`);
  }

  if (!company || !company.is_workspace_company || company.owner_id !== userId) {
    throw new Error('Only your workspace company can be set as primary.');
  }

  await ensureWorkspaceMembership(userId, companyId);
}

export async function getPrimaryCompanyForUser(userId: string): Promise<CompanySummary | null> {
  const c = await getWorkspaceCompanyForUser(userId);
  if (!c) return null;

  return {
    id: c.id,
    name: c.name,
    status: c.status,
    dba_name: (c as any).dba_name ?? null,
    owner_id: c.owner_id,
  };
}

export async function updateCompanyProfileFields(
  companyId: string,
  values: CompanyProfileFormValues,
  ownerId?: string
): Promise<void> {
  const parsed = companyProfileSchema.parse(values);
  const supabase = await createClient();

  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      state: parsed.state,
      city: parsed.city,
      address_line1: parsed.address_line1,
      address_line2: parsed.address_line2 ?? null,
      website: parsed.website ?? null,
      notes: parsed.notes ?? null,
      dot_number: parsed.dot_number ?? null,
      mc_number: parsed.mc_number ?? null,
      zip: parsed.zip ?? null,
      owner_name: parsed.owner_name,
      owner_role: parsed.owner_role ?? null,
      owner_phone: parsed.owner_phone,
      owner_email: parsed.owner_email,
      secondary_contact_name: parsed.secondary_contact_name ?? null,
      secondary_contact_phone: parsed.secondary_contact_phone ?? null,
      secondary_contact_email: parsed.secondary_contact_email ?? null,
    })
    .eq('id', companyId)
    .eq('is_workspace_company', true)
    .eq(ownerId ? 'owner_id' : 'id', ownerId ?? companyId);

  if (error) {
    throw new Error(`Failed to update company: ${error.message}`);
  }
}

export function userCanManageDrivers(membership: CompanyMembership | null): boolean {
  if (!membership) return false;
  return ['owner', 'admin', 'dispatcher'].includes(membership.role);
}

export function userCanManageCompanies(membership: CompanyMembership | null): boolean {
  if (!membership) return false;
  return ['owner', 'admin'].includes(membership.role);
}

export function userCanViewFinance(membership: CompanyMembership | null): boolean {
  if (!membership) return false;
  return ['owner', 'admin'].includes(membership.role);
}
