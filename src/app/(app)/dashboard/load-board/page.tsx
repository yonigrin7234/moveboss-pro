'use server';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getMarketplaceLoads, getMarketplaceLoadCounts, type MarketplaceLoad } from '@/data/marketplace';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Building2,
  Clock,
  Zap,
  Truck,
  Star,
  ArrowRight,
  Filter,
  Search,
  Calendar,
  CheckCircle,
} from 'lucide-react';

// US States for filtering
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const EQUIPMENT_TYPES = [
  { value: 'box_truck', label: 'Box Truck' },
  { value: 'semi_trailer', label: 'Semi Trailer' },
];

// Get the type badge for a load
function LoadTypeBadge({ load }: { load: MarketplaceLoad }) {
  if (load.posting_type === 'pickup') {
    return (
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-0">
        PICKUP
      </Badge>
    );
  }

  if (load.load_subtype === 'rfd') {
    return (
      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0">
        RFD
      </Badge>
    );
  }

  return (
    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">
      LIVE LOAD
    </Badge>
  );
}

// Format price based on load type
function formatPrice(load: MarketplaceLoad): { label: string; value: string } {
  if (load.posting_type === 'pickup') {
    const balance = load.balance_due || 0;
    return {
      label: 'Balance',
      value: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
    };
  }

  // For loads, show linehaul/rate
  if (!load.company_rate) return { label: 'Linehaul', value: 'Make an offer' };
  const rate = load.company_rate.toLocaleString('en-US', { minimumFractionDigits: 2 });
  if (load.company_rate_type === 'flat') return { label: 'Linehaul', value: `$${rate} flat` };
  if (load.company_rate_type === 'per_cuft') return { label: 'Linehaul', value: `$${rate}/cuft` };
  if (load.company_rate_type === 'per_lb') return { label: 'Linehaul', value: `$${rate}/lb` };
  return { label: 'Linehaul', value: `$${rate}` };
}

