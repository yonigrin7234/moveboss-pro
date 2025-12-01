import { createClient, getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Building2,
  DollarSign,
  MapPin,
  Package,
  MessageSquare,
  Calendar,
  BadgeCheck,
  AlertTriangle,
} from 'lucide-react';
import { RequestActions } from './request-actions';
import { getCompanyBalancesBatch } from '@/data/company-ledger';

interface CarrierRequest {
  id: string;
  status: string;
  request_type: 'accept_listed' | 'counter_offer' | null;
  offered_rate: number | null;
  offered_rate_type: string | null;
  counter_offer_rate: number | null;
  accepted_company_rate: boolean | null;
  message: string | null;
  created_at: string;
  proposed_load_date_start: string | null;
  proposed_load_date_end: string | null;
  proposed_delivery_date_start: string | null;
  proposed_delivery_date_end: string | null;
  carrier: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    mc_number: string | null;
    dot_number: string | null;
    fmcsa_verified: boolean | null;
    platform_rating: number | null;
    platform_loads_completed: number | null;
  } | null;
  load: {
    id: string;
    load_number: string;
    load_type: string;
    posting_type: string;
    pickup_city: string | null;
    pickup_state: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
    cubic_feet_estimate: number | null;
    balance_due: number | null;
    linehaul_amount: number | null;
    company_rate: number | null;
    rate_per_cuft: number | null;
  } | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case 'accepted':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Accepted
        </Badge>
      );
    case 'declined':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="mr-1 h-3 w-3" />
          Declined
        </Badge>
      );
    case 'withdrawn':
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
          <XCircle className="mr-1 h-3 w-3" />
          Withdrawn
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface BalanceInfo {
  totalOwed: number;  // They owe us
  totalOwing: number; // We owe them
  netBalance: number; // Positive = they owe us
}

