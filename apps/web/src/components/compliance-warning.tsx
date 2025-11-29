'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ComplianceIssue {
  type: string;
  item: string;
  message: string;
  severity: 'warning' | 'urgent' | 'critical' | 'expired';
}

interface ComplianceWarningProps {
  issues: ComplianceIssue[];
  onProceed?: () => void;
  onCancel?: () => void;
  proceedLabel?: string;
  cancelLabel?: string;
  blockOnExpired?: boolean;
}

export function ComplianceWarning({
  issues,
  onProceed,
  onCancel,
  proceedLabel = 'Continue Anyway',
  cancelLabel = 'Fix Issues First',
  blockOnExpired = false,
}: ComplianceWarningProps) {
  const [expanded, setExpanded] = useState(true);

  const hasExpired = issues.some((i) => i.severity === 'expired');
  const canProceed = blockOnExpired ? !hasExpired : true;

  const severityConfig = {
    expired: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    urgent: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  };

  // Get worst severity
  const worstSeverity = issues.reduce((worst, issue) => {
    const order = ['warning', 'urgent', 'critical', 'expired'];
    return order.indexOf(issue.severity) > order.indexOf(worst) ? issue.severity : worst;
  }, 'warning' as ComplianceIssue['severity']);

  const config = severityConfig[worstSeverity];
  const Icon = config.icon;

  return (
    <Card className={`border-2 ${config.bg} ${config.color.replace('text-', 'border-')}/30`}>
      <CardContent className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <span className="font-medium">
              {hasExpired ? 'Compliance Issues (Blocked)' : 'Compliance Warnings'}
            </span>
            <Badge variant="outline">{issues.length}</Badge>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>

        {expanded && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              {issues.map((issue, idx) => {
                const issueConfig = severityConfig[issue.severity];
                const IssueIcon = issueConfig.icon;

                return (
                  <div key={idx} className={`flex items-start gap-2 p-2 rounded ${issueConfig.bg}`}>
                    <IssueIcon className={`h-4 w-4 mt-0.5 ${issueConfig.color}`} />
                    <div>
                      <p className="font-medium text-sm">{issue.item}</p>
                      <p className="text-sm text-muted-foreground">{issue.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {(onCancel || onProceed) && (
              <div className="flex gap-2">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                    {cancelLabel}
                  </Button>
                )}
                {onProceed && (
                  <Button
                    onClick={onProceed}
                    disabled={!canProceed}
                    className="flex-1"
                    variant={canProceed ? 'default' : 'secondary'}
                  >
                    {canProceed ? proceedLabel : 'Fix Expired Items First'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
