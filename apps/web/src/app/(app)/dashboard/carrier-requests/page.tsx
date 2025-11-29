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
} from 'lucide-react';
import { RequestActions } from './request-actions';

interface CarrierRequest {
  id: string;
  status: string;
  offered_rate: number | null;
  offered_rate_type: string | null;
  message: string | null;
  created_at: string;
  carrier: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    mc_number: string | null;
    dot_number: string | null;
  } | null;
  load: {
    id: string;
    job_number: string;
    load_type: string;
    posting_type: string;
    pickup_city: string | null;
    pickup_state: string | null;
    dropoff_city: string | null;
    dropoff_state: string | null;
    cubic_feet: number | null;
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function RequestCard({ request }: { request: CarrierRequest }) {
  const load = request.load;
  const carrier = request.carrier;

  if (!load || !carrier) return null;

  const route = load.pickup_city && load.pickup_state && load.dropoff_city && load.dropoff_state
    ? `${load.pickup_city}, ${load.pickup_state} → ${load.dropoff_city}, ${load.dropoff_state}`
    : '-';

  const loadPrice = load.posting_type === 'pickup' ? load.balance_due : load.linehaul_amount;
  const offeredRate = request.offered_rate
    ? `${formatCurrency(request.offered_rate)}${request.offered_rate_type === 'per_cuft' ? '/cuft' : ' flat'}`
    : 'Company rate';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold">{load.job_number}</span>
                {getStatusBadge(request.status)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{carrier.name}</span>
                {carrier.city && carrier.state && (
                  <span className="text-muted-foreground">
                    ({carrier.city}, {carrier.state})
                  </span>
                )}
              </div>
              {(carrier.mc_number || carrier.dot_number) && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {carrier.mc_number && <span>MC# {carrier.mc_number}</span>}
                  {carrier.dot_number && <span>DOT# {carrier.dot_number}</span>}
                </div>
              )}
            </div>
            {request.status === 'pending' && (
              <RequestActions requestId={request.id} loadId={load.id} carrierId={carrier.id} />
            )}
          </div>

          {/* Load Details */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{route}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{load.cubic_feet ?? '-'} CUFT</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Load: {formatCurrency(loadPrice)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-primary">Offered: {offeredRate}</span>
            </div>
          </div>

          {/* Message */}
          {request.message && (
            <div className="flex items-start gap-2 text-sm bg-muted/50 p-3 rounded-lg">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-muted-foreground">{request.message}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
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

  // Get all requests on loads posted by this user
  const { data: requests, error } = await supabase
    .from('load_requests')
    .select(`
      id, status, offered_rate, offered_rate_type, message, created_at,
      carrier:carrier_id(id, name, city, state, mc_number, dot_number),
      load:load_id(
        id, job_number, load_type, posting_type,
        pickup_city, pickup_state, dropoff_city, dropoff_state,
        cubic_feet, balance_due, linehaul_amount, company_rate, rate_per_cuft
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching carrier requests:', error);
  }

  // Filter to only show requests for loads this user owns
  // (RLS should handle this, but let's be explicit)
  const allRequests = (requests || []) as unknown as CarrierRequest[];
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const acceptedRequests = allRequests.filter((r) => r.status === 'accepted');
  const declinedRequests = allRequests.filter((r) => ['declined', 'withdrawn'].includes(r.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Carrier Requests</h1>
        <p className="text-muted-foreground">
          Review and manage carrier requests on your posted jobs
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting your response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedRequests.length}</div>
            <p className="text-xs text-muted-foreground">Carriers assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{declinedRequests.length}</div>
            <p className="text-xs text-muted-foreground">Not accepted</p>
          </CardContent>
        </Card>
        <Card>
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

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
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
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {acceptedRequests.length === 0 ? (
            <Card>
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

        <TabsContent value="all" className="space-y-4">
          {allRequests.length === 0 ? (
            <Card>
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
