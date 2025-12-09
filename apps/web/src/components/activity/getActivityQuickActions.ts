import type { AuditLogEntry, AuditEntityType } from '@/lib/audit';
import { ExternalLink, Eye, Truck, Package, Building2, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Quick action descriptor for activity items
 */
export interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Get quick actions for an activity log entry.
 * Returns navigation links to relevant detail pages.
 */
export function getActivityQuickActions(
  log: AuditLogEntry
): QuickAction[] {
  const actions: QuickAction[] = [];
  const { entity_type, entity_id, action, metadata } = log;

  // Primary action: View the main entity
  switch (entity_type) {
    case 'load':
      actions.push({
        label: 'View Load',
        href: `/dashboard/loads/${entity_id}`,
        icon: Package,
      });
      break;

    case 'trip':
      actions.push({
        label: 'View Trip',
        href: `/dashboard/trips/${entity_id}`,
        icon: Truck,
      });
      break;

    case 'partnership':
      actions.push({
        label: 'View Partnership',
        href: `/dashboard/partnerships/${entity_id}`,
        icon: Users,
      });
      break;

    case 'company':
      actions.push({
        label: 'View Company',
        href: `/dashboard/settings/company-profile`,
        icon: Building2,
      });
      break;
  }

  // Secondary actions based on action type and metadata
  if (entity_type === 'trip') {
    // If a load was added/removed, offer link to the load
    if (
      (action === 'load_added' || action === 'load_removed') &&
      metadata?.load_id
    ) {
      actions.push({
        label: 'View Load',
        href: `/dashboard/loads/${metadata.load_id}`,
        icon: Package,
      });
    }

    // If driver was assigned, could link to driver detail (if we have that page)
    // For now, we skip driver links since driver detail pages may not exist
  }

  if (entity_type === 'load') {
    // If the load was added to a trip, offer link to the trip
    if (metadata?.trip_id) {
      actions.push({
        label: 'View Trip',
        href: `/dashboard/trips/${metadata.trip_id}`,
        icon: Truck,
      });
    }

    // If carrier was assigned, could link to partnership
    if (
      (action === 'carrier_assigned' || action === 'carrier_request_accepted') &&
      metadata?.partnership_id
    ) {
      actions.push({
        label: 'View Partnership',
        href: `/dashboard/partnerships/${metadata.partnership_id}`,
        icon: Users,
      });
    }
  }

  return actions;
}
