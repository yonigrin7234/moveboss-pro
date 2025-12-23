/**
 * SuggestedLoads - Smart load matching based on driver delivery locations
 * Shows loads from marketplace that match where drivers will be after deliveries
 */

import Link from 'next/link';
import { Lightbulb, MapPin, ArrowRight, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface SuggestedLoad {
  id: string;
  load_number: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  estimated_cuft?: number | null;
  rate?: number | null;
  match_reason: string; // e.g., "Driver John delivers nearby tomorrow"
  match_driver_name?: string;
  distance_from_delivery?: number | null; // miles from driver's delivery location
}

interface SuggestedLoadsProps {
  loads: SuggestedLoad[];
}

export function SuggestedLoads({ loads }: SuggestedLoadsProps) {
  if (loads.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Suggested Loads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No suggested loads right now</p>
            <p className="text-xs mt-1">
              Suggestions appear based on where your drivers will be after deliveries
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Suggested Loads
          </CardTitle>
          <Link
            href="/dashboard/load-board"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Browse all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Based on your drivers&apos; delivery locations
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {loads.slice(0, 4).map((load) => (
          <Link
            key={load.id}
            href={`/dashboard/load-board/${load.id}`}
            className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{load.load_number}</span>
                {load.distance_from_delivery != null && load.distance_from_delivery <= 25 && (
                  <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                    {load.distance_from_delivery} mi away
                  </Badge>
                )}
              </div>
              {load.rate != null && (
                <span className="text-sm font-medium text-emerald-500">
                  ${load.rate.toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <MapPin className="h-3 w-3" />
              {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-500 font-medium">
                {load.match_reason}
              </span>
              {load.estimated_cuft != null && (
                <span className="text-xs text-muted-foreground">
                  {load.estimated_cuft} cuft
                </span>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
