import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { PublicBoardClient } from './client';
import { formatCompanyName } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createServiceRoleClient();

  const { data: company } = await adminClient
    .from('companies')
    .select('name, public_board_custom_message')
    .eq('public_board_slug', slug)
    .eq('public_board_enabled', true)
    .single();

  if (!company) {
    return {
      title: 'Board Not Found | MoveBoss Pro',
    };
  }

  const formattedName = formatCompanyName(company.name);
  return {
    title: `${formattedName} Load Board | MoveBoss Pro`,
    description: company.public_board_custom_message || `View available loads from ${formattedName}`,
    openGraph: {
      title: `${formattedName} Load Board`,
      description: company.public_board_custom_message || `View available loads from ${formattedName}`,
      type: 'website',
    },
  };
}

export default async function PublicBoardPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const adminClient = createServiceRoleClient();

  // Fetch company and initial loads
  const { data: company, error: companyError } = await adminClient
    .from('companies')
    .select(`
      id,
      name,
      public_board_enabled,
      public_board_slug,
      public_board_show_rates,
      public_board_show_contact,
      public_board_require_auth_to_claim,
      public_board_custom_message,
      public_board_logo_url,
      primary_contact_email,
      primary_contact_phone,
      fmcsa_verified
    `)
    .eq('public_board_slug', slug)
    .single();

  if (companyError || !company || !company.public_board_enabled) {
    notFound();
  }

  // Fetch initial loads
  const page = parseInt((search.page as string) || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  let loadsQuery = adminClient
    .from('loads')
    .select(`
      id,
      load_number,
      pickup_city,
      pickup_state,
      pickup_postal_code,
      pickup_date,
      pickup_window_start,
      pickup_window_end,
      delivery_city,
      delivery_state,
      delivery_postal_code,
      delivery_date,
      delivery_window_start,
      delivery_window_end,
      cubic_feet,
      rate_per_cuft,
      total_rate,
      service_type,
      description,
      load_type,
      load_subtype,
      truck_requirement,
      rfd_date,
      created_at
    `, { count: 'exact' })
    .eq('company_id', company.id)
    .eq('status', 'pending')
    .order('pickup_date', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  // Apply search filters
  if (search.origin) {
    loadsQuery = loadsQuery.ilike('pickup_city', `%${search.origin}%`);
  }
  if (search.dest) {
    loadsQuery = loadsQuery.ilike('delivery_city', `%${search.dest}%`);
  }

  const { data: loads, count } = await loadsQuery;

  const showRates = company.public_board_show_rates;
  const showContact = company.public_board_show_contact;
  const companyVerified = company.fmcsa_verified ?? false;

  const sanitizedLoads = (loads || []).map(load => ({
    id: load.id,
    load_number: load.load_number,
    pickup_city: load.pickup_city,
    pickup_state: load.pickup_state,
    pickup_postal_code: load.pickup_postal_code,
    pickup_date: load.pickup_date,
    pickup_window_start: load.pickup_window_start,
    pickup_window_end: load.pickup_window_end,
    delivery_city: load.delivery_city,
    delivery_state: load.delivery_state,
    delivery_postal_code: load.delivery_postal_code,
    delivery_date: load.delivery_date,
    delivery_window_start: load.delivery_window_start,
    delivery_window_end: load.delivery_window_end,
    cubic_feet: load.cubic_feet,
    rate_per_cuft: showRates ? load.rate_per_cuft : null,
    total_rate: showRates ? load.total_rate : null,
    service_type: load.service_type,
    description: load.description,
    load_type: load.load_type,
    load_subtype: load.load_subtype,
    truck_requirement: load.truck_requirement,
    rfd_date: load.rfd_date,
    company_verified: companyVerified,
  }));

  return (
    <PublicBoardClient
      company={{
        name: formatCompanyName(company.name),
        slug: company.public_board_slug!,
        logo_url: company.public_board_logo_url,
        custom_message: company.public_board_custom_message,
        require_auth_to_claim: company.public_board_require_auth_to_claim ?? true,
        show_rates: showRates,
        contact: showContact ? {
          email: company.primary_contact_email,
          phone: company.primary_contact_phone,
        } : null,
      }}
      initialLoads={sanitizedLoads}
      pagination={{
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      }}
    />
  );
}
