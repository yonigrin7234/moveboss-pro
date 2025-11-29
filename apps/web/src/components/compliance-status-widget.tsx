import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

interface ComplianceStatusWidgetProps {
  counts: {
    warning: number;
    urgent: number;
    critical: number;
    expired: number;
  };
  href: string;
}

export function ComplianceStatusWidget({ counts, href }: ComplianceStatusWidgetProps) {
  const total = counts.warning + counts.urgent + counts.critical + counts.expired;
  const hasIssues = total > 0;
  const hasCritical = counts.critical > 0 || counts.expired > 0;

  return (
    <Card
      className={
        hasCritical
          ? 'border-red-500/30'
          : hasIssues
            ? 'border-yellow-500/30'
            : 'border-green-500/30'
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasIssues ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>All compliant</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {counts.expired > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {counts.expired} Expired
                </Badge>
              )}
              {counts.critical > 0 && (
                <Badge className="bg-red-500/20 text-red-500 gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {counts.critical} Critical
                </Badge>
              )}
              {counts.urgent > 0 && (
                <Badge className="bg-orange-500/20 text-orange-500 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {counts.urgent} Urgent
                </Badge>
              )}
              {counts.warning > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-500 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {counts.warning} Warning
                </Badge>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={href}>
                View Details
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
