import { getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getComplianceReport } from '@/data/reports';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Truck,
  User,
  HelpCircle,
} from 'lucide-react';
import { ComplianceExport } from './compliance-export';

export default async function ComplianceReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { items, summary } = await getComplianceReport(user.id);

  const statusConfig: Record<
    string,
    { icon: React.ElementType; color: string; bgColor: string; label: string }
  > = {
    valid: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      label: 'Valid',
    },
    expiring: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
      label: 'Expiring Soon',
    },
    expired: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/20', label: 'Expired' },
    missing: {
      icon: HelpCircle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/20',
      label: 'Missing',
    },
  };

  const categoryIcons: Record<string, React.ElementType> = {
    vehicle: Truck,
    driver: User,
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/dashboard/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-500" />
            Compliance Report
          </h1>
          <p className="text-muted-foreground">Document expiration status overview</p>
        </div>
        <ComplianceExport
          items={items.map((i) => ({
            item_name: i.item_name,
            category: i.category,
            document_type: i.document_type,
            expiry_date: i.expiry_date,
            days_until_expiry: i.days_until_expiry,
            status: i.status,
          }))}
          summary={summary}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{summary.valid}</p>
              <p className="text-sm text-muted-foreground">Valid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{summary.expiring}</p>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{summary.expired}</p>
              <p className="text-sm text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">{summary.missing}</p>
              <p className="text-sm text-muted-foreground">Missing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Items */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No compliance documents to track. Add vehicles and drivers to see their document status.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => {
                const config = statusConfig[item.status];
                const StatusIcon = config.icon;
                const CategoryIcon = categoryIcons[item.category] || Shield;

                return (
                  <div
                    key={`${item.item_id}-${item.document_type}-${index}`}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      item.status === 'expired'
                        ? 'border-red-500/50 bg-red-500/5'
                        : item.status === 'expiring'
                          ? 'border-yellow-500/50 bg-yellow-500/5'
                          : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">{item.document_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.expiry_date && (
                        <div className="text-right">
                          <p className="text-sm">
                            {new Date(item.expiry_date).toLocaleDateString()}
                          </p>
                          {item.days_until_expiry !== null && (
                            <p
                              className={`text-xs ${
                                item.days_until_expiry <= 0
                                  ? 'text-red-500'
                                  : item.days_until_expiry <= 30
                                    ? 'text-yellow-500'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {item.days_until_expiry <= 0
                                ? `${Math.abs(item.days_until_expiry)} days overdue`
                                : `${item.days_until_expiry} days left`}
                            </p>
                          )}
                        </div>
                      )}
                      <Badge className={`${config.bgColor} ${config.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
