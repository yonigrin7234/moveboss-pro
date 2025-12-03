import Link from 'next/link';
import { Clock, MapPin, Package } from 'lucide-react';

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

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        TODAY'S SCHEDULE
      </h2>

      <div className="space-y-2">
        {events.slice(0, 6).map((event) => (
          <Link
            key={event.id}
            href={`/dashboard/trips/${event.loadId}`}
            className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-all group"
          >
            {/* Time */}
            <div className="flex items-center gap-2 min-w-[80px]">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold tabular-nums">{event.time}</span>
            </div>

            {/* Type Badge */}
            <div
              className={`px-2 py-1 rounded text-xs font-semibold ${
                event.type === 'pickup'
                  ? 'bg-blue-500/10 text-blue-700'
                  : 'bg-emerald-500/10 text-emerald-700'
              }`}
            >
              {event.type === 'pickup' ? 'Pickup' : 'Delivery'}
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">{event.location}</span>
            </div>

            {/* Driver */}
            <span className="text-sm text-muted-foreground hidden sm:block">{event.driver}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
