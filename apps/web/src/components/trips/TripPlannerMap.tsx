'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Truck, Package, MapPin, Navigation, Loader2, GripVertical, Maximize2, Minimize2, Home, Flag, CircleDot } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  geocodeZipCode,
  geocodeAddress,
  calculateDistance,
  calculateRouteDistance,
  calculateAddedMiles,
  type GeoCoordinates,
} from '@/lib/geocoding';

// Dynamic import for Leaflet components (SSR incompatible)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

export interface TripLoad {
  id: string;
  loadNumber: string;
  companyName?: string;
  originCity?: string;
  originState?: string;
  originZip?: string;
  destinationCity?: string;
  destinationState?: string;
  destinationZip?: string;
  cubicFeet?: number;
  totalRate?: number;
  status?: string;
  isPickup?: boolean; // true = pickup from customer, false = load from company
}

export interface MarketplaceLoad extends TripLoad {
  isMarketplace: true;
  distanceFromRoute?: number;
  addedMiles?: number;
}

interface TripLoadRaw {
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

export interface TripPlannerMapProps {
  tripId: string;
  originCity?: string;
  originState?: string;
  originZip?: string;
  destinationCity?: string;
  destinationState?: string;
  destinationZip?: string;
  truckCapacity?: number; // cubic feet
  assignedLoads: TripLoad[];
  marketplaceLoads?: MarketplaceLoad[];
  onLoadClick?: (load: TripLoad | MarketplaceLoad) => void;
  onRequestLoad?: (load: MarketplaceLoad) => void;
  onRouteDistanceCalculated?: (distance: number) => void;
  onReorderLoads?: (items: { load_id: string; sequence_index: number }[]) => void;
  tripLoadsRaw?: TripLoadRaw[];
}

interface LoadMarker {
  load: TripLoad | MarketplaceLoad;
  originCoords?: GeoCoordinates;
  destinationCoords?: GeoCoordinates;
  isMarketplace: boolean;
}

// Sortable load item for drag-and-drop
function SortableLoadItem({
  load,
  index,
  onSelect,
}: {
  load: TripLoad;
  index: number;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: load.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors ${isDragging ? 'z-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground">{index + 1}.</span>
        <div className="cursor-pointer" onClick={onSelect}>
          <p className="text-sm font-medium">{load.loadNumber}</p>
          <p className="text-xs text-muted-foreground">{load.companyName}</p>
          {load.destinationCity && (
            <p className="text-xs text-muted-foreground">
              → {load.destinationCity}{load.destinationState ? `, ${load.destinationState}` : ''} {load.destinationZip || ''}
            </p>
          )}
        </div>
      </div>
      <div className="text-right cursor-pointer" onClick={onSelect}>
        <p className="text-sm font-medium">{load.cubicFeet?.toLocaleString() || 0} cf</p>
        <Badge variant={load.isPickup ? 'default' : 'secondary'} className="text-xs">
          {load.isPickup ? 'Pickup' : 'Load'}
        </Badge>
      </div>
    </div>
  );
}

export function TripPlannerMap({
  tripId,
  originCity,
  originState,
  originZip,
  destinationCity,
  destinationState,
  destinationZip,
  truckCapacity = 0,
  assignedLoads,
  marketplaceLoads = [],
  onLoadClick,
  onRequestLoad,
  onRouteDistanceCalculated,
  onReorderLoads,
  tripLoadsRaw = [],
}: TripPlannerMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tripOrigin, setTripOrigin] = useState<GeoCoordinates | null>(null);
  const [tripDestination, setTripDestination] = useState<GeoCoordinates | null>(null);
  const [loadMarkers, setLoadMarkers] = useState<LoadMarker[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<TripLoad | MarketplaceLoad | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [icons, setIcons] = useState<{
    origin?: L.DivIcon;
    destination?: L.DivIcon;
    load?: L.DivIcon;
    pickup?: L.DivIcon;
    marketplace?: L.DivIcon;
  }>({});

  // State for orderable loads (maintains order during drag)
  const [orderedAssignedLoads, setOrderedAssignedLoads] = useState(assignedLoads);

  // Update ordered loads when assignedLoads changes from parent
  useEffect(() => {
    setOrderedAssignedLoads(assignedLoads);
  }, [assignedLoads]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setOrderedAssignedLoads((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          const newItems = arrayMove(items, oldIndex, newIndex);

          // Call parent callback if provided
          if (onReorderLoads && tripLoadsRaw.length > 0) {
            // Map back to load_ids using tripLoadsRaw
            const reorderPayload = newItems.map((item, index) => {
              const rawLoad = tripLoadsRaw.find((tl) => tl.load?.id === item.id);
              return {
                load_id: rawLoad?.load_id || item.id,
                sequence_index: index,
              };
            });
            onReorderLoads(reorderPayload);
          }

          return newItems;
        });
      }
    },
    [onReorderLoads, tripLoadsRaw]
  );

