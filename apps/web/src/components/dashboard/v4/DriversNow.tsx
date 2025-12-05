'use client';

import Link from 'next/link';
import { MapPin, Phone, ArrowRight, Truck, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveDriverStatus } from '@/data/dashboard-data';

interface DriversNowProps {
  drivers: LiveDriverStatus[];
  driversOnRoad: number;
  totalDrivers: number;
}

const statusConfig: Record<LiveDriverStatus['status'], {
  label: string;
  color: string;
  bgColor: string;
  icon?: React.ReactNode;
}> = {
  delivering: {
    label: 'Delivering',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    icon: <Truck className="h-3 w-3" />,
  },
  loading: {
    label: 'Loading',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500',
  },
  in_transit: {
    label: 'In Transit',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    icon: <Truck className="h-3 w-3" />,
  },
  available: {
    label: 'Available',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500',
    icon: <Coffee className="h-3 w-3" />,
  },
  offline: {
    label: 'Offline',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted-foreground',
  },
};

export function DriversNow({ drivers, driversOnRoad, totalDrivers }: DriversNowProps) {
  if (drivers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Drivers Now</h2>
        </div>
        <div className="text-center py-6 text-muted-foreground text-sm">
          No active drivers
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Drivers Now</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-foreground tabular-nums">{driversOnRoad}</span>
            <span className="text-xs text-muted-foreground">/ {totalDrivers} on road</span>
          </div>
        </div>
        <Link
          href="/dashboard/drivers"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          All drivers
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal scrolling driver cards */}
      <div className="flex gap-2.5 p-4 overflow-x-auto scrollbar-hide">
        {drivers.slice(0, 10).map((driver) => {
          const config = statusConfig[driver.status];
          const isActive = driver.status === 'delivering' || driver.status === 'in_transit' || driver.status === 'loading';

          return (
            <Link
              key={driver.id}
              href={`/dashboard/drivers/${driver.id}`}
              className={cn(
                "flex-shrink-0 flex flex-col gap-2 p-3 rounded-lg border transition-all duration-150 min-w-[160px]",
                "bg-background hover:bg-accent/50 hover:border-foreground/10",
                isActive ? "border-emerald-500/30" : "border-border"
              )}
            >
              {/* Avatar + Status indicator */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                    {driver.initials}
                  </div>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                      config.bgColor
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{driver.name}</p>
                  <p className={cn("text-[10px] font-medium uppercase tracking-wide", config.color)}>
                    {config.label}
                  </p>
                </div>
              </div>

              {/* Location or status details */}
              {driver.location ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{driver.location}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {config.icon}
                  <span>{config.label}</span>
                </div>
              )}

              {/* Quick call button */}
              {driver.phone && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = `tel:${driver.phone}`;
                  }}
                  className="flex items-center justify-center gap-1.5 mt-1 py-1.5 rounded-md bg-muted text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  Call
                </button>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
