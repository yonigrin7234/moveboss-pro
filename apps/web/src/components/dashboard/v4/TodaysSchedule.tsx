import Link from 'next/link';
import { MapPin, Clock, User, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

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
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200/80 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Today's Schedule</h2>
        <p className="text-sm text-gray-500">No events scheduled for today.</p>
      </div>
    );
  }

  const pickups = events.filter(e => e.type === 'pickup');
  const deliveries = events.filter(e => e.type === 'delivery');

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Today's Schedule</h2>
        <Link
          href="/dashboard/trips"
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* Pickups Column */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3 px-1">
            <ArrowUp className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pickups ({pickups.length})
            </span>
          </div>
          {pickups.length === 0 ? (
            <p className="text-sm text-gray-400 px-1">No pickups scheduled</p>
          ) : (
            <div className="space-y-1">
              {pickups.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Deliveries Column */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3 px-1">
            <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Deliveries ({deliveries.length})
            </span>
          </div>
          {deliveries.length === 0 ? (
            <p className="text-sm text-gray-400 px-1">No deliveries scheduled</p>
          ) : (
            <div className="space-y-1">
              {deliveries.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
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
      className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-center h-8 w-12 rounded bg-gray-100 text-xs font-semibold text-gray-700 tabular-nums">
        {event.time}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate">{event.location}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{event.driver}</span>
        </div>
      </div>
    </Link>
  );
}