  // Calculate capacity
  const usedCapacity = useMemo(() => {
    return assignedLoads.reduce((sum, load) => sum + (load.cubicFeet || 0), 0);
  }, [assignedLoads]);

  const availableCapacity = truckCapacity - usedCapacity;
  const capacityPercentage = truckCapacity > 0 ? (usedCapacity / truckCapacity) * 100 : 0;

  // Load Leaflet and create icons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Import Leaflet CSS via link element
    const linkId = 'leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {

      // Create custom icons
      const createIcon = (color: string, emoji: string) => {
        return L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            font-size: 16px;
          ">${emoji}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });
      };

      setIcons({
        origin: createIcon('#3b82f6', '🚚'), // Blue - truck start
        destination: createIcon('#22c55e', '🏁'), // Green - finish
        load: createIcon('#8b5cf6', '📦'), // Purple - assigned load
        pickup: createIcon('#f59e0b', '🏠'), // Orange - pickup from customer
        marketplace: createIcon('#ef4444', '💰'), // Red - marketplace opportunity
      });

      setLeafletLoaded(true);
    });
  }, []);

  // Geocode locations
  useEffect(() => {
    async function geocodeLocations() {
      setIsLoading(true);

      // Geocode trip origin and destination
      const [originResult, destResult] = await Promise.all([
        geocodeAddress(originCity, originState, originZip),
        geocodeAddress(destinationCity, destinationState, destinationZip),
      ]);

      if (originResult.success && originResult.coordinates) {
        setTripOrigin(originResult.coordinates);
      }
      if (destResult.success && destResult.coordinates) {
        setTripDestination(destResult.coordinates);
      }

      // Geocode all loads
      const allLoads = [...assignedLoads, ...marketplaceLoads];
      const markers: LoadMarker[] = [];

      for (const load of allLoads) {
        const [originCoords, destCoords] = await Promise.all([
          geocodeAddress(load.originCity, load.originState, load.originZip),
          geocodeAddress(load.destinationCity, load.destinationState, load.destinationZip),
        ]);

        markers.push({
          load,
          originCoords: originCoords.success ? originCoords.coordinates : undefined,
          destinationCoords: destCoords.success ? destCoords.coordinates : undefined,
          isMarketplace: 'isMarketplace' in load && load.isMarketplace === true,
        });
      }

      setLoadMarkers(markers);
      setIsLoading(false);
    }

    geocodeLocations();
  }, [originCity, originState, originZip, destinationCity, destinationState, destinationZip, assignedLoads, marketplaceLoads]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    const points: [number, number][] = [];

    if (tripOrigin) points.push([tripOrigin.lat, tripOrigin.lng]);
    if (tripDestination) points.push([tripDestination.lat, tripDestination.lng]);

    loadMarkers.forEach((marker) => {
      if (marker.originCoords) {
        points.push([marker.originCoords.lat, marker.originCoords.lng]);
      }
      if (marker.destinationCoords) {
        points.push([marker.destinationCoords.lat, marker.destinationCoords.lng]);
      }
    });

    if (points.length === 0) {
      // Default to continental US center
      return [[25, -125], [50, -65]] as [[number, number], [number, number]];
    }

    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);

    return [
      [Math.min(...lats) - 1, Math.min(...lngs) - 1],
      [Math.max(...lats) + 1, Math.max(...lngs) + 1],
    ] as [[number, number], [number, number]];
  }, [tripOrigin, tripDestination, loadMarkers]);

  // Route line coordinates - follows proper logistics order:
  // 1. Trip origin
  // 2. All unique pickup locations (deduplicated)
  // 3. All delivery locations in the user's sequence order
  // 4. Trip destination
  const routeLine = useMemo(() => {
    if (!tripOrigin || !tripDestination) return null;

    const points: [number, number][] = [[tripOrigin.lat, tripOrigin.lng]];

    // Get assigned markers in the user's ordered sequence
    const assignedMarkersByLoadId = new Map(
      loadMarkers.filter(m => !m.isMarketplace).map(m => [m.load.id, m])
    );
    const orderedMarkers = orderedAssignedLoads
      .map(load => assignedMarkersByLoadId.get(load.id))
      .filter((m): m is LoadMarker => m !== undefined);

    // Collect unique pickup locations (deduplicate by coordinates)
    const pickupLocations = new Map<string, { coords: GeoCoordinates; name: string }>();
    for (const marker of orderedMarkers) {
      if (marker.originCoords) {
        // Round coordinates to avoid floating point comparison issues
        const key = `${marker.originCoords.lat.toFixed(3)},${marker.originCoords.lng.toFixed(3)}`;
        if (!pickupLocations.has(key)) {
          pickupLocations.set(key, {
            coords: marker.originCoords,
            name: `${marker.load.originCity}, ${marker.load.originState}`,
          });
        }
      }
    }

    // Add unique pickup locations
    for (const pickup of pickupLocations.values()) {
      points.push([pickup.coords.lat, pickup.coords.lng]);
    }

    // Add delivery locations in the user's sequence order
    for (const marker of orderedMarkers) {
      if (marker.destinationCoords) {
        points.push([marker.destinationCoords.lat, marker.destinationCoords.lng]);
      }
    }

    // Add trip destination
    points.push([tripDestination.lat, tripDestination.lng]);

    return points;
  }, [tripOrigin, tripDestination, loadMarkers, orderedAssignedLoads]);

  // Calculate route segments with labels and distances
  const routeSegments = useMemo(() => {
    if (!tripOrigin || !tripDestination) return [];

    const segments: { from: string; to: string; distance: number }[] = [];

    // Get assigned markers in the user's ordered sequence
    const assignedMarkersByLoadId = new Map(
      loadMarkers.filter(m => !m.isMarketplace).map(m => [m.load.id, m])
    );
    const orderedMarkers = orderedAssignedLoads
      .map(load => assignedMarkersByLoadId.get(load.id))
      .filter((m): m is LoadMarker => m !== undefined);

    // Build list of stops with proper logistics order
    const stops: { name: string; coords: { lat: number; lng: number }; type: 'origin' | 'pickup' | 'delivery' | 'destination' }[] = [
      { name: `${originCity}, ${originState}`, coords: tripOrigin, type: 'origin' },
    ];

    // Collect unique pickup locations
    const pickupLocations = new Map<string, { coords: GeoCoordinates; name: string }>();
    for (const marker of orderedMarkers) {
      if (marker.originCoords) {
        const key = `${marker.originCoords.lat.toFixed(3)},${marker.originCoords.lng.toFixed(3)}`;
        if (!pickupLocations.has(key)) {
          pickupLocations.set(key, {
            coords: marker.originCoords,
            name: `${marker.load.originCity}, ${marker.load.originState}`,
          });
        }
      }
    }

    // Add unique pickup locations
    for (const pickup of pickupLocations.values()) {
      stops.push({
        name: `Pickup: ${pickup.name}`,
        coords: pickup.coords,
        type: 'pickup',
      });
    }

    // Add deliveries in user's sequence order
    for (const marker of orderedMarkers) {
      if (marker.destinationCoords) {
        stops.push({
          name: `Delivery: ${marker.load.destinationCity}, ${marker.load.destinationState}`,
          coords: marker.destinationCoords,
          type: 'delivery',
        });
      }
    }

    stops.push({ name: `${destinationCity}, ${destinationState}`, coords: tripDestination, type: 'destination' });

    // Calculate distance between each stop
    for (let i = 0; i < stops.length - 1; i++) {
      const distance = calculateDistance(stops[i].coords, stops[i + 1].coords);
      segments.push({
        from: stops[i].name,
        to: stops[i + 1].name,
        distance: Math.round(distance),
      });
    }

    return segments;
  }, [tripOrigin, tripDestination, loadMarkers, orderedAssignedLoads, originCity, originState, destinationCity, destinationState]);

  // Calculate route distance - sum of all segments
  const routeDistance = useMemo(() => {
    return routeSegments.reduce((sum, seg) => sum + seg.distance, 0);
  }, [routeSegments]);

  // Notify parent when route distance is calculated
  useEffect(() => {
    if (routeDistance > 0 && onRouteDistanceCalculated) {
      onRouteDistanceCalculated(routeDistance);
    }
  }, [routeDistance, onRouteDistanceCalculated]);

  if (!leafletLoaded || isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Backdrop for expanded map */}
      {isMapExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMapExpanded(false)}
        />
      )}

      {/* Main Layout: Side-by-side on xl screens, stacked on smaller */}
      <div className="flex flex-col xl:flex-row xl:gap-4">
        {/* Left: Map (sticky on xl screens) */}
        <div className="xl:w-[60%] xl:sticky xl:top-4 xl:self-start">
          {/* Map */}
          <Card className={isMapExpanded ? 'fixed inset-4 z-50 flex flex-col' : ''}>
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Navigation className="h-5 w-5 text-blue-500" />
                  </div>
                  Trip Route
                </CardTitle>
                <div className="flex items-center gap-2">
                  {routeDistance > 0 && (
                    <Badge variant="secondary" className="font-semibold">
                      {Math.round(routeDistance)} miles
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    className="h-8 w-8 p-0"
                  >
                    {isMapExpanded ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className={`p-0 ${isMapExpanded ? 'flex-1' : ''}`}>
              <div className={`${isMapExpanded ? 'h-full' : 'h-[500px] xl:h-[calc(100vh-200px)] xl:min-h-[500px]'} rounded-b-lg overflow-hidden`}>
                <MapContainer
                  bounds={bounds}
                  className="h-full w-full"
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Route line */}
                  {routeLine && (
                    <Polyline
                      positions={routeLine}
                      color="#3b82f6"
                      weight={3}
                      dashArray="10, 10"
                    />
                  )}

                  {/* Trip origin marker */}
                  {tripOrigin && icons.origin && (
                    <Marker position={[tripOrigin.lat, tripOrigin.lng]} icon={icons.origin}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">Trip Start</p>
                          <p className="text-muted-foreground">
                            {originCity}, {originState} {originZip}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Trip destination marker */}
                  {tripDestination && icons.destination && (
                    <Marker position={[tripDestination.lat, tripDestination.lng]} icon={icons.destination}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">Trip Destination</p>
                          <p className="text-muted-foreground">
                            {destinationCity}, {destinationState} {destinationZip}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Load markers */}
                  {loadMarkers.map((marker, index) => {
                    const icon = marker.isMarketplace
                      ? icons.marketplace
                      : marker.load.isPickup
                      ? icons.pickup
                      : icons.load;

                    if (!icon) return null;

                    return (
                      <div key={marker.load.id}>
                        {/* Origin marker */}
                        {marker.originCoords && (
                          <Marker
                            position={[marker.originCoords.lat, marker.originCoords.lng]}
                            icon={icon}
                            eventHandlers={{
                              click: () => {
                                setSelectedLoad(marker.load);
                              },
                            }}
                          >
                            <Popup>
                              <div className="text-sm min-w-[200px]">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-semibold">{marker.load.loadNumber}</p>
                                  {marker.isMarketplace && (
                                    <Badge variant="destructive" className="text-xs">Marketplace</Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground">{marker.load.companyName}</p>
                                <div className="mt-2 space-y-1">
                                  <p className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {marker.load.originCity}, {marker.load.originState} {marker.load.originZip}
                                  </p>
                                  {marker.load.destinationCity && (
                                    <p className="flex items-center gap-1 text-muted-foreground">
                                      → {marker.load.destinationCity}, {marker.load.destinationState} {marker.load.destinationZip}
                                    </p>
                                  )}
                                  {marker.load.cubicFeet && (
                                    <p className="flex items-center gap-1">
                                      <Package className="h-3 w-3" />
                                      {marker.load.cubicFeet.toLocaleString()} cf
                                    </p>
                                  )}
                                </div>
                                {marker.isMarketplace && 'addedMiles' in marker.load && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    +{Math.round(marker.load.addedMiles || 0)} miles detour
                                  </p>
                                )}
                                {marker.isMarketplace && onRequestLoad && (
                                  <Button
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => onRequestLoad(marker.load as MarketplaceLoad)}
                                  >
                                    Request Load
                                  </Button>
                                )}
                                {!marker.isMarketplace && onLoadClick && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2"
                                    onClick={() => onLoadClick(marker.load)}
                                  >
                                    View Details
                                  </Button>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* Destination marker (smaller/different style for assigned loads) */}
                        {marker.destinationCoords && !marker.isMarketplace && icons.destination && (
                          <Marker
                            position={[marker.destinationCoords.lat, marker.destinationCoords.lng]}
                            icon={icons.destination}
                          >
                            <Popup>
                              <div className="text-sm">
                                <p className="font-semibold">Delivery: {marker.load.loadNumber}</p>
                                <p className="text-muted-foreground">
                                  {marker.load.destinationCity}, {marker.load.destinationState}
                                </p>
                                {marker.load.cubicFeet && (
                                  <p className="flex items-center gap-1 mt-1">
                                    <Package className="h-3 w-3" />
                                    {marker.load.cubicFeet.toLocaleString()} cf
                                  </p>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        )}
                      </div>
                    );
                  })}
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          {/* Legend - below map on xl, inline otherwise */}
          <Card className="mt-4 hidden xl:block">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10">
                  <Truck className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-blue-700 dark:text-blue-400">Start</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10">
                  <Flag className="h-3 w-3 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-400">End</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10">
                  <Package className="h-3 w-3 text-purple-500" />
                  <span className="font-medium text-purple-700 dark:text-purple-400">Load</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10">
                  <Home className="h-3 w-3 text-amber-500" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Pickup</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10">
                  <CircleDot className="h-3 w-3 text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-400">Market</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar with controls (scrollable on xl screens) */}
        <div className="xl:w-[40%] mt-4 xl:mt-0 space-y-4">
          {/* Capacity Bar */}
          <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">Truck Capacity</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold">{usedCapacity.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground"> / {truckCapacity.toLocaleString()} cf</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                capacityPercentage > 90
                  ? 'bg-gradient-to-r from-red-400 to-red-500'
                  : capacityPercentage > 70
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                  : 'bg-gradient-to-r from-emerald-400 to-green-500'
              }`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{availableCapacity.toLocaleString()} cf</span> available
            </span>
            <span className={`font-semibold ${
              capacityPercentage > 90
                ? 'text-red-500'
                : capacityPercentage > 70
                ? 'text-amber-500'
                : 'text-green-500'
            }`}>
              {Math.round(capacityPercentage)}% full
            </span>
          </div>
        </CardContent>
      </Card>

          {/* Assigned Loads Summary */}
          {orderedAssignedLoads.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Assigned Loads ({orderedAssignedLoads.length})</CardTitle>
                  {onReorderLoads && (
                    <span className="text-xs text-muted-foreground">Drag to reorder</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedAssignedLoads.map((load) => load.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {orderedAssignedLoads.map((load, index) => (
                        <SortableLoadItem
                          key={load.id}
                          load={load}
                          index={index}
                          onSelect={() => {
                            setSelectedLoad(load);
                            onLoadClick?.(load);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          )}

          {/* Route Segments */}
          {routeSegments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  Route Segments ({routeSegments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="relative">
                  {routeSegments.map((segment, index) => {
                    const isFirst = index === 0;
                    const isLast = index === routeSegments.length - 1;
                    const isPickup = segment.from.startsWith('Pickup:');
                    const isDelivery = segment.from.startsWith('Delivery:');

                    return (
                      <div key={index} className="flex gap-3 pb-3 last:pb-0">
                        {/* Timeline */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isFirst
                              ? 'bg-blue-500/20 text-blue-500'
                              : isPickup
                              ? 'bg-amber-500/20 text-amber-500'
                              : isDelivery
                              ? 'bg-purple-500/20 text-purple-500'
                              : 'bg-green-500/20 text-green-500'
                          }`}>
                            {isFirst ? (
                              <Truck className="h-4 w-4" />
                            ) : isPickup ? (
                              <Home className="h-4 w-4" />
                            ) : isDelivery ? (
                              <Package className="h-4 w-4" />
                            ) : (
                              <Flag className="h-4 w-4" />
                            )}
                          </div>
                          {!isLast && (
                            <div className="w-0.5 flex-1 bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10 my-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{segment.from}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">→ {segment.to}</p>
                            </div>
                            <Badge variant="outline" className="flex-shrink-0 font-mono">
                              {segment.distance.toLocaleString()} mi
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between pt-3 mt-3 border-t border-border">
                  <span className="text-sm font-medium">Total Distance</span>
                  <span className="text-sm font-bold text-primary">{routeDistance.toLocaleString()} mi</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legend - shown on smaller screens only (xl has it under map) */}
          <Card className="xl:hidden">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                  <Truck className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-700 dark:text-blue-400">Trip Start</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-green-500/10 hover:bg-green-500/20 transition-colors">
                  <Flag className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-400">Destination</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 transition-colors">
                  <Package className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-purple-700 dark:text-purple-400">Assigned Load</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                  <Home className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Pickup</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 transition-colors">
                  <CircleDot className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-400">Marketplace</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
