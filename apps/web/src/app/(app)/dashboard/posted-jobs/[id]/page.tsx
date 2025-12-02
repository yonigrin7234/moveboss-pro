import { createClient, getCurrentUser } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MarketplaceActions } from '@/components/marketplace/marketplace-actions';
import { ReliabilityBadge } from '@/components/reliability-badge';
import { LoadRequestActions } from '@/components/load-request-actions';
import { checkCarrierCompliance } from '@/data/compliance-alerts';
import { getLoadRequests, acceptLoadRequest, declineLoadRequest } from '@/data/marketplace';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Package,
  Truck,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  Shield,
  ExternalLink,
  Users,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PostedJob {
  id: string;
  job_number: string;
  load_number: string;
  load_type: string;
  posting_type: string;
  posting_status: string;
  posted_at: string;
  // Dates
  pickup_date_start: string | null;
  pickup_date_end: string | null;
  pickup_date: string | null;
  rfd_date: string | null;
  // Origin
  pickup_city: string | null;
  pickup_state: string | null;
  pickup_zip: string | null;
  loading_city: string | null;
  loading_state: string | null;
  // Destination
  dropoff_city: string | null;
  dropoff_state: string | null;
  dropoff_postal_code: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_postal_code: string | null;
  // Size & Rate
  cubic_feet: number | null;
  cubic_feet_estimate: number | null;
  rate_per_cuft: number | null;
  company_rate: number | null;
  balance_due: number | null;
  linehaul_amount: number | null;
  // Requirements
  truck_requirement: 'any' | 'semi_only' | 'box_truck_only' | null;
  is_open_to_counter: boolean;
  // Storage
  current_storage_location: string | null;
  // Carrier assignment
  assigned_carrier_id: string | null;
  assigned_carrier: { id: string; name: string } | null;
}

interface LoadRequest {
  id: string;
  load_id: string;
  carrier_id: string;
  carrier: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    mc_number: string | null;
    dot_number: string | null;
    platform_loads_completed: number;
    platform_rating: number | null;
    loads_given_back?: number | null;
    loads_accepted_total?: number | null;
  } | null;
  is_partner: boolean;
  request_type: 'accept_listed' | 'counter_offer';
  counter_offer_rate: number | null;
  offered_rate: number | null;
  accepted_company_rate: boolean;
  message: string | null;
  status: string;
  proposed_load_date_start: string | null;
  proposed_load_date_end: string | null;
  proposed_delivery_date_start: string | null;
  proposed_delivery_date_end: string | null;
  created_at: string;
  responded_at: string | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'posted':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Clock className="mr-1 h-3 w-3" />
          Posted
        </Badge>
      );
    case 'assigned':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Assigned
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Truck className="mr-1 h-3 w-3" />
          In Progress
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
          <AlertCircle className="mr-1 h-3 w-3" />
          {status}
        </Badge>
      );
  }
}

