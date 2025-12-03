import Link from 'next/link';
import { MapPin, Clock, User } from 'lucide-react';

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
  if (events.length === 0) return null;

  const pickups = events.filter(e => e.type === 'pickup');
  const deliveries = events.filter(e => e.type === 'delivery');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pickups Column */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Today's Pickups
        </h3>
        {pickups.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-border/20 text-center">
            <p className="text-sm text-muted-foreground">No pickups scheduled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pickups.slice(0, 4).map((event, index) => (
              <EventCard key={event.id} event={event} isLast={index === pickups.length - 1} />
            ))}
          </div>
        )}
      </div>

      {/* Deliveries Column */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Today's Deliveries
        </h3>
        {deliveries.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-border/20 text-center">
            <p className="text-sm text-muted-foreground">No deliveries scheduled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.slice(0, 4).map((event, index) => (
              <EventCard key={event.id} event={event} isLast={index === deliveries.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: ScheduleEvent;
  isLast: boolean;
}

function EventCard({ event, isLast }: EventCardProps) {
  return (
    <Link
      href={`/dashboard/trips/${event.loadId}`}
      className="flex items-start gap-3 p-3 rounded-lg bg-white border border-border/20 hover:border-border/40 hover:shadow-sm transition-all duration-150"
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
        {!isLast && <div className="w-0.5 h-full bg-border/30 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold tabular-nums">{event.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground truncate">{event.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{event.driver}</span>
        </div>
      </div>
    </Link>
  );
}
