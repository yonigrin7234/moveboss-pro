'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Clock, CalendarClock, FileWarning, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CriticalAlertsData } from '@/types/critical-alerts';
import { formatRequestAge } from '@/lib/format-utils';
import { useTabNotification } from '@/hooks/use-tab-notification';

interface CriticalAlertsBannerProps {
  /** Initial alerts data (server-side rendered) */
  initialData?: CriticalAlertsData | null;
  /** User ID for polling */
  userId?: string;
  /** Polling interval in milliseconds (default: 60000 = 1 minute) */
  pollInterval?: number;
  /** Custom class name */
  className?: string;
}

type AlertType = 'requests' | 'rfd' | 'compliance';

interface AlertItem {
  type: AlertType;
  severity: 'critical' | 'urgent' | 'warning';
  message: string;
  count: number;
  href: string;
  icon: React.ReactNode;
}

export function CriticalAlertsBanner({
  initialData,
  userId,
  pollInterval = 60000,
  className,
}: CriticalAlertsBannerProps) {
  const [data, setData] = useState<CriticalAlertsData | null>(initialData || null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<AlertType>>(new Set());
  const [isLoading, setIsLoading] = useState(!initialData);

  // Calculate total critical count for tab notification
  const criticalCount = data
    ? data.pendingLoadRequests.count +
      data.criticalRFD.criticalCount +
      data.complianceAlerts.expiredCount
    : 0;

  // Update browser tab title with alert count
  useTabNotification({
    count: criticalCount,
    flash: criticalCount > 0,
    flashMessage: 'Action Required!',
    enabled: !!userId,
  });

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/critical-alerts');
      if (response.ok) {
        const newData = await response.json();
        setData(newData);

        // Clear dismissed alerts if counts changed (new alerts came in)
        if (data) {
          if (newData.pendingLoadRequests.count > data.pendingLoadRequests.count) {
            setDismissedAlerts(prev => {
              const next = new Set(prev);
              next.delete('requests');
              return next;
            });
          }
          if (newData.criticalRFD.totalNeedingAttention > data.criticalRFD.totalNeedingAttention) {
            setDismissedAlerts(prev => {
              const next = new Set(prev);
              next.delete('rfd');
              return next;
            });
          }
          if (newData.complianceAlerts.totalCount > data.complianceAlerts.totalCount) {
            setDismissedAlerts(prev => {
              const next = new Set(prev);
              next.delete('compliance');
              return next;
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch critical alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, data]);

  // Initial fetch if no initial data
  useEffect(() => {
    if (!initialData && userId) {
      fetchAlerts();
    }
  }, [initialData, userId, fetchAlerts]);

  // Polling
  useEffect(() => {
    if (!userId || pollInterval <= 0) return;

    const interval = setInterval(fetchAlerts, pollInterval);
    return () => clearInterval(interval);
  }, [userId, pollInterval, fetchAlerts]);

  // Dismiss an alert type
  const dismissAlert = (type: AlertType) => {
    setDismissedAlerts(prev => new Set(prev).add(type));
  };

  // Build alert items
  const alerts: AlertItem[] = [];

  if (data) {
    // Pending load requests
    if (data.pendingLoadRequests.count > 0 && !dismissedAlerts.has('requests')) {
      const ageText = data.pendingLoadRequests.oldestRequestAge
        ? ` (oldest: ${formatRequestAge(data.pendingLoadRequests.oldestRequestAge)})`
        : '';
      alerts.push({
        type: 'requests',
        severity: 'critical',
        message: `${data.pendingLoadRequests.count} pending load request${data.pendingLoadRequests.count !== 1 ? 's' : ''} awaiting response${ageText}`,
        count: data.pendingLoadRequests.count,
        href: '/dashboard/carrier-requests',
        icon: <Clock className="h-4 w-4" />,
      });
    }

    // Critical RFD
    if (data.criticalRFD.criticalCount > 0 && !dismissedAlerts.has('rfd')) {
      alerts.push({
        type: 'rfd',
        severity: 'critical',
        message: `${data.criticalRFD.criticalCount} load${data.criticalRFD.criticalCount !== 1 ? 's' : ''} with critical RFD (today or overdue)`,
        count: data.criticalRFD.criticalCount,
        href: '/dashboard/loads?status=pending',
        icon: <CalendarClock className="h-4 w-4" />,
      });
    } else if (data.criticalRFD.urgentCount > 0 && !dismissedAlerts.has('rfd')) {
      alerts.push({
        type: 'rfd',
        severity: 'urgent',
        message: `${data.criticalRFD.urgentCount} load${data.criticalRFD.urgentCount !== 1 ? 's' : ''} with urgent RFD (within 48 hours)`,
        count: data.criticalRFD.urgentCount,
        href: '/dashboard/loads?status=pending',
        icon: <CalendarClock className="h-4 w-4" />,
      });
    }

    // Compliance alerts
    if (data.complianceAlerts.expiredCount > 0 && !dismissedAlerts.has('compliance')) {
      alerts.push({
        type: 'compliance',
        severity: 'critical',
        message: `${data.complianceAlerts.expiredCount} expired compliance item${data.complianceAlerts.expiredCount !== 1 ? 's' : ''}`,
        count: data.complianceAlerts.expiredCount,
        href: '/dashboard/compliance',
        icon: <FileWarning className="h-4 w-4" />,
      });
    } else if (data.complianceAlerts.criticalCount > 0 && !dismissedAlerts.has('compliance')) {
      alerts.push({
        type: 'compliance',
        severity: 'urgent',
        message: `${data.complianceAlerts.criticalCount} compliance item${data.complianceAlerts.criticalCount !== 1 ? 's' : ''} expiring soon`,
        count: data.complianceAlerts.criticalCount,
        href: '/dashboard/compliance',
        icon: <FileWarning className="h-4 w-4" />,
      });
    }
  }

  // Don't render if no alerts or still loading
  if (isLoading || alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-0', className)}>
      {alerts.map((alert) => (
        <AlertBannerItem
          key={alert.type}
          alert={alert}
          onDismiss={() => dismissAlert(alert.type)}
        />
      ))}
    </div>
  );
}

interface AlertBannerItemProps {
  alert: AlertItem;
  onDismiss: () => void;
}

function AlertBannerItem({ alert, onDismiss }: AlertBannerItemProps) {
  const severityStyles = {
    critical: {
      bg: 'bg-rose-500/10 border-rose-500/20',
      icon: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
      text: 'text-rose-700 dark:text-rose-300',
      action: 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300',
    },
    urgent: {
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
      text: 'text-amber-700 dark:text-amber-300',
      action: 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
    },
    warning: {
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      icon: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
      text: 'text-yellow-700 dark:text-yellow-300',
      action: 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300',
    },
  };

  const styles = severityStyles[alert.severity];

  return (
    <div className={cn('border-b', styles.bg)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5">
          <Link href={alert.href} className="flex-1 flex items-center gap-2.5 group">
            <div className={cn('flex items-center justify-center h-6 w-6 rounded-full', styles.icon)}>
              {alert.icon}
            </div>
            <span className={cn('text-sm font-medium', styles.text)}>
              {alert.message}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={alert.href}
              className={cn(
                'flex items-center gap-1 text-xs font-semibold transition-colors',
                styles.action
              )}
            >
              View
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onDismiss();
              }}
              className={cn(
                'p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
                styles.action
              )}
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
