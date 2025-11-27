import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { createPartnership, createInvitation } from '@/data/partnerships';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  async function addExistingPartnerAction(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const result = await createPartnership(user.id, {
      company_a_id: formData.get('my_company_id') as string,
      company_b_id: formData.get('partner_company_id') as string,
      relationship_type: formData.get('relationship_type') as string,
      default_rate_type: (formData.get('default_rate_type') as string) || undefined,
      default_rate_amount: formData.get('default_rate_amount')
        ? parseFloat(formData.get('default_rate_amount') as string)
        : undefined,
      payment_terms: (formData.get('payment_terms') as string) || 'net_30',
      internal_notes: (formData.get('internal_notes') as string) || undefined,
    });

    if (result.success) {
      revalidatePath('/dashboard/partnerships');
      redirect('/dashboard/partnerships');
    }
  }

  async function inviteByEmailAction(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const result = await createInvitation(user.id, {
      from_company_id: formData.get('my_company_id') as string,
      to_email: formData.get('to_email') as string,
      to_company_name: formData.get('to_company_name') as string,
      relationship_type: formData.get('relationship_type') as string,
      message: (formData.get('message') as string) || undefined,
    });

    if (result.success) {
      revalidatePath('/dashboard/partnerships');
      redirect('/dashboard/partnerships');
    }
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
          <Tabs defaultValue="existing">
            <TabsList className="w-full">
              <TabsTrigger value="existing" className="flex-1">
                Existing Company
              </TabsTrigger>
              <TabsTrigger value="invite" className="flex-1">
                Invite by Email
              </TabsTrigger>
            </TabsList>

            {/* Add Existing Company */}
            <TabsContent value="existing">
              <form action={addExistingPartnerAction} className="space-y-6 mt-4">
                <div>
                  <Label htmlFor="my_company_id">Your Company *</Label>
                  <Select name="my_company_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your company" />
                    </SelectTrigger>
                    <SelectContent>
                      {myCompanies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="partner_company_id">Partner Company *</Label>
                  <Select name="partner_company_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherCompanies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                          {company.city && ` - ${company.city}, ${company.state}`}
                          {company.is_carrier && ' (Carrier)'}
                          {company.is_agent && ' (Agent)'}
                          {company.is_broker && ' (Broker)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="relationship_type">Relationship Type *</Label>
                  <Select name="relationship_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gives_loads">I give loads to them (they are a carrier)</SelectItem>
                      <SelectItem value="takes_loads">I take loads from them (they give me loads)</SelectItem>
                      <SelectItem value="mutual">Both directions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default_rate_type">Default Rate Type</Label>
                    <Select name="default_rate_type">
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_cuft">Per CUFT</SelectItem>
                        <SelectItem value="per_cwt">Per CWT (100 lbs)</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="default_rate_amount">Default Rate</Label>
                    <Input
                      id="default_rate_amount"
                      name="default_rate_amount"
                      type="number"
                      step="0.01"
                      placeholder="2.50"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Select name="payment_terms" defaultValue="net_30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_30">Net 30</SelectItem>
                      <SelectItem value="net_45">Net 45</SelectItem>
                      <SelectItem value="net_60">Net 60</SelectItem>
                      <SelectItem value="due_on_delivery">Due on Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="internal_notes">Internal Notes</Label>
                  <Textarea
                    id="internal_notes"
                    name="internal_notes"
                    placeholder="Notes about this partnership (only visible to you)"
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Add Partner
                </Button>
              </form>
            </TabsContent>

            {/* Invite by Email */}
            <TabsContent value="invite">
              <form action={inviteByEmailAction} className="space-y-6 mt-4">
                <div>
                  <Label htmlFor="my_company_id">Your Company *</Label>
                  <Select name="my_company_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your company" />
                    </SelectTrigger>
                    <SelectContent>
                      {myCompanies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="to_company_name">Company Name *</Label>
                  <Input id="to_company_name" name="to_company_name" placeholder="ABC Trucking LLC" required />
                </div>

                <div>
                  <Label htmlFor="to_email">Email Address *</Label>
                  <Input
                    id="to_email"
                    name="to_email"
                    type="email"
                    placeholder="dispatch@abctrucking.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="relationship_type">Relationship Type *</Label>
                  <Select name="relationship_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gives_loads">I want to give them loads (carrier)</SelectItem>
                      <SelectItem value="takes_loads">I want to take loads from them</SelectItem>
                      <SelectItem value="mutual">Both directions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Hi, we'd like to partner with you for loads in the Chicago area..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Send Invitation
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
