'use client';

import Link from 'next/link';
import { MapPin, User, ArrowUpRight, ArrowDownRight, ArrowRight, Calendar } from 'lucide-react';

export interface ScheduleEvent {
  id: string;
  time: string;
  type: 'pickup' | 'delivery';
  location: string;
  driver: string;
  loadId: string;
}

interface TodaysScheduleProps {
  events: ScheduleEvent[];
}

export function TodaysSchedule({ events }: TodaysScheduleProps) {
  const pickups = events.filter(e => e.type === 'pickup');
  const deliveries = events.filter(e => e.type === 'delivery');
  const totalEvents = events.length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Today's Schedule</h2>
            <p className="text-xs text-muted-foreground">
              {totalEvents === 0 ? 'No events' : `${totalEvents} event${totalEvents !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/trips"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {totalEvents === 0 ? (
        <div className="py-8 px-5 text-center">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No events scheduled for today</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Pickups Column */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="p-1 rounded bg-blue-500/10">
                <ArrowUpRight className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pickups
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {pickups.length}
              </span>
            </div>
            {pickups.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 px-1">No pickups</p>
            ) : (
              <div className="space-y-1">
                {pickups.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>

          {/* Deliveries Column */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="p-1 rounded bg-emerald-500/10">
                <ArrowDownRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Deliveries
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {deliveries.length}
              </span>
            </div>
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 px-1">No deliveries</p>
            ) : (
              <div className="space-y-1">
                {deliveries.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface EventCardProps {
  event: ScheduleEvent;
}

function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/dashboard/trips/${event.loadId}`}
      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center justify-center h-8 w-12 rounded-md bg-muted text-xs font-semibold text-foreground tabular-nums">
        {event.time}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-foreground truncate">{event.location}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{event.driver}</span>
        </div>
      </div>
    </Link>
  );
}
