'use client';

import Link from 'next/link';
import { History, ArrowRight, Package, Truck, Store, UserPlus, UserMinus, Clock, Plus, Trash2, DollarSign, Receipt, RefreshCw, CheckCircle, XCircle, Send, RotateCcw, FileText, List, Eye, Camera, AlertTriangle, Upload } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/audit';
import { getActivityQuickActions } from './getActivityQuickActions';

interface ActivityFeedProps {
  logs: AuditLogEntry[];
  emptyMessage?: string;
  /** If provided, hides the "View [Entity]" action for the current entity */
  currentEntityId?: string;
}

/**
 * Format a timestamp to show date and time
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);

  // Format: "Dec 8, 2024 at 3:45 PM"
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get display text for an action
 */
function getActionText(log: AuditLogEntry): string {
  const metadata = log.metadata || {};

  switch (log.action) {
    // Trip status and lifecycle
    case 'status_changed': {
      const oldStatus = metadata.old_status_label || log.previous_value?.status || 'Unknown';
      const newStatus = metadata.new_status_label || log.new_value?.status || 'Unknown';
      return `changed status from "${oldStatus}" to "${newStatus}"`;
    }
    case 'trip_created':
      return 'created trip';
    case 'trip_deleted':
      return 'deleted trip';
    case 'trip_completed':
      return 'completed trip';
    case 'trip_settled': {
      const profit = metadata.total_profit;
      if (profit != null) {
        return `settled trip (profit: $${Number(profit).toLocaleString()})`;
      }
      return 'settled trip';
    }
    case 'settlement_recalculated':
      return 'recalculated settlement';

    // Driver actions
    case 'driver_assigned': {
      const driverName = metadata.driver_name || 'a driver';
      return `assigned ${driverName}`;
    }
    case 'driver_removed':
      return 'removed driver assignment';
    case 'driver_sharing_changed': {
      const sharing = metadata.share_driver_with_companies;
      return sharing ? 'enabled driver info sharing' : 'disabled driver info sharing';
    }

    // Equipment actions
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

    // Load on trip actions
    case 'load_added': {
      const loadNum = metadata.load_number;
      return loadNum ? `added load ${loadNum} to trip` : 'added load to trip';
    }
    case 'load_removed': {
      const loadNum = metadata.load_number;
      return loadNum ? `removed load ${loadNum} from trip` : 'removed load from trip';
    }
    case 'loads_reordered': {
      const count = metadata.load_count;
      return count ? `reordered ${count} loads` : 'reordered loads';
    }
    case 'delivery_order_confirmed':
      return 'confirmed delivery order and notified driver';

    // Expense actions
    case 'expense_added': {
      const category = metadata.category;
      const amount = metadata.amount;
      if (category && amount) {
        return `added ${category} expense ($${Number(amount).toLocaleString()})`;
      }
      return 'added expense';
    }
    case 'expense_updated':
      return 'updated expense';
    case 'expense_deleted': {
      const category = metadata.category;
      return category ? `deleted ${category} expense` : 'deleted expense';
    }

    // Load lifecycle
    case 'load_created':
      return 'created load';
    case 'load_updated': {
      const fields = metadata.fields_updated as string[] | undefined;
      if (fields && fields.length > 0 && fields.length <= 3) {
        return `updated ${fields.join(', ')}`;
      }
      return 'updated load';
    }
    case 'load_deleted':
      return 'deleted load';
    case 'load_delivered':
      return 'marked as delivered';
    case 'load_status_changed': {
      const oldStatus = metadata.old_status;
      const newStatus = metadata.new_status;
      if (oldStatus && newStatus) {
        return `changed status from "${oldStatus}" to "${newStatus}"`;
      }
      return 'updated load status';
    }

    // Load-Trip relationship actions
    case 'added_to_trip': {
      const tripNum = metadata.trip_number;
      return tripNum ? `added to trip ${tripNum}` : 'added to trip';
    }
    case 'removed_from_trip': {
      const tripNum = metadata.trip_number;
      return tripNum ? `removed from trip ${tripNum}` : 'removed from trip';
    }

    // Marketplace actions
    case 'posted_to_marketplace':
      return 'posted to marketplace';
    case 'removed_from_marketplace':
      return 'removed from marketplace';
    case 'carrier_assigned': {
      const carrierName = metadata.carrier_name || 'a carrier';
      return `assigned to ${carrierName}`;
    }
    case 'carrier_removed':
      return 'removed carrier assignment';
    case 'carrier_request_submitted': {
      const isCounter = metadata.is_counter_offer;
      return isCounter ? 'submitted counter offer' : 'requested load';
    }
    case 'carrier_request_accepted':
      return 'accepted carrier request';
    case 'carrier_request_rejected':
      return 'rejected carrier request';
    case 'carrier_request_withdrawn':
      return 'withdrew request';

    // Partnership actions
    case 'partnership_created':
      return 'created partnership';
    case 'partnership_upgraded': {
      const newStatus = metadata.new_status;
      return newStatus === 'active' ? 'reactivated partnership' : 'upgraded partnership';
    }
    case 'partnership_deactivated': {
      const newStatus = metadata.new_status;
      const reason = metadata.reason;
      if (newStatus === 'paused') {
        return reason ? `paused partnership (${reason})` : 'paused partnership';
      }
      return reason ? `terminated partnership (${reason})` : 'terminated partnership';
    }
    case 'updated':
      return 'updated details';

    // Company actions
    case 'company_updated': {
      const companyName = metadata.company_name;
      return companyName ? `updated company "${companyName}"` : 'updated company';
    }
    case 'created': {
      const companyName = metadata.company_name;
      return companyName ? `created company "${companyName}"` : 'created company';
    }
    case 'deleted': {
      const companyName = metadata.company_name;
      return companyName ? `deleted company "${companyName}"` : 'deleted company';
    }
    case 'member_added': {
      const memberName = metadata.member_name;
      return memberName ? `added ${memberName} to company` : 'added team member';
    }
    case 'member_removed': {
      const memberName = metadata.member_name;
      return memberName ? `removed ${memberName} from company` : 'removed team member';
    }

    // Upload/photo actions
    case 'photo_uploaded': {
      const photoType = metadata.photo_type || 'photo';
      const count = typeof metadata.photo_count === 'number' ? metadata.photo_count : 0;
      if (count > 1) {
        return `uploaded ${count} ${photoType} photos`;
      }
      return `uploaded ${photoType} photo`;
    }
    case 'photo_deleted': {
      const photoType = metadata.photo_type || 'photo';
      return `deleted ${photoType} photo`;
    }
    case 'damage_documented': {
      const count = typeof metadata.damage_count === 'number' ? metadata.damage_count : 0;
      const severity = metadata.severity;
      if (count > 1) {
        return `documented ${count} damages`;
      }
      return severity ? `documented ${severity} damage` : 'documented damage';
    }
    case 'paperwork_uploaded': {
      const docType = metadata.document_type || 'paperwork';
      return `uploaded ${docType}`;
    }
    case 'odometer_photo_uploaded': {
      const phase = metadata.phase; // 'start' or 'end'
      const reading = metadata.reading;
      if (phase && reading) {
        return `uploaded ${phase} odometer photo (${Number(reading).toLocaleString()} mi)`;
      }
      return phase ? `uploaded ${phase} odometer photo` : 'uploaded odometer photo';
    }
    case 'receipt_uploaded': {
      const category = metadata.category;
      const amount = metadata.amount;
      if (category && amount) {
        return `uploaded receipt for ${category} ($${Number(amount).toLocaleString()})`;
      }
      return category ? `uploaded ${category} receipt` : 'uploaded receipt';
    }
    case 'document_uploaded': {
      const docType = metadata.document_type || 'document';
      return `uploaded ${docType}`;
    }
    case 'document_version_uploaded': {
      const docType = metadata.document_type || 'document';
      const version = metadata.version_number;
      return version ? `uploaded ${docType} v${version}` : `uploaded new version of ${docType}`;
    }

    default:
      return log.action.replace(/_/g, ' ');
  }
}

