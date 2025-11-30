import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { createPartnership, createInvitation } from '@/data/partnerships';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartnershipForm } from '@/components/partnerships/PartnershipForm';

export default async function NewPartnershipPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Get owner's companies
  const { data: myCompanies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name');

  // Get all companies not owned by this user (potential partners)
  const { data: otherCompanies } = await supabase
    .from('companies')
    .select('id, name, is_carrier, is_agent, is_broker, city, state')
    .neq('owner_id', user.id)
    .order('name');

  async function addExistingPartnerAction(
    _prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ): Promise<{ error?: string; success?: boolean } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    const result = await createPartnership(user.id, {
      company_a_id: formData.get('my_company_id') as string,
      company_b_id: formData.get('partner_company_id') as string,
      relationship_type: formData.get('relationship_type') as string,
      payment_terms: (formData.get('payment_terms') as string) || 'net_30',
      internal_notes: (formData.get('internal_notes') as string) || undefined,
    });

    if (result.success) {
      revalidatePath('/dashboard/partnerships');
      return { success: true };
    }

    return { error: result.error || 'Failed to create partnership' };
  }

  async function inviteByEmailAction(
    _prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ): Promise<{ error?: string; success?: boolean } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    const result = await createInvitation(user.id, {
      from_company_id: formData.get('my_company_id') as string,
      to_email: formData.get('to_email') as string,
      to_company_name: formData.get('to_company_name') as string,
      relationship_type: formData.get('relationship_type') as string,
      message: (formData.get('message') as string) || undefined,
    });

    if (result.success) {
      revalidatePath('/dashboard/partnerships');
      return { success: true };
    }

    return { error: result.error || 'Failed to send invitation' };
  }

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/partnerships">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partnerships
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Partner</CardTitle>
          <CardDescription>Add a carrier or company you work with</CardDescription>
        </CardHeader>
        <CardContent>
          <PartnershipForm
            myCompanies={myCompanies || []}
            otherCompanies={otherCompanies || []}
            onAddExisting={addExistingPartnerAction}
            onInviteByEmail={inviteByEmailAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
