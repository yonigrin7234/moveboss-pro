'use client';

import { MapPin, Phone, Mail, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LoadDetailViewModel, LocationInfo } from '@/lib/load-detail-model';
import { formatDateRange } from '@/lib/load-detail-model';

interface LoadDetailRouteProps {
  model: LoadDetailViewModel;
}

function LocationCard({
  location,
  type,
  iconColor,
}: {
  location: LocationInfo;
  type: 'origin' | 'destination';
  iconColor: string;
}) {
  const title = type === 'origin' ? 'Origin' : 'Destination';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className={`h-5 w-5 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="font-medium">
            {location.city}, {location.state} {location.zip}
          </p>
          {location.address && (
            <p className="text-sm text-muted-foreground">{location.address}</p>
          )}
          {location.address2 && (
            <p className="text-sm text-muted-foreground">{location.address2}</p>
          )}
        </div>

        {(location.contactName || location.contactPhone || location.contactEmail) && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Contact</p>
            {location.contactName && (
              <p className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {location.contactName}
              </p>
            )}
            {location.contactPhone && (
              <p className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${location.contactPhone}`}
                  className="text-blue-600 hover:underline"
                >
                  {location.contactPhone}
                </a>
              </p>
            )}
            {location.contactEmail && (
              <p className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${location.contactEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {location.contactEmail}
                </a>
              </p>
            )}
          </div>
        )}

        {location.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm">{location.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LoadDetailRoute({ model }: LoadDetailRouteProps) {
  const hasDates =
    model.dates.loadDateStart ||
    model.dates.deliveryDateStart ||
    model.dates.availableDate ||
    model.dates.firstAvailableDate;

  return (
    <div className="space-y-6">
      {/* Dates Card */}
      {hasDates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Load Date</p>
                <p className="font-medium">
                  {formatDateRange(model.dates.loadDateStart, model.dates.loadDateEnd)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Date</p>
                <p className="font-medium">
                  {formatDateRange(model.dates.deliveryDateStart, model.dates.deliveryDateEnd)}
                </p>
              </div>
              {model.dates.firstAvailableDate && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">First Available</p>
                  <p className="font-medium">
                    {new Date(model.dates.firstAvailableDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Origin Card */}
      <LocationCard location={model.origin} type="origin" iconColor="text-green-500" />

      {/* Destination Card */}
      <LocationCard location={model.destination} type="destination" iconColor="text-red-500" />
    </div>
  );
}
