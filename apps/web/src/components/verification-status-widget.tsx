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
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
        <BadgeCheck className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
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
      <Card className="border-green-500/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <BadgeCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    FMCSA Verified
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                {state.fmcsa && (
                  <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                    <p>{state.fmcsa.legalName}</p>
                    {state.fmcsa.bipdInsurance && (
                      <p className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        ${(state.fmcsa.bipdInsurance * 1000).toLocaleString()} liability
                      </p>
                    )}
                    {(state.fmcsa.totalDrivers || state.fmcsa.totalPowerUnits) && (
                      <p className="flex items-center gap-1">
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
              className="text-xs text-muted-foreground hover:text-foreground"
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
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-muted/50 ${
          isPending
            ? 'bg-yellow-500/5 border-yellow-500/20'
            : 'bg-muted/30 border-border'
        }`}
      >
        <div className="flex items-center gap-2">
          {isPending ? (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
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
    <Card className={isPending ? 'border-yellow-500/30' : 'border-muted'}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${isPending ? 'bg-yellow-500/10' : 'bg-muted'}`}>
            <BadgeCheck className={`h-5 w-5 ${isPending ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {isPending ? 'Verification in Progress' : 'Get Verified'}
              </span>
              <span className="text-xs text-muted-foreground">
                {state.completedCount}/{state.requirements.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Verify your DOT with FMCSA to build trust on the marketplace.
            </p>

            {state.requirements.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {state.requirements.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center gap-2 text-sm">
                    {req.completed ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={req.completed ? 'text-muted-foreground' : ''}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" className="mt-3 h-8" asChild>
              <Link href="/dashboard/settings/company-profile">
                {isPending ? 'Continue' : 'Start Verification'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
