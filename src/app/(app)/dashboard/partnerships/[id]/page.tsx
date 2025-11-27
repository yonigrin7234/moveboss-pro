import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Truck,
  MapPin,
  FileText,
  AlertCircle,
  DollarSign,
  Package,
  PlayCircle,
  PauseCircle,
  XCircle,
} from 'lucide-react';

import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getPartnershipById, updatePartnershipStatus, updatePartnershipTerms } from '@/data/partnerships';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  paused: { label: 'Paused', color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400' },
  terminated: { label: 'Terminated', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
};

export default async function PartnershipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const partnership = await getPartnershipById(id, user.id);

  if (!partnership) {
    notFound();
  }

  const partner = partnership.company_b;
  const status = statusConfig[partnership.status] || statusConfig.pending;

  // Get recent loads with this partner
  const supabase = await createClient();
  const { data: recentLoads } = await supabase
    .from('loads')
    .select('id, load_number, load_status, total_revenue, destination_city, destination_state, created_at')
    .eq('company_id', partner?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  async function activateAction() {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    const { id } = await params;
    await updatePartnershipStatus(id, user.id, 'active');
    revalidatePath(`/dashboard/partnerships/${id}`);
  }

  async function pauseAction(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    const { id } = await params;
    const reason = formData.get('reason') as string;
    await updatePartnershipStatus(id, user.id, 'paused', reason);
    revalidatePath(`/dashboard/partnerships/${id}`);
  }

  async function terminateAction(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    const { id } = await params;
    const reason = formData.get('reason') as string;
    await updatePartnershipStatus(id, user.id, 'terminated', reason);
    revalidatePath('/dashboard/partnerships');
    redirect('/dashboard/partnerships');
  }

  async function updateTermsAction(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    const { id } = await params;
    await updatePartnershipTerms(id, user.id, {
      payment_terms: formData.get('payment_terms') as string,
      internal_notes: (formData.get('internal_notes') as string) || undefined,
    });
    revalidatePath(`/dashboard/partnerships/${id}`);
  }

  const partnerType = partner?.is_carrier
    ? 'Carrier'
    : partner?.is_agent
      ? 'Agent'
      : partner?.is_broker
        ? 'Broker'
        : 'Company';

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/partnerships">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Partnerships
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            {partner?.is_carrier ? (
              <Truck className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{partner?.name}</h1>
            <p className="text-muted-foreground">{partnerType}</p>
          </div>
        </div>
        <Badge className={status.color} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
          {status.label}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-3xl font-bold">{partnership.total_loads}</p>
            <p className="text-sm text-muted-foreground">Total Loads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-3xl font-bold">${(partnership.total_revenue || 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-3xl font-bold">
              {partnership.last_load_at ? new Date(partnership.last_load_at).toLocaleDateString() : '-'}
            </p>
            <p className="text-sm text-muted-foreground">Last Load</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Partner Info */}
        <Card>
          <CardHeader>
            <CardTitle>Partner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {partner?.city && partner?.state && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {partner.city}, {partner.state}
                </span>
              </div>
            )}
            {partner?.mc_number && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>MC# {partner.mc_number}</span>
              </div>
            )}
            {partner?.dot_number && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>DOT# {partner.dot_number}</span>
              </div>
            )}

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Compliance Status</span>
              <Badge
                className={
                  partner?.compliance_status === 'complete'
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                }
              >
                {partner?.compliance_status || 'Unknown'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Partner Since</span>
              <span>{new Date(partnership.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateTermsAction} className="space-y-4">
              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select name="payment_terms" defaultValue={partnership.payment_terms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_45">Net 45</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="internal_notes">Internal Notes</Label>
                <Textarea name="internal_notes" defaultValue={partnership.internal_notes || ''} rows={2} />
              </div>

              <Button type="submit" variant="outline" size="sm">
                Save Terms
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Recent Loads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Loads</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentLoads || recentLoads.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No loads with this partner yet</p>
          ) : (
            <div className="space-y-2">
              {recentLoads.map((load) => (
                <Link
                  key={load.id}
                  href={`/dashboard/loads/${load.id}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{load.load_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {load.destination_city}, {load.destination_state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(load.total_revenue || 0).toLocaleString()}</p>
                    <Badge variant="outline">{load.load_status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Partnership Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {partnership.status === 'paused' && (
            <div className="flex items-start gap-3 p-4 bg-orange-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-600 dark:text-orange-400">Partnership Paused</p>
                {partnership.paused_reason && (
                  <p className="text-sm text-muted-foreground mt-1">Reason: {partnership.paused_reason}</p>
                )}
                <form action={activateAction} className="mt-2">
                  <Button type="submit" size="sm" variant="outline">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Reactivate
                  </Button>
                </form>
              </div>
            </div>
          )}

          {partnership.status === 'active' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form action={pauseAction} className="space-y-2">
                <Label>Pause Partnership</Label>
                <Input name="reason" placeholder="Reason for pausing (optional)" />
                <Button type="submit" variant="outline" className="w-full">
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Pause Partnership
                </Button>
              </form>

              <form action={terminateAction} className="space-y-2">
                <Label>End Partnership</Label>
                <Input name="reason" placeholder="Reason for ending (optional)" />
                <Button type="submit" variant="destructive" className="w-full">
                  <XCircle className="h-4 w-4 mr-2" />
                  Terminate Partnership
                </Button>
              </form>
            </div>
          )}

          {partnership.status === 'pending' && (
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-600 dark:text-yellow-400">Pending Approval</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Waiting for the partner to accept the invitation.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
