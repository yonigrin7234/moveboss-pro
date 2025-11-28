'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TripPlannerMap, type TripLoad, type MarketplaceLoad } from './TripPlannerMap';

interface TripLoadData {
  id: string;
  load_id: string;
  sequence_index: number;
  role: string;
  load?: {
    id: string;
    load_number: string | null;
    origin_city?: string;
    origin_state?: string;
    origin_zip?: string;
    destination_city?: string;
    destination_state?: string;
    destination_zip?: string;
    cubic_feet?: number | null;
    estimated_cuft?: number | null;
    total_rate?: number | null;
    load_status?: string | null;
    company?: { id: string; name: string } | null;
  } | null;
}

interface TripMapTabProps {
  tripId: string;
  originCity?: string | null;
  originState?: string | null;
  originZip?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  destinationZip?: string | null;
  truckCapacity?: number | null;
  tripLoads: TripLoadData[];
  onRequestLoad?: (loadId: string) => void;
  onReorderLoads?: (items: { load_id: string; sequence_index: number }[]) => void;
}

interface SuggestionResponse {
  tripId: string;
  tripOrigin: {
    city: string;
    state: string;
    zip: string;
    coords: { lat: number; lng: number };
  };
  tripDestination: {
    city: string;
    state: string;
    zip: string;
    coords: { lat: number; lng: number };
  };
  capacity: {
    truck: number;
    used: number;
    available: number;
  };
  maxDetour: number;
  suggestions: Array<{
    id: string;
    loadNumber: string;
    companyName: string;
    originCity: string;
    originState: string;
    originZip: string;
    destinationCity: string;
    destinationState: string;
    destinationZip: string;
    cubicFeet: number | null;
    rate: number | null;
    rateType: string;
    postingType: 'pickup' | 'load';
    isReadyNow: boolean;
    availableDate: string | null;
    addedMiles: number;
    distanceFromRoute: number;
    originCoords?: { lat: number; lng: number };
    destinationCoords?: { lat: number; lng: number };
  }>;
}

export function TripMapTab({
  tripId,
  originCity,
  originState,
  originZip,
  destinationCity,
  destinationState,
  destinationZip,
  truckCapacity,
  tripLoads,
  onRequestLoad,
  onReorderLoads,
}: TripMapTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const [maxDetour, setMaxDetour] = useState('50');
  const [showMarketplace, setShowMarketplace] = useState(true);

  // Track saved estimated miles to avoid duplicate API calls
  const savedEstimatedMilesRef = useRef<number | null>(null);

  // Transform trip loads to map format
  const assignedLoads: TripLoad[] = tripLoads
    .filter((tl) => tl.load)
    .sort((a, b) => a.sequence_index - b.sequence_index)
    .map((tl) => {
      const load = tl.load!;
      const company = Array.isArray(load.company) ? load.company[0] : load.company;
      return {
        id: load.id,
        loadNumber: load.load_number ?? 'Unknown',
        companyName: company?.name || 'No company',
        originCity: load.origin_city,
        originState: load.origin_state,
        originZip: load.origin_zip,
        destinationCity: load.destination_city,
        destinationState: load.destination_state,
        destinationZip: load.destination_zip,
        cubicFeet: load.cubic_feet ?? load.estimated_cuft ?? undefined,
        totalRate: load.total_rate ?? undefined,
        status: load.load_status ?? undefined,
        isPickup: false, // TODO: determine from load data
      };
    });

  // Transform suggestions to marketplace load format
  const marketplaceLoads: MarketplaceLoad[] = showMarketplace && suggestions
    ? suggestions.suggestions.map((s) => ({
        id: s.id,
        loadNumber: s.loadNumber,
        companyName: s.companyName,
        originCity: s.originCity,
        originState: s.originState,
        originZip: s.originZip,
        destinationCity: s.destinationCity,
        destinationState: s.destinationState,
        destinationZip: s.destinationZip,
        cubicFeet: s.cubicFeet || undefined,
        totalRate: s.rate || undefined,
        isPickup: s.postingType === 'pickup',
        isMarketplace: true as const,
        distanceFromRoute: s.distanceFromRoute,
        addedMiles: s.addedMiles,
      }))
    : [];

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/trips/${tripId}/suggestions?maxDetour=${maxDetour}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch suggestions');
      }

      const data: SuggestionResponse = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load map data');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, maxDetour]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Save estimated miles when route distance is calculated
  const handleRouteDistanceCalculated = useCallback(async (distance: number) => {
    // Only save if the distance has changed significantly (> 5 miles difference)
    const roundedDistance = Math.round(distance);
    if (
      savedEstimatedMilesRef.current !== null &&
      Math.abs(savedEstimatedMilesRef.current - roundedDistance) < 5
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/estimated-miles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimatedMiles: roundedDistance }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.updated) {
          savedEstimatedMilesRef.current = roundedDistance;
        }
      }
    } catch (err) {
      // Silently fail - this is a background optimization
      console.error('Failed to save estimated miles:', err);
    }
  }, [tripId]);

  const handleRequestLoad = (load: MarketplaceLoad) => {
    if (onRequestLoad) {
      onRequestLoad(load.id);
    } else {
      // Navigate to load details page
      window.location.href = `/dashboard/load-board?load=${load.id}`;
    }
  };

  if (!originCity || !originState || !destinationCity || !destinationState) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            Add origin and destination cities to view the trip map.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading trip map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchSuggestions}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show marketplace:</span>
              <Button
                variant={showMarketplace ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowMarketplace(!showMarketplace)}
              >
                {showMarketplace ? 'On' : 'Off'}
              </Button>
            </div>

            {showMarketplace && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Max detour:</span>
                <Select value={maxDetour} onValueChange={setMaxDetour}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 mi</SelectItem>
                    <SelectItem value="50">50 mi</SelectItem>
                    <SelectItem value="100">100 mi</SelectItem>
                    <SelectItem value="150">150 mi</SelectItem>
                    <SelectItem value="200">200 mi</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={fetchSuggestions}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            )}

            {suggestions && showMarketplace && (
              <Badge variant="secondary">
                {suggestions.suggestions.length} loads nearby
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <TripPlannerMap
        tripId={tripId}
        originCity={originCity}
        originState={originState}
        originZip={originZip || undefined}
        destinationCity={destinationCity}
        destinationState={destinationState}
        destinationZip={destinationZip || undefined}
        truckCapacity={truckCapacity || 0}
        assignedLoads={assignedLoads}
        marketplaceLoads={marketplaceLoads}
        onRequestLoad={handleRequestLoad}
        onRouteDistanceCalculated={handleRouteDistanceCalculated}
        onReorderLoads={onReorderLoads}
        tripLoadsRaw={tripLoads}
      />

      {/* Marketplace Suggestions List */}
      {showMarketplace && marketplaceLoads.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">
              Marketplace Loads Along Route ({marketplaceLoads.length})
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {marketplaceLoads.map((load) => (
                <div
                  key={load.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleRequestLoad(load)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{load.loadNumber}</p>
                      <Badge variant={load.isPickup ? 'default' : 'secondary'} className="text-xs">
                        {load.isPickup ? 'Pickup' : 'Load'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {load.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-medium">
                      {load.cubicFeet?.toLocaleString() || '?'} cf
                    </p>
                    <p className="text-xs text-muted-foreground">
                      +{load.addedMiles} mi detour
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
