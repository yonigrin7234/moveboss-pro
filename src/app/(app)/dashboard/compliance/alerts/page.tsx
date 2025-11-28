import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import {
  getComplianceAlertsForUser,
  generateComplianceAlerts,
  type ComplianceAlert,
} from '@/data/compliance-alerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle,
  Truck,
  User,
  Building2,
  Warehouse,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

export default async function ComplianceAlertsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const company = await getWorkspaceCompanyForUser(user.id);

  // Generate/refresh alerts
  await generateComplianceAlerts(user.id, company?.id);

  // Get all alerts
  const alerts = await getComplianceAlertsForUser(user.id);

  // Sort by severity
  const severityOrder = ['expired', 'critical', 'urgent', 'warning'];
  const sortedAlerts = [...alerts].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  async function refreshAction() {
    'use server';
    revalidatePath('/dashboard/compliance/alerts');
  }

  const severityConfig: Record<
    string,
    { icon: typeof AlertCircle; color: string; bg: string; label: string }
  > = {
    expired: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Expired' },
    critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' },
    urgent: {
      icon: AlertTriangle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      label: 'Urgent',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      label: 'Warning',
    },
  };

  const getTypeIcon = (alertType: string) => {
    if (alertType.startsWith('vehicle_')) return Truck;
    if (alertType.startsWith('driver_')) return User;
    if (alertType.startsWith('partner_')) return Building2;
    if (alertType.startsWith('storage_')) return Warehouse;
    return Shield;
  };

  const formatAlertType = (alertType: string) => {
    return alertType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/dashboard/compliance">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Compliance
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Compliance Alerts
          </h1>
          <p className="text-muted-foreground">Documents expiring or needing attention</p>
        </div>
        <form action={refreshAction}>
          <Button variant="outline" type="submit">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </form>
      </div>

      {/* Alerts List */}
      {sortedAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold mb-2">All Clear!</h3>
            <p className="text-muted-foreground">No compliance issues to address</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedAlerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.warning;
            const SeverityIcon = config.icon;
            const TypeIcon = getTypeIcon(alert.alert_type);

            return (
              <Card
                key={alert.id}
                className={`${config.bg} border-l-4 ${config.color.replace('text-', 'border-')}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <TypeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{alert.item_name}</p>
                          <Badge className={`${config.bg} ${config.color}`}>
                            <SeverityIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatAlertType(alert.alert_type)}
                        </p>
                        {alert.expiry_date && (
                          <p className="text-sm mt-1">
                            {alert.days_until_expiry !== null && alert.days_until_expiry <= 0
                              ? `Expired ${Math.abs(alert.days_until_expiry)} days ago`
                              : `Expires ${new Date(alert.expiry_date).toLocaleDateString()} (${alert.days_until_expiry} days)`}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      {alert.vehicle_id ? (
                        <Link href={`/dashboard/fleet/trucks/${alert.vehicle_id}`}>Update</Link>
                      ) : alert.driver_id ? (
                        <Link href={`/dashboard/people/drivers/${alert.driver_id}`}>Update</Link>
                      ) : alert.storage_location_id ? (
                        <Link href={`/dashboard/storage/${alert.storage_location_id}`}>View</Link>
                      ) : (
                        <Link href="/dashboard/compliance">View</Link>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
