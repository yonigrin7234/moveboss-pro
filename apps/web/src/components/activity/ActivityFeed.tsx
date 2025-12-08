'use client';

import { History, ArrowRight, Package, Truck, Store, UserPlus, UserMinus, Clock } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/audit';

interface ActivityFeedProps {
  logs: AuditLogEntry[];
  emptyMessage?: string;
}

/**
 * Format a timestamp to a human-readable relative time or date
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get display text for an action
 */
function getActionText(log: AuditLogEntry): string {
  const metadata = log.metadata || {};

  switch (log.action) {
    case 'status_changed': {
      const oldStatus = metadata.old_status_label || log.previous_value?.status || 'Unknown';
      const newStatus = metadata.new_status_label || log.new_value?.status || 'Unknown';
      return `changed status from "${oldStatus}" to "${newStatus}"`;
    }
    case 'driver_assigned': {
      const driverName = metadata.driver_name || 'a driver';
      return `assigned ${driverName}`;
    }
    case 'driver_removed':
      return 'removed driver assignment';
    case 'posted_to_marketplace':
      return 'posted to marketplace';
    case 'removed_from_marketplace':
      return 'removed from marketplace';
    case 'carrier_assigned': {
      const carrierName = metadata.carrier_name || 'a carrier';
      return `assigned to ${carrierName}`;
    }
    case 'carrier_request_accepted':
      return 'accepted carrier request';
    case 'carrier_request_rejected':
      return 'rejected carrier request';
    case 'load_added':
      return 'added load to trip';
    case 'load_removed':
      return 'removed load from trip';
    case 'trip_created':
      return 'created trip';
    case 'trip_completed':
      return 'completed trip';
    case 'trip_settled':
      return 'settled trip';
    case 'load_created':
      return 'created load';
    case 'load_delivered':
      return 'marked as delivered';
    case 'equipment_assigned': {
      const truckUnit = metadata.truck_unit || null;
      const trailerUnit = metadata.trailer_unit || null;
      if (truckUnit && trailerUnit) {
        return `assigned truck ${truckUnit} and trailer ${trailerUnit}`;
      } else if (truckUnit) {
        return `assigned truck ${truckUnit}`;
      } else if (trailerUnit) {
        return `assigned trailer ${trailerUnit}`;
      }
      return 'updated equipment assignment';
    }
    case 'partnership_created':
      return 'created partnership';
    case 'partnership_upgraded':
      return 'upgraded partnership to mutual';
    default:
      return log.action.replace(/_/g, ' ');
  }
}

/**
 * Get icon for an action
 */
function getActionIcon(action: string): React.ReactNode {
  switch (action) {
    case 'status_changed':
      return <ArrowRight className="h-3 w-3" />;
    case 'driver_assigned':
      return <UserPlus className="h-3 w-3" />;
    case 'driver_removed':
      return <UserMinus className="h-3 w-3" />;
    case 'posted_to_marketplace':
    case 'removed_from_marketplace':
      return <Store className="h-3 w-3" />;
    case 'equipment_assigned':
      return <Truck className="h-3 w-3" />;
    case 'load_added':
    case 'load_removed':
    case 'load_created':
    case 'load_delivered':
      return <Package className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
}

/**
 * Get the performer's display name
 */
function getPerformerName(log: AuditLogEntry): string {
  if (log.performer_name) return log.performer_name;
  if (log.performer_email) {
    // Extract name from email (before @)
    const name = log.performer_email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return 'Someone';
}

export function ActivityFeed({ logs, emptyMessage = 'No activity yet' }: ActivityFeedProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
          <div className="p-2 rounded-lg bg-muted">
            <History className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Activity</h2>
            <p className="text-xs text-muted-foreground">Recent changes</p>
          </div>
        </div>
        <div className="py-8 px-5 text-center">
          <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="p-2 rounded-lg bg-muted">
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Activity</h2>
          <p className="text-xs text-muted-foreground">
            {logs.length} event{logs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4">
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="flex gap-3">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {getActionIcon(log.action)}
                </div>
                {index < logs.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{getPerformerName(log)}</span>
                    {' '}
                    <span className="text-muted-foreground">{getActionText(log)}</span>
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(log.created_at)}
                  </span>
                </div>

                {/* Show additional details from metadata */}
                {log.action === 'posted_to_marketplace' && log.metadata && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {log.metadata.cubic_feet != null && (
                      <span>{String(log.metadata.cubic_feet)} cuft</span>
                    )}
                    {log.metadata.linehaul_amount != null && (
                      <span> • ${Number(log.metadata.linehaul_amount).toLocaleString()}</span>
                    )}
                  </div>
                )}

                {/* Show source badge for non-web events */}
                {log.source !== 'web' && (
                  <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                    {log.source === 'mobile' ? 'Mobile' : 'System'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