// Format date display based on load type
function formatDateDisplay(load: MarketplaceLoad): string {
  // For pickups, show date range
  if (load.posting_type === 'pickup') {
    if (load.pickup_date_start && load.pickup_date_end) {
      const start = new Date(load.pickup_date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = new Date(load.pickup_date_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return start === end ? start : `${start}-${end}`;
    }
    if (load.pickup_date_start) {
      return new Date(load.pickup_date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  // For RFD loads, show ready date
  if (load.load_subtype === 'rfd') {
    if (!load.rfd_date) return 'Ready Now';
    return `Ready ${new Date(load.rfd_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  // For live loads, show available date
  if (load.available_date) {
    return new Date(load.available_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return '';
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

function LoadCard({ load }: { load: MarketplaceLoad }) {
  const company = Array.isArray(load.company) ? load.company[0] : load.company;
  const price = formatPrice(load);
  const dateDisplay = formatDateDisplay(load);

  return (
    <Link href={`/dashboard/load-board/${load.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-4">
          {/* Type Badge & Route */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <LoadTypeBadge load={load} />
              <span className="text-lg font-semibold">
                {load.origin_city}, {load.origin_state}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {load.destination_city}, {load.destination_state}
              </span>
            </div>
          </div>

          {/* Company Info */}
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{company?.name || 'Unknown Company'}</span>
            {company?.platform_rating && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {company.platform_rating.toFixed(1)}
              </span>
            )}
            {company?.platform_loads_completed && company.platform_loads_completed > 0 && (
              <span className="text-xs">({company.platform_loads_completed} loads)</span>
            )}
          </div>

          {/* Load Details Row */}
          <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
            {load.estimated_cuft && (
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {load.estimated_cuft.toLocaleString()} CF
              </span>
            )}
            {dateDisplay && (
              <span className="flex items-center gap-1">
                {load.load_subtype === 'rfd' && !load.rfd_date ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {dateDisplay}
              </span>
            )}
            {load.is_open_to_counter && (
              <Badge variant="outline" className="text-xs">
                Open to offers
              </Badge>
            )}
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2 mb-3">
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
                {load.equipment_type === 'box_truck' ? 'Box Truck' : 'Semi'}
              </Badge>
            )}
            {load.truck_requirement === 'semi_only' && (
              <Badge className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                🚛 Semi Only
              </Badge>
            )}
            {load.truck_requirement === 'box_truck_only' && (
              <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
                📦 Box Truck Only
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Posted {timeAgo(load.posted_to_marketplace_at)}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{price.label}</p>
              <p className="font-semibold text-lg">{price.value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface PageProps {
  searchParams: Promise<{
    origin?: string;
    destination?: string;
    equipment?: string;
    type?: string;
  }>;
}

export default async function LoadBoardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Check if user has a carrier company
  const workspaceCompany = await getWorkspaceCompanyForUser(user.id);
  if (!workspaceCompany) {
    redirect('/onboarding/workspace');
  }

  const params = await searchParams;
  const activeTab = params.type || 'all';

  const filters = {
    origin_state: params.origin || undefined,
    destination_state: params.destination || undefined,
    equipment_type: params.equipment || undefined,
    posting_type: activeTab === 'all' ? undefined : (activeTab as 'pickup' | 'load'),
  };

  const [loads, counts] = await Promise.all([
    getMarketplaceLoads(filters),
    getMarketplaceLoadCounts(),
  ]);

  // Count active filters (excluding type)
  const activeFilters = [params.origin, params.destination, params.equipment].filter(Boolean).length;

  // Build URL with current filters
  const buildTabUrl = (type: string) => {
    const searchParams = new URLSearchParams();
    if (params.origin) searchParams.set('origin', params.origin);
    if (params.destination) searchParams.set('destination', params.destination);
    if (params.equipment) searchParams.set('equipment', params.equipment);
    if (type !== 'all') searchParams.set('type', type);
    const queryString = searchParams.toString();
    return `/dashboard/load-board${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Load Board</h1>
          <p className="text-muted-foreground">
            Browse available loads from the marketplace
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/my-requests">
            View My Requests
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href={buildTabUrl('all')}>
              All ({counts.all})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="pickup" asChild>
            <Link href={buildTabUrl('pickup')}>
              Pickups ({counts.pickups})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="load" asChild>
            <Link href={buildTabUrl('load')}>
              Loads ({counts.loads})
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-4">
            {/* Preserve type in form */}
            {params.type && <input type="hidden" name="type" value={params.type} />}

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-1 block">Origin State</label>
              <select
                name="origin"
                defaultValue={params.origin || ''}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">All States</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-1 block">Destination State</label>
              <select
                name="destination"
                defaultValue={params.destination || ''}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">All States</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-1 block">Equipment</label>
              <select
                name="equipment"
                defaultValue={params.equipment || ''}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Any Equipment</option>
                {EQUIPMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>

            {activeFilters > 0 && (
              <Button variant="ghost" asChild>
                <Link href={buildTabUrl(activeTab)}>Clear Filters</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {loads.length} {activeTab === 'pickup' ? 'pickup' : activeTab === 'load' ? 'load' : 'item'}{loads.length !== 1 ? 's' : ''} available
        {activeFilters > 0 && ` (${activeFilters} filter${activeFilters !== 1 ? 's' : ''} applied)`}
      </div>

      {/* Load Grid */}
      {loads.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No {activeTab === 'pickup' ? 'pickups' : activeTab === 'load' ? 'loads' : 'items'} found</h3>
            <p className="text-muted-foreground mb-4">
              {activeFilters > 0
                ? 'Try adjusting your filters to see more results'
                : `No ${activeTab === 'pickup' ? 'pickups' : activeTab === 'load' ? 'loads' : 'items'} are currently posted to the marketplace`}
            </p>
            {activeFilters > 0 && (
              <Button variant="outline" asChild>
                <Link href={buildTabUrl(activeTab)}>Clear Filters</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loads.map((load) => (
            <LoadCard key={load.id} load={load} />
          ))}
        </div>
      )}
    </div>
  );
}
