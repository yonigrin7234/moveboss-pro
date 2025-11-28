import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BadgeCheck,
  ChevronRight,
  CheckCircle,
  Circle,
} from 'lucide-react';
import type { VerificationState } from '@/data/verification';

interface VerificationStatusWidgetProps {
  state: VerificationState;
}

export function VerificationStatusWidget({ state }: VerificationStatusWidgetProps) {
  const isVerified = state.status === 'verified';
  const isPending = state.status === 'pending';

  if (isVerified) {
    return (
      <Card className="border-green-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-green-500" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Your company is verified</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your verified badge is shown to partners and on the marketplace.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isPending ? 'border-yellow-500/30' : 'border-muted'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" />
          Get Verified
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verified companies build trust with partners and appear higher in marketplace results.
        </p>

        {state.requirements.length > 0 && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="text-muted-foreground">
                  {state.completedCount} of {state.requirements.length} complete
                </span>
              </div>
              <Progress value={state.percentComplete} className="h-2" />
            </div>

            <div className="space-y-2">
              {state.requirements.map((req) => (
                <div key={req.id} className="flex items-start gap-2 text-sm">
                  {req.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={req.completed ? 'text-muted-foreground line-through' : ''}>
                      {req.label}
                      {req.required && !req.completed && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/dashboard/settings/company-profile">
            Complete Verification
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
