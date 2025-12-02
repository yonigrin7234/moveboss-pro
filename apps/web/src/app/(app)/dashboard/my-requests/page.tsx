import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getCarrierRequests } from '@/data/marketplace';
import { withdrawLoadRequest } from '@/data/cancellations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Package,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Search,
  DollarSign,
  X,
  BadgeCheck,
  Calendar,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-500/20 text-green-600 dark:text-green-400', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-red-500/20 text-red-600 dark:text-red-400', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400', icon: Clock },
};

function formatRate(rate: number | null, rateType: string): string {
  if (!rate) return 'N/A';
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

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface CarrierRequest {
  id: string;
  status: string;
  request_type: 'accept_listed' | 'counter_offer' | null;
  offered_rate: number | null;
  counter_offer_rate: number | null;
  accepted_company_rate: boolean;
  created_at: string;
  proposed_load_date_start: string | null;
  proposed_load_date_end: string | null;
  proposed_delivery_date_start: string | null;
  proposed_delivery_date_end: string | null;
  load: {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    origin_zip: string;
    destination_city: string;
    destination_state: string;
    destination_zip: string;
    estimated_cuft: number | null;
    rate_per_cuft: number | null;
    company_rate: number | null;
    company_rate_type: string;
    company: { id: string; name: string; fmcsa_verified: boolean | null } | null;
  };
}

interface RequestCardProps {
  request: CarrierRequest;
  withdrawAction?: (formData: FormData) => Promise<void>;
}

function RequestCard({ request, withdrawAction }: RequestCardProps) {
  const status = statusConfig[request.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const load = request.load;

  // Safety check - skip rendering if load data is missing
  if (!load) return null;

  const company = Array.isArray(load.company) ? load.company[0] : load.company;
  const isPending = request.status === 'pending';
  const isVerified = company?.fmcsa_verified === true;

  // Determine offer display
  let offerDisplay: string;
  if (request.request_type === 'counter_offer' && request.counter_offer_rate) {
    offerDisplay = `$${request.counter_offer_rate.toFixed(2)}/CF (counter)`;
  } else if (request.accepted_company_rate || request.request_type === 'accept_listed') {
    offerDisplay = load.rate_per_cuft
      ? `$${load.rate_per_cuft.toFixed(2)}/CF (accepted)`
      : 'Accepted posted rate';
  } else if (request.offered_rate) {
    offerDisplay = `$${request.offered_rate.toFixed(2)}/CF`;
  } else {
    offerDisplay = 'Accepted posted rate';
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

  // For accepted requests, link to assigned-loads; otherwise link to load-board
  const cardHref = request.status === 'accepted'
    ? `/dashboard/assigned-loads/${load.id}`
    : `/dashboard/load-board/${load.id}`;

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <Link href={cardHref} className="block">
          <div className="flex items-start justify-between mb-3">
            {/* Route with zip codes */}
            <div className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{load.origin_city}, {load.origin_state} {load.origin_zip}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span>{load.destination_city}, {load.destination_state} {load.destination_zip}</span>
            </div>

            {/* Status Badge */}
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          {/* Company Info with verified badge */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {company?.name || 'Unknown Company'}
              {isVerified && (
                <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0 text-xs px-1.5 py-0 ml-1">
                  <BadgeCheck className="h-3 w-3 mr-0.5" />
                  Verified
                </Badge>
              )}
            </span>
            {load.estimated_cuft && (
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {load.estimated_cuft.toLocaleString()} cuft
              </span>
            )}
            <span>#{load.load_number}</span>
          </div>

          {/* Rate Info */}
          <div className="flex items-center gap-4 text-sm mb-3">
            {load.rate_per_cuft && (
              <span className="text-muted-foreground">
                Posted: <span className="font-medium">${load.rate_per_cuft.toFixed(2)}/CF</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>Your offer: <span className="font-semibold text-primary">{offerDisplay}</span></span>
            </span>
          </div>

          {/* Proposed Dates */}
          {(loadDateRange || deliveryDateRange) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 bg-muted/30 p-2 rounded">
              {loadDateRange && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Can load: <span className="font-medium text-foreground">{loadDateRange}</span>
                </span>
              )}
              {deliveryDateRange && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Can deliver: <span className="font-medium text-foreground">{deliveryDateRange}</span>
                </span>
              )}
            </div>
          )}

          {/* Time */}
          <div className="text-sm text-muted-foreground">
            Requested {timeAgo(request.created_at)}
          </div>
        </Link>

        {/* Cancel button for pending requests */}
        {isPending && withdrawAction && (
          <div className="flex justify-end pt-3 mt-3 border-t">
            <form action={withdrawAction}>
              <input type="hidden" name="request_id" value={request.id} />
              <Button type="submit" variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <X className="h-4 w-4 mr-1" />
                Cancel Request
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function MyRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const requests = await getCarrierRequests(user.id);

  // Group requests by status
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const acceptedRequests = requests.filter((r) => r.status === 'accepted');
  const declinedRequests = requests.filter((r) => r.status === 'declined' || r.status === 'withdrawn' || r.status === 'expired');

  async function handleWithdraw(formData: FormData): Promise<void> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const requestId = formData.get('request_id') as string;
    if (!requestId) throw new Error('Missing request ID');

    const result = await withdrawLoadRequest(requestId, currentUser.id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to withdraw request');
    }

    revalidatePath('/dashboard/my-requests');
    revalidatePath('/dashboard/load-board');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">
            Track your load requests and their status
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/load-board">
            <Search className="h-4 w-4 mr-2" />
            Browse Loads
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{acceptedRequests.length}</p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gray-500/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{declinedRequests.length}</p>
                <p className="text-sm text-muted-foreground">Declined/Other</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({acceptedRequests.length})</TabsTrigger>
          <TabsTrigger value="declined">Declined ({declinedRequests.length})</TabsTrigger>
          <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground mb-4">
                  Browse the load board to find loads and submit requests
                </p>
                <Button asChild>
                  <Link href="/dashboard/load-board">Browse Load Board</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} withdrawAction={handleWithdraw} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Accepted Tab */}
        <TabsContent value="accepted" className="space-y-4 mt-4">
          {acceptedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No accepted requests yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {acceptedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Declined Tab */}
        <TabsContent value="declined" className="space-y-4 mt-4">
          {declinedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No declined or withdrawn requests
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {declinedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start browsing the load board to find available loads
                </p>
                <Button asChild>
                  <Link href="/dashboard/load-board">Browse Load Board</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
