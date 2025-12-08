'use client';

import Link from 'next/link';
import { User, Truck, Route, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LoadDetailViewModel } from '@/lib/load-detail-model';

interface LoadDetailAssignmentsProps {
  model: LoadDetailViewModel;
  onAssignToTrip?: () => void;
  tripAssignmentSlot?: React.ReactNode;
}

export function LoadDetailAssignments({
  model,
  onAssignToTrip,
  tripAssignmentSlot,
}: LoadDetailAssignmentsProps) {
  const hasDriver = !!model.driver;
  const hasEquipment = !!(model.equipment?.truck || model.equipment?.trailer);
  const hasTrip = !!model.trip;

  // Only show if there's something to display or actions available
  const showDriverCard = hasDriver || model.permissions.canAssignDriver;
  const showEquipmentCard = hasEquipment;
  const showTripCard = hasTrip || model.permissions.canAssignToTrip;

  if (!showDriverCard && !showEquipmentCard && !showTripCard) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Driver Card */}
      {showDriverCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Assigned Driver
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasDriver ? (
              <div>
                <p className="font-medium">{model.driver!.name}</p>
                {model.driver!.phone && (
                  <a
                    href={`tel:${model.driver!.phone}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {model.driver!.phone}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No driver assigned</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Equipment Card */}
      {showEquipmentCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {model.equipment?.truck && (
              <div className="flex items-center gap-3">
                <span className="text-xl">🚛</span>
                <div>
                  <p className="text-sm text-muted-foreground">Truck</p>
                  <p className="font-medium">{model.equipment.truck.unitNumber}</p>
                  {model.equipment.truck.details && (
                    <p className="text-sm text-muted-foreground">{model.equipment.truck.details}</p>
                  )}
                </div>
              </div>
            )}
            {model.equipment?.trailer && (
              <div className="flex items-center gap-3">
                <span className="text-xl">📦</span>
                <div>
                  <p className="text-sm text-muted-foreground">Trailer</p>
                  <p className="font-medium">{model.equipment.trailer.unitNumber}</p>
                  {model.equipment.trailer.details && (
                    <p className="text-sm text-muted-foreground">{model.equipment.trailer.details}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trip Assignment Card */}
      {showTripCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Trip Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasTrip ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Assigned to Trip</span>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold">Trip #{model.trip!.tripNumber}</p>
                  {model.trip!.driverName && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="h-4 w-4" />
                      {model.trip!.driverName}
                    </p>
                  )}
                </div>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/dashboard/trips/${model.trip!.id}`}>View Trip</Link>
                </Button>
              </div>
            ) : model.permissions.canAssignToTrip ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium">Not assigned to a trip</span>
                </div>
                {tripAssignmentSlot}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Not assigned to a trip</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