function RequestCard({ request, balance }: { request: CarrierRequest; balance?: BalanceInfo }) {
  const load = request.load;
  const carrier = request.carrier;

  if (!load || !carrier) return null;

  // Check if there's an open balance
  const hasOpenBalance = balance && (balance.totalOwed > 0 || balance.totalOwing > 0);

  const route = load.pickup_city && load.pickup_state && load.delivery_city && load.delivery_state
    ? `${load.pickup_city}, ${load.pickup_state} → ${load.delivery_city}, ${load.delivery_state}`
    : load.pickup_city && load.pickup_state
      ? `${load.pickup_city}, ${load.pickup_state}`
      : '-';

  // Only show verified if they completed FMCSA verification
  const isVerified = carrier.fmcsa_verified === true;
  const hasDot = carrier.dot_number && carrier.dot_number.trim() !== '';
  const hasMc = carrier.mc_number && carrier.mc_number.trim() !== '';

  // Posted rate info
  const postedRatePerCuft = load.rate_per_cuft;
  const cuft = load.cubic_feet_estimate || 0;
  const postedLinehaul = postedRatePerCuft && cuft ? postedRatePerCuft * cuft : (load.posting_type === 'pickup' ? load.balance_due : load.linehaul_amount);

  // Offered rate - check request_type and counter_offer_rate
  let offeredRatePerCuft: number | null = null;
  let offeredLinehaul: number | null = null;
  let offerType: 'counter' | 'accepted' | 'legacy' = 'accepted';

  if (request.request_type === 'counter_offer' && request.counter_offer_rate) {
    offeredRatePerCuft = request.counter_offer_rate;
    offeredLinehaul = cuft ? request.counter_offer_rate * cuft : null;
    offerType = 'counter';
  } else if (request.accepted_company_rate || request.request_type === 'accept_listed') {
    offeredRatePerCuft = postedRatePerCuft;
    offeredLinehaul = postedLinehaul;
    offerType = 'accepted';
  } else if (request.offered_rate) {
    offeredRatePerCuft = request.offered_rate;
    offeredLinehaul = cuft ? request.offered_rate * cuft : null;
    offerType = 'legacy';
  }

  // Format proposed dates
  const hasLoadDates = request.proposed_load_date_start || request.proposed_load_date_end;
  const hasDeliveryDates = request.proposed_delivery_date_start || request.proposed_delivery_date_end;
  const loadDateRange = hasLoadDates
    ? `${formatDateShort(request.proposed_load_date_start)}${request.proposed_load_date_end && request.proposed_load_date_end !== request.proposed_load_date_start ? ` - ${formatDateShort(request.proposed_load_date_end)}` : ''}`
    : null;
  const deliveryDateRange = hasDeliveryDates
    ? `${formatDateShort(request.proposed_delivery_date_start)}${request.proposed_delivery_date_end && request.proposed_delivery_date_end !== request.proposed_delivery_date_start ? ` - ${formatDateShort(request.proposed_delivery_date_end)}` : ''}`
    : null;

  return (
    <Card className="rounded-lg hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold">{load.load_number}</span>
                {getStatusBadge(request.status)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{carrier.name}</span>
                {isVerified && (
                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0 text-xs px-1.5 py-0">
                    <BadgeCheck className="h-3 w-3 mr-0.5" />
                    Verified
                  </Badge>
                )}
                {carrier.city && carrier.state && (
                  <span className="text-muted-foreground">
                    ({carrier.city}, {carrier.state})
                  </span>
                )}
              </div>
              {(hasDot || hasMc) && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {hasDot && <span>DOT# {carrier.dot_number}</span>}
                  {hasMc && <span>MC# {carrier.mc_number}</span>}
                </div>
              )}
            </div>
            {request.status === 'pending' && (
              <RequestActions
                requestId={request.id}
                loadId={load.id}
                carrierId={carrier.id}
                carrierName={carrier.name}
                balance={balance}
              />
            )}
          </div>

          {/* Load Details */}
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{route}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{load.cubic_feet_estimate ? `${load.cubic_feet_estimate.toLocaleString()} CF` : '-'}</span>
            </div>
          </div>

          {/* Rate Comparison */}
          <div className="grid gap-3 sm:grid-cols-2 text-sm bg-muted/30 p-3 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Posted Rate</div>
              <div className="font-medium">
                {postedRatePerCuft ? `$${postedRatePerCuft.toFixed(2)}/CF` : '-'}
                {postedLinehaul ? ` = ${formatCurrency(postedLinehaul)}` : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {offerType === 'counter' ? 'Counter Offer' : offerType === 'accepted' ? 'Accepted Rate' : 'Offered Rate'}
              </div>
              <div className={`font-medium ${offerType === 'counter' ? 'text-primary' : ''}`}>
                {offeredRatePerCuft ? `$${offeredRatePerCuft.toFixed(2)}/CF` : '-'}
                {offeredLinehaul ? ` = ${formatCurrency(offeredLinehaul)}` : ''}
              </div>
            </div>
          </div>

          {/* Open Balance Warning */}
          {hasOpenBalance && request.status === 'pending' && (
            <div className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <div>
                <span className="font-medium">Open balance with {carrier.name}: </span>
                {balance!.netBalance > 0 ? (
                  <span>They owe you {formatCurrency(balance!.totalOwed)}</span>
                ) : balance!.netBalance < 0 ? (
                  <span>You owe them {formatCurrency(balance!.totalOwing)}</span>
                ) : (
                  <span>{formatCurrency(balance!.totalOwed)} owed / {formatCurrency(balance!.totalOwing)} owing</span>
                )}
              </div>
            </div>
          )}

          {/* Proposed Dates */}
          {(loadDateRange || deliveryDateRange) && (
            <div className="grid gap-2 sm:grid-cols-2 text-sm bg-muted/30 p-3 rounded-lg">
              {loadDateRange && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Can load: <span className="font-medium text-foreground">{loadDateRange}</span></span>
                </div>
              )}
              {deliveryDateRange && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Can deliver: <span className="font-medium text-foreground">{deliveryDateRange}</span></span>
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {request.message && (
            <div className="flex items-start gap-2 text-sm bg-muted/50 p-3 rounded-lg">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-muted-foreground">{request.message}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Requested {formatDate(request.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function CarrierRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Get requests on loads posted by this user
  // Include owner_id so we can filter to only the user's loads
  const { data: requests, error } = await supabase
    .from('load_requests')
    .select(`
      id, status, request_type, offered_rate, offered_rate_type, counter_offer_rate,
      accepted_company_rate, message, created_at,
      proposed_load_date_start, proposed_load_date_end,
      proposed_delivery_date_start, proposed_delivery_date_end,
      carrier:carrier_id(id, name, city, state, mc_number, dot_number, fmcsa_verified, platform_rating, platform_loads_completed),
      load:load_id(
        id, load_number, load_type, posting_type, owner_id,
        pickup_city, pickup_state, delivery_city, delivery_state,
        cubic_feet_estimate, balance_due, linehaul_amount, company_rate, rate_per_cuft
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching carrier requests:', error);
  }

  // Filter to only show requests for loads this user owns
  const allRequests = ((requests || []) as unknown as (CarrierRequest & { load: { owner_id: string } | null })[])
    .filter((r) => r.load?.owner_id === user.id);
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const acceptedRequests = allRequests.filter((r) => r.status === 'accepted');
  const declinedRequests = allRequests.filter((r) => ['declined', 'withdrawn'].includes(r.status));

  // Get unique carrier IDs from pending requests to fetch balances
  const pendingCarrierIds = [...new Set(
    pendingRequests
      .map((r) => r.carrier?.id)
      .filter((id): id is string => Boolean(id))
  )];

  // Fetch balances for all carriers with pending requests
  const balances = await getCompanyBalancesBatch(pendingCarrierIds, user.id);

  // Convert Map to a plain object for easier access in components
  const balancesMap: Record<string, BalanceInfo> = {};
  balances.forEach((value, key) => {
    balancesMap[key] = value;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 pt-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Carrier Requests</h1>
        <p className="text-sm text-muted-foreground/90">
          Review and manage carrier requests on your posted jobs
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting your response</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedRequests.length}</div>
            <p className="text-xs text-muted-foreground">Carriers assigned</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{declinedRequests.length}</div>
            <p className="text-xs text-muted-foreground">Not accepted</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allRequests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pendingRequests.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No pending requests</p>
                <p className="text-sm mt-2">
                  When carriers request your posted jobs, they&apos;ll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                balance={request.carrier?.id ? balancesMap[request.carrier.id] : undefined}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-3">
          {acceptedRequests.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="py-10 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No accepted requests yet</p>
              </CardContent>
            </Card>
          ) : (
            acceptedRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {allRequests.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Truck className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No carrier requests yet</p>
                <p className="text-sm mt-2">
                  Post jobs to the marketplace to receive carrier requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            allRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
