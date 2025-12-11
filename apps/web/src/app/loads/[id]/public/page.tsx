import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { PublicLoadClient } from './client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const adminClient = createServiceRoleClient();

  const { data: load } = await adminClient
    .from('loads')
    .select(`
      load_number,
      pickup_city,
      pickup_state,
      delivery_city,
      delivery_state,
      cubic_feet,
      companies (name)
    `)
    .eq('id', id)
    .eq('status', 'pending')
    .single();

  if (!load) {
    return { title: 'Load Not Found | MoveBoss Pro' };
  }

  const company = load.companies as unknown as { name: string } | null;
  const origin = load.pickup_city && load.pickup_state
    ? `${load.pickup_city}, ${load.pickup_state}`
    : load.pickup_city || 'Origin';
  const dest = load.delivery_city && load.delivery_state
    ? `${load.delivery_city}, ${load.delivery_state}`
    : load.delivery_city || 'Destination';

  return {
    title: `${origin} to ${dest} | ${company?.name || 'Load'} | MoveBoss Pro`,
    description: `${load.cubic_feet ? `${load.cubic_feet} CF ` : ''}moving load from ${origin} to ${dest}${company ? ` by ${company.name}` : ''}`,
    openGraph: {
      title: `Moving Load: ${origin} → ${dest}`,
      description: `${load.cubic_feet ? `${load.cubic_feet} CF ` : ''}${company ? `from ${company.name}` : ''}`,
      type: 'website',
    },
  };
}

export default async function PublicLoadPage({ params }: PageProps) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const adminClient = createServiceRoleClient();

  // Fetch the load with company info
  const { data: load, error: loadError } = await adminClient
    .from('loads')
    .select(`
      id,
      load_number,
      pickup_city,
      pickup_state,
      pickup_date,
      pickup_window_start,
      pickup_window_end,
      delivery_city,
      delivery_state,
      delivery_date,
      delivery_window_start,
      delivery_window_end,
      cubic_feet,
      rate_per_cuft,
      total_rate,
      service_type,
      description,
      status,
      company_id,
      created_at,
      companies (
        id,
        name,
        public_board_enabled,
        public_board_slug,
        public_board_show_rates,
        public_board_show_contact,
        public_board_require_auth_to_claim,
        public_board_logo_url,
        primary_contact_email,
        primary_contact_phone
      )
    `)
    .eq('id', id)
    .single();

  if (loadError || !load) {
    notFound();
  }

  // Check if load is available
  if (load.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-border/50 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Load No Longer Available</h1>
          <p className="text-muted-foreground mb-4">
            This load has already been claimed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const company = load.companies as unknown as {
    id: string;
    name: string;
    public_board_enabled: boolean;
    public_board_slug: string | null;
    public_board_show_rates: boolean;
    public_board_show_contact: boolean;
    public_board_require_auth_to_claim: boolean;
    public_board_logo_url: string | null;
    primary_contact_email: string | null;
    primary_contact_phone: string | null;
  } | null;

  // Check if this load is part of an active share link
  const { data: shareLink } = await adminClient
    .from('load_share_links')
    .select('id')
    .contains('load_ids', [id])
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const isSharedViaLink = !!shareLink;

  // Allow access if: public board is enabled OR load is shared via an active share link
  if (!company?.public_board_enabled && !isSharedViaLink) {
    notFound();
  }

  // At this point we have access - use defaults if company settings are missing
  const showRates = company?.public_board_show_rates ?? true;
  const showContact = company?.public_board_show_contact ?? false;

  // Fetch related loads from same company
  const { data: relatedLoads } = await adminClient
    .from('loads')
    .select(`
      id,
      load_number,
      pickup_city,
      pickup_state,
      pickup_date,
      delivery_city,
      delivery_state,
      cubic_feet,
      total_rate
    `)
    .eq('company_id', load.company_id)
    .eq('status', 'pending')
    .neq('id', id)
    .order('pickup_date', { ascending: true })
    .limit(6);

  return (
    <PublicLoadClient
      load={{
        id: load.id,
        load_number: load.load_number,
        pickup_city: load.pickup_city,
        pickup_state: load.pickup_state,
        pickup_date: load.pickup_date,
        pickup_window_start: load.pickup_window_start,
        pickup_window_end: load.pickup_window_end,
        delivery_city: load.delivery_city,
        delivery_state: load.delivery_state,
        delivery_date: load.delivery_date,
        delivery_window_start: load.delivery_window_start,
        delivery_window_end: load.delivery_window_end,
        cubic_feet: load.cubic_feet,
        rate_per_cuft: showRates ? load.rate_per_cuft : null,
        total_rate: showRates ? load.total_rate : null,
        service_type: load.service_type,
        description: load.description,
      }}
      company={{
        name: company?.name ?? 'Unknown Company',
        slug: company?.public_board_slug ?? null,
        logo_url: company?.public_board_logo_url ?? null,
        require_auth_to_claim: company?.public_board_require_auth_to_claim ?? false,
        show_rates: showRates,
        contact: showContact && company ? {
          email: company.primary_contact_email,
          phone: company.primary_contact_phone,
        } : null,
      }}
      relatedLoads={(relatedLoads || []).map(rl => ({
        id: rl.id,
        load_number: rl.load_number,
        pickup_city: rl.pickup_city,
        pickup_state: rl.pickup_state,
        pickup_date: rl.pickup_date,
        delivery_city: rl.delivery_city,
        delivery_state: rl.delivery_state,
        cubic_feet: rl.cubic_feet,
        total_rate: showRates ? rl.total_rate : null,
      }))}
    />
  );
}
