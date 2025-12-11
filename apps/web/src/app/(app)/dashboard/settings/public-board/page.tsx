import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { PublicBoardSettingsClient } from './client';

export const metadata: Metadata = {
  title: 'Public Board Settings | MoveBoss Pro',
  description: 'Configure your public load board settings',
};

export default async function PublicBoardSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Get user's company with sharing settings
  const { data: membership } = await supabase
    .from('company_memberships')
    .select(`
      company_id,
      companies (
        id,
        name,
        public_board_enabled,
        public_board_slug,
        public_board_show_rates,
        public_board_show_contact,
        public_board_require_auth_to_claim,
        public_board_custom_message,
        public_board_logo_url
      )
    `)
    .eq('user_id', user.id)
    .single();

  if (!membership?.company_id) {
    redirect('/onboarding');
  }

  const company = membership.companies as unknown as {
    id: string;
    name: string;
    public_board_enabled: boolean | null;
    public_board_slug: string | null;
    public_board_show_rates: boolean | null;
    public_board_show_contact: boolean | null;
    public_board_require_auth_to_claim: boolean | null;
    public_board_custom_message: string | null;
    public_board_logo_url: string | null;
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveboss.com';

  return (
    <PublicBoardSettingsClient
      initialSettings={{
        public_board_enabled: company.public_board_enabled ?? true,
        public_board_slug: company.public_board_slug ?? '',
        public_board_show_rates: company.public_board_show_rates ?? true,
        public_board_show_contact: company.public_board_show_contact ?? true,
        public_board_require_auth_to_claim: company.public_board_require_auth_to_claim ?? true,
        public_board_custom_message: company.public_board_custom_message ?? '',
        public_board_logo_url: company.public_board_logo_url ?? '',
      }}
      companyName={company.name}
      baseUrl={baseUrl}
    />
  );
}