/**
 * Get icon for an action
 */
function getActionIcon(action: string): React.ReactNode {
  switch (action) {
    // Status changes
    case 'status_changed':
    case 'load_status_changed':
      return <ArrowRight className="h-3 w-3" />;

    // Creation and deletion
    case 'trip_created':
    case 'load_created':
      return <Plus className="h-3 w-3" />;
    case 'trip_deleted':
    case 'load_deleted':
      return <Trash2 className="h-3 w-3" />;

    // Driver actions
    case 'driver_assigned':
      return <UserPlus className="h-3 w-3" />;
    case 'driver_removed':
      return <UserMinus className="h-3 w-3" />;
    case 'driver_sharing_changed':
      return <Eye className="h-3 w-3" />;

    // Equipment
    case 'equipment_assigned':
      return <Truck className="h-3 w-3" />;

    // Marketplace
    case 'posted_to_marketplace':
    case 'removed_from_marketplace':
    case 'carrier_request_submitted':
    case 'carrier_request_withdrawn':
      return <Store className="h-3 w-3" />;
    case 'carrier_assigned':
    case 'carrier_request_accepted':
      return <CheckCircle className="h-3 w-3" />;
    case 'carrier_removed':
    case 'carrier_request_rejected':
      return <XCircle className="h-3 w-3" />;

    // Load actions
    case 'load_added':
    case 'load_removed':
    case 'load_updated':
    case 'load_delivered':
      return <Package className="h-3 w-3" />;
    case 'loads_reordered':
      return <List className="h-3 w-3" />;
    case 'delivery_order_confirmed':
      return <Send className="h-3 w-3" />;

    // Load-Trip relationship (on load entity)
    case 'added_to_trip':
    case 'removed_from_trip':
      return <Truck className="h-3 w-3" />;

    // Expenses
    case 'expense_added':
    case 'expense_updated':
    case 'expense_deleted':
      return <Receipt className="h-3 w-3" />;

    // Settlements
    case 'trip_settled':
      return <DollarSign className="h-3 w-3" />;
    case 'settlement_recalculated':
      return <RefreshCw className="h-3 w-3" />;

    // Trip completion
    case 'trip_completed':
      return <CheckCircle className="h-3 w-3" />;

    // Partnerships
    case 'partnership_created':
      return <Plus className="h-3 w-3" />;
    case 'partnership_upgraded':
      return <CheckCircle className="h-3 w-3" />;
    case 'partnership_deactivated':
      return <XCircle className="h-3 w-3" />;
    case 'updated':
      return <FileText className="h-3 w-3" />;

    // Company actions
    case 'company_updated':
      return <FileText className="h-3 w-3" />;
    case 'created':
      return <Plus className="h-3 w-3" />;
    case 'deleted':
      return <Trash2 className="h-3 w-3" />;
    case 'member_added':
      return <UserPlus className="h-3 w-3" />;
    case 'member_removed':
      return <UserMinus className="h-3 w-3" />;

    // Upload/photo actions
    case 'photo_uploaded':
    case 'odometer_photo_uploaded':
      return <Camera className="h-3 w-3" />;
    case 'photo_deleted':
      return <Trash2 className="h-3 w-3" />;
    case 'damage_documented':
      return <AlertTriangle className="h-3 w-3" />;
    case 'paperwork_uploaded':
    case 'document_uploaded':
    case 'document_version_uploaded':
      return <FileText className="h-3 w-3" />;
    case 'receipt_uploaded':
      return <Receipt className="h-3 w-3" />;

    default:
      return <Clock className="h-3 w-3" />;
  }
}

