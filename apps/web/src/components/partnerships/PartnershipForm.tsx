'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { useSetupProgress } from '@/hooks/use-setup-progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  is_carrier?: boolean;
  is_agent?: boolean;
  is_broker?: boolean;
}

interface PartnershipFormProps {
  myCompanies: Company[];
  otherCompanies: Company[];
  onAddExisting: (
    prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean } | null>;
  onInviteByEmail: (
    prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean } | null>;
}

export function PartnershipForm({
  myCompanies,
  otherCompanies,
  onAddExisting,
  onInviteByEmail,
}: PartnershipFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { markComplete } = useSetupProgress();

  const [existingState, existingAction, existingPending] = useActionState(onAddExisting, null);
  const [inviteState, inviteAction, invitePending] = useActionState(onInviteByEmail, null);

  // Handle existing partner success
  useEffect(() => {
    if (existingState?.success) {
      markComplete('first_partner_added');
      toast({
        title: 'Partner added',
        description: 'The partnership was created successfully.',
      });
      router.push('/dashboard/partnerships');
      router.refresh();
    }
  }, [existingState?.success, router, toast, markComplete]);

  // Handle invite success
  useEffect(() => {
    if (inviteState?.success) {
      markComplete('first_partner_added');
      toast({
        title: 'Invitation sent',
        description: 'The partnership invitation was sent successfully.',
      });
      router.push('/dashboard/partnerships');
      router.refresh();
    }
  }, [inviteState?.success, router, toast, markComplete]);

  return (
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
        <form action={existingAction} className="space-y-6 mt-4">
          <p className="text-sm text-muted-foreground">
            Partner with a company that already has a MoveBoss account.
          </p>

          {existingState?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{existingState.error}</AlertDescription>
            </Alert>
          )}

          {/* Show company name if only one, dropdown if multiple */}
          {myCompanies?.length === 1 ? (
            <div>
              <Label className="text-muted-foreground text-sm">Your Company</Label>
              <p className="font-medium">{myCompanies[0].name}</p>
              <input type="hidden" name="my_company_id" value={myCompanies[0].id} />
            </div>
          ) : (
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
          )}

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

          <Button type="submit" className="w-full" disabled={existingPending}>
            {existingPending ? 'Adding...' : 'Add Partner'}
          </Button>
        </form>
      </TabsContent>

      {/* Invite by Email */}
      <TabsContent value="invite">
        <form action={inviteAction} className="space-y-6 mt-4">
          <p className="text-sm text-muted-foreground">
            Send an invitation to a company not yet on MoveBoss. They will receive an email with a link to join and accept your partnership.
          </p>

          {inviteState?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{inviteState.error}</AlertDescription>
            </Alert>
          )}

          {/* Show company name if only one, dropdown if multiple */}
          {myCompanies?.length === 1 ? (
            <div>
              <Label className="text-muted-foreground text-sm">Inviting as</Label>
              <p className="font-medium">{myCompanies[0].name}</p>
              <input type="hidden" name="my_company_id" value={myCompanies[0].id} />
            </div>
          ) : (
            <div>
              <Label htmlFor="my_company_id_invite">Your Company *</Label>
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
          )}

          <div>
            <Label htmlFor="to_company_name">Their Company Name *</Label>
            <Input id="to_company_name" name="to_company_name" placeholder="ABC Trucking LLC" required />
          </div>

          <div>
            <Label htmlFor="to_email">Their Email Address *</Label>
            <Input
              id="to_email"
              name="to_email"
              type="email"
              placeholder="dispatch@abctrucking.com"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              The person at this email will receive the invitation link
            </p>
          </div>

          <div>
            <Label htmlFor="relationship_type_invite">Relationship Type *</Label>
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

          <Button type="submit" className="w-full" disabled={invitePending}>
            {invitePending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
