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
          ? 'border-destructive/30'
          : hasIssues
            ? 'border-warning/30'
            : 'border-success/30'
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasIssues ? (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">All compliant</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {counts.expired > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <XCircle className="h-3 w-3" />
                  {counts.expired} Expired
                </Badge>
              )}
              {counts.critical > 0 && (
                <Badge variant="pill-destructive" className="gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  {counts.critical} Critical
                </Badge>
              )}
              {counts.urgent > 0 && (
                <Badge variant="pill-warning" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {counts.urgent} Urgent
                </Badge>
              )}
              {counts.warning > 0 && (
                <Badge variant="warning" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {counts.warning} Warning
                </Badge>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full text-xs" asChild>
              <Link href={href}>
                View Details
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
