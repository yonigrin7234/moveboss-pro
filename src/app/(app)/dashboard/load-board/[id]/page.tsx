import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import { getMarketplaceLoadWithRequestStatus, createLoadRequest, withdrawLoadRequest } from '@/data/marketplace';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  MapPin,
  Package,
  Building2,
  Clock,
  Zap,
  Truck,
  Star,
  ArrowRight,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
} from 'lucide-react';

function formatRate(rate: number | null, rateType: string): string {
  if (!rate) return 'Make an offer';
  const formatted = rate.toLocaleString('en-US', { minimumFractionDigits: 2 });
  if (rateType === 'flat') return `$${formatted} flat`;
  if (rateType === 'per_cuft') return `$${formatted}/cuft`;
  if (rateType === 'per_lb') return `$${formatted}/lb`;
  return `$${formatted}`;
}

function timeAgo(dateString: string) {
  const now = new Date();
  const then = new Date(dateString);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LoadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const workspaceCompany = await getWorkspaceCompanyForUser(user.id);
  if (!workspaceCompany) {
    redirect('/onboarding/workspace');
  }

  const load = await getMarketplaceLoadWithRequestStatus(id, user.id);
  if (!load) {
    notFound();
  }

  const company = Array.isArray(load.company) ? load.company[0] : load.company;

  // Server action to submit request
  async function submitRequest(formData: FormData) {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const workspaceCompany = await getWorkspaceCompanyForUser(user.id);
    if (!workspaceCompany) redirect('/onboarding/workspace');

    const requestType = formData.get('request_type') as 'accept_listed' | 'counter_offer';
    const counterOfferRate = requestType === 'counter_offer'
      ? parseFloat(formData.get('counter_offer_rate') as string)
      : undefined;
    const message = formData.get('message') as string;

    // Get date values
    const proposedLoadDateStart = formData.get('proposed_load_date_start') as string || undefined;
    const proposedLoadDateEnd = formData.get('proposed_load_date_end') as string || undefined;
    const proposedDeliveryDateStart = formData.get('proposed_delivery_date_start') as string || undefined;
    const proposedDeliveryDateEnd = formData.get('proposed_delivery_date_end') as string || undefined;

    const result = await createLoadRequest(user.id, workspaceCompany.id, {
      load_id: id,
      request_type: requestType,
      counter_offer_rate: counterOfferRate,
      accepted_company_rate: requestType === 'accept_listed',
      proposed_load_date_start: proposedLoadDateStart,
      proposed_load_date_end: proposedLoadDateEnd,
      proposed_delivery_date_start: proposedDeliveryDateStart,
      proposed_delivery_date_end: proposedDeliveryDateEnd,
      message: message || undefined,
    });

    if (!result.success) {
      // In a real app, you'd want better error handling
      throw new Error(result.error || 'Failed to submit request');
    }

    revalidatePath(`/dashboard/load-board/${id}`);
    redirect('/dashboard/my-requests');
  }

  // Server action to withdraw request
  async function withdrawRequest() {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const load = await getMarketplaceLoadWithRequestStatus(id, user.id);
    if (!load?.my_request_id) return;

    await withdrawLoadRequest(load.my_request_id);
    revalidatePath(`/dashboard/load-board/${id}`);
  }

  const hasExistingRequest = load.my_request_status === 'pending';
  const requestAccepted = load.my_request_status === 'accepted';
  const requestDeclined = load.my_request_status === 'declined' || load.my_request_status === 'withdrawn';

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/load-board"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Load Board
      </Link>

      {/* Load Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold mb-2">
            <MapPin className="h-5 w-5" />
            <span>{load.origin_city}, {load.origin_state}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span>{load.destination_city}, {load.destination_state}</span>
          </div>
          <p className="text-muted-foreground">
            Load #{load.load_number} • Posted {timeAgo(load.posted_to_marketplace_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {load.is_ready_now && (
            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
              <Zap className="h-3 w-3 mr-1" />
              Ready Now
            </Badge>
          )}
          {load.delivery_urgency === 'expedited' && (
            <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">
              <Clock className="h-3 w-3 mr-1" />
              Expedited
            </Badge>
          )}
          {load.delivery_urgency === 'flexible' && (
            <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
              Flexible
            </Badge>
          )}
          {load.equipment_type && (
            <Badge variant="outline">
              <Truck className="h-3 w-3 mr-1" />
              {load.equipment_type === 'box_truck' ? 'Box Truck' : 'Semi Trailer'}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Posted By
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">{company?.name || 'Unknown Company'}</p>
                  {company?.city && company?.state && (
                    <p className="text-muted-foreground">{company.city}, {company.state}</p>
                  )}
                </div>
                {company?.platform_rating && (
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold">{company.platform_rating.toFixed(1)}</span>
                    </div>
                    {company.platform_loads_completed > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {company.platform_loads_completed} loads completed
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Load Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Load Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Origin</p>
                  <p className="font-medium">{load.origin_city}, {load.origin_state}</p>
                  <p className="text-sm text-muted-foreground">{load.origin_zip}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-medium">{load.destination_city}, {load.destination_state}</p>
                  <p className="text-sm text-muted-foreground">{load.destination_zip}</p>
                </div>
                {load.estimated_cuft && (
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="font-medium">{load.estimated_cuft.toLocaleString()} cuft</p>
                    {load.estimated_weight_lbs && (
                      <p className="text-sm text-muted-foreground">
                        ~{load.estimated_weight_lbs.toLocaleString()} lbs
                      </p>
                    )}
                  </div>
                )}
                {load.pieces_count && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pieces</p>
                    <p className="font-medium">{load.pieces_count}</p>
                  </div>
                )}
              </div>

              {load.available_date && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Available: {new Date(load.available_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              {load.special_instructions && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Special Instructions</p>
                  <p className="text-sm">{load.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Request Sidebar */}
        <div className="space-y-6">
          {/* Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatRate(load.company_rate, load.company_rate_type)}
              </p>
              {load.rate_is_fixed ? (
                <p className="text-sm text-muted-foreground mt-1">Fixed rate - no negotiation</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Open to offers</p>
              )}
            </CardContent>
          </Card>

          {/* Request Status or Form */}
          {requestAccepted ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Request Accepted!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your request has been accepted. Check your loads for next steps.
                </p>
                <Button asChild>
                  <Link href="/dashboard/loads">View My Loads</Link>
                </Button>
              </CardContent>
            </Card>
          ) : requestDeclined ? (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-6 text-center">
                <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Request {load.my_request_status === 'withdrawn' ? 'Withdrawn' : 'Declined'}</h3>
                <p className="text-sm text-muted-foreground">
                  {load.my_request_status === 'withdrawn'
                    ? 'You withdrew your request for this load.'
                    : 'Your request was not accepted for this load.'}
                </p>
              </CardContent>
            </Card>
          ) : hasExistingRequest ? (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Request Pending</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You already have a pending request for this load. The company will review and respond.
                </p>
                <form action={withdrawRequest}>
                  <Button variant="outline" type="submit" className="w-full">
                    Withdraw Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Request This Load</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={submitRequest} className="space-y-4">
                  {/* Rate Section */}
                  {!load.is_open_to_counter ? (
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm font-medium mb-1">Rate</p>
                      <p className="text-2xl font-bold">
                        {formatRate(load.company_rate, load.company_rate_type)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This is a fixed rate - no counter offers
                      </p>
                      <input type="hidden" name="request_type" value="accept_listed" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg border">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="request_type"
                            value="accept_listed"
                            className="h-4 w-4"
                            defaultChecked
                          />
                          <div>
                            <p className="font-medium">
                              Accept {formatRate(load.company_rate, load.company_rate_type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Accept the company&apos;s posted rate
                            </p>
                          </div>
                        </label>
                      </div>

                      <div className="p-3 rounded-lg border">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="request_type"
                            value="counter_offer"
                            className="h-4 w-4 mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium">Make a counter-offer</p>
                            <div className="mt-2">
                              <Label htmlFor="counter_offer_rate" className="text-xs">
                                Your Rate ($/cuft)
                              </Label>
                              <Input
                                id="counter_offer_rate"
                                name="counter_offer_rate"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g. 0.75"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Proposed Dates Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label className="text-sm font-medium">When can you load?</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label htmlFor="proposed_load_date_start" className="text-xs text-muted-foreground">
                            From
                          </Label>
                          <Input
                            id="proposed_load_date_start"
                            name="proposed_load_date_start"
                            type="date"
                            className="mt-1"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="proposed_load_date_end" className="text-xs text-muted-foreground">
                            To
                          </Label>
                          <Input
                            id="proposed_load_date_end"
                            name="proposed_load_date_end"
                            type="date"
                            className="mt-1"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">When can you deliver?</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label htmlFor="proposed_delivery_date_start" className="text-xs text-muted-foreground">
                            From
                          </Label>
                          <Input
                            id="proposed_delivery_date_start"
                            name="proposed_delivery_date_start"
                            type="date"
                            className="mt-1"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="proposed_delivery_date_end" className="text-xs text-muted-foreground">
                            To
                          </Label>
                          <Input
                            id="proposed_delivery_date_end"
                            name="proposed_delivery_date_end"
                            type="date"
                            className="mt-1"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Add a message to the company..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Submit Request
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    The company will review your request and respond
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
