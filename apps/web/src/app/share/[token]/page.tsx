import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { SharePageClient } from './client';
import { formatCompanyName } from '@/lib/utils';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const adminClient = createServiceRoleClient();

  const { data: shareLink } = await adminClient
    .from('load_share_links')
    .select(`
      load_ids,
      companies (name)
    `)
    .eq('token', token)
    .eq('is_active', true)
    .single();

  const company = shareLink?.companies as unknown as { name: string } | null;
  const loadCount = shareLink?.load_ids?.length || 0;
  const formattedName = formatCompanyName(company?.name);

  return {
    title: formattedName
      ? `${loadCount} ${loadCount === 1 ? 'Load' : 'Loads'} from ${formattedName} | MoveBoss Pro`
      : 'Shared Loads | MoveBoss Pro',
    description: formattedName
      ? `View ${loadCount} available ${loadCount === 1 ? 'load' : 'loads'} shared by ${formattedName}`
      : 'View shared loads on MoveBoss Pro',
    openGraph: {
      title: formattedName ? `${loadCount} Available Loads` : 'Shared Loads',
      description: formattedName
        ? `View ${loadCount} available ${loadCount === 1 ? 'load' : 'loads'} shared by ${formattedName}`
        : 'View shared loads',
      type: 'website',
    },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token.length < 16) {
    notFound();
  }

  const adminClient = createServiceRoleClient();

  // Fetch the share link
  const { data: shareLink, error: linkError } = await adminClient
    .from('load_share_links')
    .select(`
      id,
      company_id,
      load_ids,
      expires_at,
      view_count,
      is_active,
      created_at,
      companies (
        id,
        name,
        public_board_slug,
        public_board_show_rates,
        public_board_show_contact,
        public_board_logo_url
      )
    `)
    .eq('token', token)
    .single();

  if (linkError || !shareLink) {
    notFound();
  }

  // Check if active
  if (!shareLink.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-border/50 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Link Deactivated</h1>
          <p className="text-muted-foreground mb-4">
            This share link has been deactivated and is no longer available.
          </p>
        </div>
      </div>
    );
  }

  // Check expiration
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-border/50 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Link Expired</h1>
          <p className="text-muted-foreground mb-4">
            This share link has expired and is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const company = shareLink.companies as unknown as {
    id: string;
    name: string;
    public_board_slug: string | null;
    public_board_show_rates: boolean;
    public_board_show_contact: boolean;
    public_board_logo_url: string | null;
  } | null;

  // Fetch the loads (only pending status)
  const { data: loads } = await adminClient
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
      description
    `)
    .in('id', shareLink.load_ids)
    .eq('status', 'pending');

  const showRates = company?.public_board_show_rates ?? true;

  const sanitizedLoads = (loads || []).map(load => ({
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
  }));

  // Increment view count (fire and forget)
  adminClient
    .from('load_share_links')
    .update({ view_count: (shareLink.view_count || 0) + 1 })
    .eq('id', shareLink.id)
    .then(() => {});

  return (
    <SharePageClient
      company={company ? {
        name: formatCompanyName(company.name),
        slug: company.public_board_slug,
        logo_url: company.public_board_logo_url,
        show_rates: showRates,
      } : null}
      loads={sanitizedLoads}
      expiresAt={shareLink.expires_at}
      totalLoads={shareLink.load_ids.length}
      availableLoads={sanitizedLoads.length}
    />
  );
}
