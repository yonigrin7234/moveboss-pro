'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  RefreshCw,
  MapPin,
  Truck,
  Package,
  Building2,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Filter,
  X,
} from 'lucide-react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

interface CapacityListing {
  id: string;
  trip_number: string;
  company: {
    id: string;
    name: string;
    dot_number?: string;
    mc_number?: string;
    is_verified: boolean;
  };
  equipment: {
    truck_type: string;
    truck_unit?: string;
    trailer_unit?: string;
    total_capacity_cuft: number;
  };
  capacity: {
    remaining_cuft: number;
    total_cuft: number;
    utilization_percent: number;
  };
  location: {
    current_city?: string;
    current_state?: string;
    destination_city?: string;
    destination_state?: string;
    last_updated?: string;
  };
  availability: {
    expected_date?: string;
    return_preferences: string[];
    status: string;
  };
}

export default function MarketplaceCapacityPage() {
  const [listings, setListings] = useState<CapacityListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  // Filters
  const [stateFilter, setStateFilter] = useState<string>('');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [maxCapacity, setMaxCapacity] = useState<string>('');

  const fetchListings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (stateFilter) params.append('state', stateFilter);
      if (minCapacity) params.append('min_capacity', minCapacity);
      if (maxCapacity) params.append('max_capacity', maxCapacity);

      const response = await fetch(`/api/marketplace/capacity?${params.toString()}`);
      const data = await response.json();

      if (data.listings) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Error fetching capacity listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load capacity listings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [stateFilter, minCapacity, maxCapacity, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchListings();
    toast({
      title: 'Refreshed',
      description: 'Capacity listings have been updated.',
    });
  };

  const clearFilters = () => {
    setStateFilter('');
    setMinCapacity('');
    setMaxCapacity('');
  };

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(dateString);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/10 text-green-500',
      en_route: 'bg-blue-500/10 text-blue-500',
      planned: 'bg-amber-500/10 text-amber-500',
    };
    const labels: Record<string, string> = {
      active: 'Active',
      en_route: 'En Route',
      planned: 'Planned',
    };
    return (
      <Badge variant="secondary" className={colors[status] || 'bg-muted'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Available Capacity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find carriers with available truck space for your loads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {(stateFilter || minCapacity || maxCapacity) && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {[stateFilter, minCapacity, maxCapacity].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-sm">State/Region</Label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any state</SelectItem>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Min Capacity (cuft)</Label>
                <Input
                  type="number"
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Max Capacity (cuft)</Label>
                <Input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  placeholder="No limit"
                  className="h-9"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchListings} className="h-9 flex-1">
                  Apply Filters
                </Button>
                {(stateFilter || minCapacity || maxCapacity) && (
                  <Button variant="ghost" size="icon" onClick={clearFilters} className="h-9 w-9">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        {listings.length} {listings.length === 1 ? 'carrier' : 'carriers'} with available capacity
      </p>

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Available Capacity</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              There are no carriers with publicly available capacity matching your filters.
              Try adjusting your search criteria or check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">
                        {listing.company.name || 'Unknown Carrier'}
                      </CardTitle>
                      {listing.company.is_verified && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(listing.availability.status)}
                </div>
                {(listing.company.dot_number || listing.company.mc_number) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {listing.company.dot_number && `DOT: ${listing.company.dot_number}`}
                    {listing.company.dot_number && listing.company.mc_number && ' • '}
                    {listing.company.mc_number && `MC: ${listing.company.mc_number}`}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Capacity */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Available Space</p>
                      <p className="text-xs text-muted-foreground">
                        {listing.capacity.utilization_percent}% utilized
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {listing.capacity.remaining_cuft.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">cuft</p>
                  </div>
                </div>

                {/* Equipment */}
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {listing.equipment.truck_type}
                    {listing.equipment.trailer_unit && ` + Trailer ${listing.equipment.trailer_unit}`}
                  </span>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span>
                    {listing.location.current_city && listing.location.current_state
                      ? `${listing.location.current_city}, ${listing.location.current_state}`
                      : 'Location not shared'}
                  </span>
                  {listing.location.destination_city && (
                    <>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span>
                        {listing.location.destination_city}, {listing.location.destination_state}
                      </span>
                    </>
                  )}
                </div>

                {/* Availability */}
                {listing.availability.expected_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Available: {formatDate(listing.availability.expected_date)}
                    </span>
                  </div>
                )}

                {/* Return Preferences */}
                {listing.availability.return_preferences.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground mr-1">Prefers:</span>
                    {listing.availability.return_preferences.slice(0, 3).map((state) => (
                      <Badge key={state} variant="outline" className="text-xs">
                        {state}
                      </Badge>
                    ))}
                    {listing.availability.return_preferences.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{listing.availability.return_preferences.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Last Updated */}
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Location updated: {formatLastUpdated(listing.location.last_updated)}
                </p>

                {/* Action Button */}
                <Button className="w-full" variant="outline">
                  Contact Carrier
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