/**
 * Get the performer's display name
 */
function getPerformerName(log: AuditLogEntry): string {
  // First try the joined performer data
  if (log.performer_name) return log.performer_name;

  // Then try metadata (stored at log time)
  const metadata = log.metadata || {};
  if (metadata.performer_name && typeof metadata.performer_name === 'string') {
    return metadata.performer_name;
  }

  // Try email from performer or metadata
  const email = log.performer_email || (typeof metadata.performer_email === 'string' ? metadata.performer_email : null);
  if (email) {
    // Extract name from email (before @)
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  return 'Unknown User';
}

export function ActivityFeed({ logs, emptyMessage = 'No activity yet', currentEntityId }: ActivityFeedProps) {
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

                {/* Quick actions */}
                {(() => {
                  let actions = getActivityQuickActions(log);
                  // If we're on an entity page, filter out the action linking to the same entity
                  if (currentEntityId && log.entity_id === currentEntityId) {
                    actions = actions.filter(a => !a.href.includes(currentEntityId));
                  }
                  if (actions.length === 0) return null;
                  return (
                    <div className="flex items-center gap-2 mt-2">
                      {actions.map((action, actionIndex) => (
                        <Link
                          key={actionIndex}
                          href={action.href}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
                        >
                          <action.icon className="h-3 w-3" />
                          {action.label}
                        </Link>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
