import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BadgeCheck,
  ChevronRight,
  CheckCircle,
  Circle,
  AlertCircle,
  Shield,
  Truck,
} from 'lucide-react';
import type { VerificationState } from '@/data/verification';

interface VerificationStatusWidgetProps {
  state: VerificationState;
  compact?: boolean;
}

export function VerificationStatusWidget({ state, compact = false }: VerificationStatusWidgetProps) {
  const isVerified = state.status === 'verified';
  const isPending = state.status === 'pending';

  // Compact verified state - just a small badge/banner
  if (isVerified && compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-success/10 border border-success/20">
        <BadgeCheck className="h-4 w-4 text-success" />
        <span className="text-sm font-medium text-success">
          FMCSA Verified
        </span>
        {state.fmcsa?.legalName && (
          <span className="text-sm text-muted-foreground">
            • {state.fmcsa.legalName}
          </span>
        )}
      </div>
    );
  }

  // Full verified state with FMCSA details
  if (isVerified) {
    return (
      <Card className="border-success/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <BadgeCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-success">
                    FMCSA Verified
                  </span>
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                {state.fmcsa && (
                  <div className="mt-1.5 text-sm text-muted-foreground space-y-0.5">
                    <p>{state.fmcsa.legalName}</p>
                    {state.fmcsa.bipdInsurance && (
                      <p className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3" />
                        ${(state.fmcsa.bipdInsurance * 1000).toLocaleString()} liability
                      </p>
                    )}
                    {(state.fmcsa.totalDrivers || state.fmcsa.totalPowerUnits) && (
                      <p className="flex items-center gap-1.5">
                        <Truck className="h-3 w-3" />
                        {state.fmcsa.totalPowerUnits} trucks • {state.fmcsa.totalDrivers} drivers
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Link
              href="/dashboard/settings/company-profile"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View details
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact unverified/pending state - subtle banner
  if (compact) {
    return (
      <Link
        href="/dashboard/settings/company-profile"
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border transition-all duration-150 hover:bg-muted/50 ${
          isPending
            ? 'bg-warning/5 border-warning/20'
            : 'bg-muted/30 border-border'
        }`}
      >
        <div className="flex items-center gap-2">
          {isPending ? (
            <AlertCircle className="h-4 w-4 text-warning" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">
            {isPending ? 'Verification in progress' : 'Get verified with FMCSA'}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    );
  }

  // Full unverified/pending state
  return (
    <Card className={isPending ? 'border-warning/30' : 'border-border'}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isPending ? 'bg-warning/10' : 'bg-muted'}`}>
            <BadgeCheck className={`h-5 w-5 ${isPending ? 'text-warning' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                {isPending ? 'Verification in Progress' : 'Get Verified'}
              </span>
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                {state.completedCount}/{state.requirements.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Verify your DOT with FMCSA to build trust on the marketplace.
            </p>

            {state.requirements.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {state.requirements.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center gap-2 text-sm">
                    {req.completed ? (
                      <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={req.completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" className="mt-3 text-xs" asChild>
              <Link href="/dashboard/settings/company-profile">
                {isPending ? 'Continue' : 'Start Verification'}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