function getTypeBadge(postingType: string, loadType: string) {
  if (postingType === 'pickup') {
    return (
      <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
        <Upload className="mr-1 h-3 w-3" />
        Pickup
      </Badge>
    );
  }
  if (loadType === 'rfd' || postingType === 'load') {
    return (
      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
        <Package className="mr-1 h-3 w-3" />
        RFD Load
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-600">
      <Truck className="mr-1 h-3 w-3" />
      Live Load
    </Badge>
  );
}

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getOrigin(job: PostedJob) {
  // For RFD loads, use loading/storage location
  if (job.load_type === 'rfd' || job.posting_type === 'load') {
    const city = job.loading_city || job.pickup_city;
    const state = job.loading_state || job.pickup_state;
    const zip = job.pickup_zip;
    if (city && state) return { city, state, zip };
    if (job.current_storage_location) return { city: job.current_storage_location, state: '', zip: null };
  }
  // For pickups
  const city = job.pickup_city;
  const state = job.pickup_state;
  const zip = job.pickup_zip;
  return { city, state, zip };
}

function getDestination(job: PostedJob) {
  const city = job.dropoff_city || job.delivery_city;
  const state = job.dropoff_state || job.delivery_state;
  const zip = job.dropoff_postal_code || job.delivery_postal_code;
  return { city, state, zip };
}

export default async function PostedJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Get user's workspace company
  const { data: workspaceCompany, error: workspaceError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (workspaceError) {
    console.error('[PostedJobDetail] Workspace company error:', workspaceError);
  }

  if (!workspaceCompany) {
    console.error('[PostedJobDetail] No workspace company found for user:', user.id);
    redirect('/dashboard/posted-jobs');
  }

  // Fetch the job details
  const { data: job, error: jobError } = await supabase
    .from('loads')
    .select(`
      id, job_number, load_number, load_type, posting_type, posting_status, posted_at,
      pickup_date_start, pickup_date_end, pickup_date, rfd_date,
      pickup_city, pickup_state, pickup_zip,
      loading_city, loading_state,
      dropoff_city, dropoff_state, dropoff_postal_code,
      delivery_city, delivery_state, delivery_postal_code,
      cubic_feet, cubic_feet_estimate, rate_per_cuft, company_rate,
      balance_due, linehaul_amount,
      truck_requirement, is_open_to_counter,
      current_storage_location,
      assigned_carrier_id,
      assigned_carrier:assigned_carrier_id(id, name)
    `)
    .eq('id', id)
    .eq('posted_by_company_id', workspaceCompany.id)
    .single();

  if (jobError) {
    console.error('[PostedJobDetail] Job query error:', jobError, 'for id:', id, 'company:', workspaceCompany.id);
  }

  if (!job) {
    console.error('[PostedJobDetail] Job not found:', id);
    notFound();
  }

  const postedJob = job as unknown as PostedJob;

  // Fetch requests for this job
  const requests = (await getLoadRequests(id)) as unknown as LoadRequest[];
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const respondedRequests = requests.filter((r) => r.status !== 'pending');

  // Fetch compliance issues for each pending request's carrier
  const pendingRequestsWithCompliance = await Promise.all(
    pendingRequests.map(async (request) => {
      if (!request.carrier?.id) {
        return { ...request, complianceIssues: [] };
      }
      const { issues } = await checkCarrierCompliance(
        workspaceCompany.id,
        request.carrier.id
      );
      return { ...request, complianceIssues: issues };
    })
  );

  // Server actions for accept/decline
  async function acceptAction(formData: FormData) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const requestId = formData.get('request_id') as string;
    await acceptLoadRequest(requestId, currentUser.id);

    revalidatePath(`/dashboard/posted-jobs/${id}`);
    revalidatePath('/dashboard/posted-jobs');
    revalidatePath('/dashboard/carrier-requests');
    redirect(`/dashboard/posted-jobs/${id}`);
  }

  async function declineAction(formData: FormData) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const requestId = formData.get('request_id') as string;
    const reason = formData.get('reason') as string;

    await declineLoadRequest(requestId, currentUser.id, reason);

    revalidatePath(`/dashboard/posted-jobs/${id}`);
    revalidatePath('/dashboard/posted-jobs');
  }

  // Calculated values
  const origin = getOrigin(postedJob);
  const destination = getDestination(postedJob);
  const cuft = postedJob.cubic_feet || postedJob.cubic_feet_estimate;
  const rate = postedJob.rate_per_cuft || postedJob.company_rate;
  const totalValue = rate && cuft ? rate * cuft : null;
  const price = postedJob.posting_type === 'pickup' ? postedJob.balance_due : postedJob.linehaul_amount;
  const priceLabel = postedJob.posting_type === 'pickup' ? 'Balance Due' : 'Linehaul';
  const dateDisplay = postedJob.pickup_date_start && postedJob.pickup_date_end
    ? `${formatDate(postedJob.pickup_date_start)} - ${formatDate(postedJob.pickup_date_end)}`
    : formatDate(postedJob.pickup_date || postedJob.rfd_date);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/posted-jobs">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              {postedJob.load_number || postedJob.job_number}
            </h1>
            {getTypeBadge(postedJob.posting_type, postedJob.load_type)}
            {getStatusBadge(postedJob.posting_status)}
          </div>
          <p className="text-muted-foreground">Posted {formatDateTime(postedJob.posted_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <MarketplaceActions
            loadId={postedJob.id}
            postingStatus={postedJob.posting_status}
            isOwner
          />
        </div>
      </div>

      {/* Job Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {origin.city}, {origin.state} {origin.zip}
                </p>
                <p className="text-sm text-muted-foreground">Origin</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2 flex-1">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {destination.city}, {destination.state} {destination.zip}
                </p>
                <p className="text-sm text-muted-foreground">Destination</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Size, Rate, Date */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-semibold">{cuft ?? '-'} CUFT</p>
                <p className="text-sm text-muted-foreground">Size</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-semibold">${rate?.toFixed(2) ?? '-'}/cf</p>
                <p className="text-sm text-muted-foreground">
                  Rate {postedJob.is_open_to_counter ? '(Open)' : '(Fixed)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-semibold">{formatCurrency(totalValue || price)}</p>
                <p className="text-sm text-muted-foreground">{priceLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-semibold">{dateDisplay}</p>
                <p className="text-sm text-muted-foreground">
                  {postedJob.posting_type === 'pickup' ? 'Pickup Window' : 'Ready Date'}
                </p>
              </div>
            </div>
          </div>

          {/* Truck Requirement */}
          {postedJob.truck_requirement && postedJob.truck_requirement !== 'any' && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <Badge className={
                  postedJob.truck_requirement === 'semi_only'
                    ? 'bg-indigo-500/10 text-indigo-600'
                    : 'bg-amber-500/10 text-amber-600'
                }>
                  {postedJob.truck_requirement === 'semi_only' ? 'Semi Only' : 'Box Truck Only'}
                </Badge>
              </div>
            </>
          )}

        </CardContent>
      </Card>

      {/* Already Assigned Banner */}
      {postedJob.assigned_carrier_id && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium">
                  Assigned to {postedJob.assigned_carrier?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  This job has been assigned to a carrier
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/loads/${postedJob.id}`}>
                  View Load Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incoming Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Carrier Requests
          </h2>
          {pendingRequestsWithCompliance.length > 0 && (
            <Badge variant="secondary">
              {pendingRequestsWithCompliance.length} pending
            </Badge>
          )}
        </div>

        {/* Pending Requests */}
        {pendingRequestsWithCompliance.length > 0 && (
          <div className="space-y-4">
            {pendingRequestsWithCompliance.map((request) => (
              <Card key={request.id} className="border-yellow-500/20">
                <CardContent className="p-4 space-y-4">
                  {/* Carrier Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Truck className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-lg">
                            {request.carrier?.name}
                          </p>
                          {request.is_partner ? (
                            <Badge className="bg-blue-500/20 text-blue-500">
                              <Star className="h-3 w-3 mr-1" />
                              Partner
                            </Badge>
                          ) : (
                            <Badge variant="outline">New</Badge>
                          )}
                          <ReliabilityBadge
                            loadsGivenBack={request.carrier?.loads_given_back ?? null}
                            loadsAcceptedTotal={request.carrier?.loads_accepted_total ?? null}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.carrier?.city}, {request.carrier?.state}
                          {request.carrier?.dot_number && ` • DOT# ${request.carrier.dot_number}`}
                          {request.carrier?.mc_number && ` • MC# ${request.carrier.mc_number}`}
                        </p>
                      </div>
                    </div>

                    {/* Rate Offered */}
                    <div className="text-right">
                      {request.request_type === 'counter_offer' ? (
                        <div>
                          <p className="text-sm text-muted-foreground">Counter offer</p>
                          <p className="text-xl font-bold text-purple-500">
                            ${request.counter_offer_rate?.toFixed(2)}/cf
                          </p>
                          {rate && request.counter_offer_rate && (
                            <p className={`text-xs ${request.counter_offer_rate > rate ? 'text-red-400' : 'text-green-400'}`}>
                              {request.counter_offer_rate > rate ? '+' : ''}
                              ${((request.counter_offer_rate - rate) * (cuft || 0)).toFixed(0)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-muted-foreground">Accepted your rate</p>
                          <p className="text-xl font-bold text-green-500">
                            ${rate?.toFixed(2)}/cf
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Proposed Dates */}
                  {(request.proposed_load_date_start || request.proposed_delivery_date_start) && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                      {request.proposed_load_date_start && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Can Load
                          </p>
                          <p className="text-sm font-medium">
                            {formatDate(request.proposed_load_date_start)}
                            {request.proposed_load_date_end &&
                              request.proposed_load_date_end !== request.proposed_load_date_start && (
                                <> - {formatDate(request.proposed_load_date_end)}</>
                              )}
                          </p>
                        </div>
                      )}
                      {request.proposed_delivery_date_start && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Can Deliver
                          </p>
                          <p className="text-sm font-medium">
                            {formatDate(request.proposed_delivery_date_start)}
                            {request.proposed_delivery_date_end &&
                              request.proposed_delivery_date_end !== request.proposed_delivery_date_start && (
                                <> - {formatDate(request.proposed_delivery_date_end)}</>
                              )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Platform Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>
                        {request.carrier?.platform_loads_completed || 0} loads completed
                      </span>
                    </div>
                    {request.carrier?.platform_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{request.carrier.platform_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {request.carrier?.dot_number && (
                      <a
                        href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${request.carrier.dot_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Verify FMCSA
                      </a>
                    )}
                  </div>

                  {/* Message */}
                  {request.message && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm italic">&quot;{request.message}&quot;</p>
                    </div>
                  )}

                  {/* New Carrier Warning */}
                  {!request.is_partner && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg">
                      <Shield className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-600">
                          First time working together
                        </p>
                        <p className="text-muted-foreground">
                          Accepting will automatically add them as a partner and request
                          compliance documents (W-9, Hauling Agreement).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <LoadRequestActions
                    requestId={request.id}
                    acceptedCompanyRate={request.accepted_company_rate}
                    offeredRate={request.offered_rate}
                    complianceIssues={request.complianceIssues}
                    blockOnExpired={false}
                    acceptAction={acceptAction}
                    declineAction={declineAction}
                  />

                  <p className="text-xs text-muted-foreground text-center">
                    Requested {new Date(request.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Pending Requests */}
        {pendingRequestsWithCompliance.length === 0 && !postedJob.assigned_carrier_id && (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No carrier requests yet</h3>
              <p className="text-muted-foreground">
                Your job is visible on the Load Board. Carriers can submit requests.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Past Requests */}
        {respondedRequests.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Past Requests ({respondedRequests.length})
            </h3>

            {respondedRequests.map((request) => {
              const isAccepted = request.status === 'accepted';
              const isWithdrawn = request.status === 'withdrawn';

              return (
                <Card key={request.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{request.carrier?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.accepted_company_rate
                              ? `Accepted $${rate}/cf`
                              : request.request_type === 'counter_offer'
                                ? `Counter offered $${request.counter_offer_rate}/cf`
                                : `Offered $${request.offered_rate}/cf`}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          isAccepted
                            ? 'bg-green-500/20 text-green-500'
                            : isWithdrawn
                              ? 'bg-gray-500/20 text-gray-500'
                              : 'bg-red-500/20 text-red-500'
                        }
                      >
                        {isAccepted ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Accepted
                          </>
                        ) : isWithdrawn ? (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Withdrawn
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Declined
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
