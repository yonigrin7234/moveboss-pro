'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Truck,
  RefreshCw,
  ExternalLink,
  Home,
  Package,
  XCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface FMCSAData {
  verified: boolean;
  verifiedAt: string | null;
  lastChecked: string | null;
  legalName: string | null;
  dbaName: string | null;
  statusCode: string | null;
  allowedToOperate: boolean;
  commonAuthority: string | null;
  contractAuthority: string | null;
  brokerAuthority: string | null;
  bipdInsurance: number | null;
  totalDrivers: number | null;
  totalPowerUnits: number | null;
  operationType: string | null;
  hhgAuthorized?: boolean;
  cargoCarried?: Array<{ cargoCarriedId: number; cargoCarriedDesc: string }>;
}

interface FMCSAComplianceCardProps {
  /** The company's display name (used for mismatch detection) */
  displayName: string;
  /** The company's DOT number */
  dotNumber: string | null;
  /** FMCSA verification data */
  fmcsaData: FMCSAData | null;
  /** Company ID for refresh functionality */
  companyId?: string;
  /** Whether to show the refresh button */
  showRefresh?: boolean;
  /** Callback after successful refresh */
  onRefresh?: () => void;
}

export function FMCSAComplianceCard({
  displayName,
  dotNumber,
  fmcsaData,
  companyId,
  showRefresh = false,
  onRefresh,
}: FMCSAComplianceCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isVerified = fmcsaData?.verified ?? false;

  // Check for name mismatch (case-insensitive, trimmed)
  const hasNameMismatch =
    isVerified &&
    fmcsaData?.legalName &&
    displayName.trim().toLowerCase() !== fmcsaData.legalName.trim().toLowerCase();

  const handleRefresh = async () => {
    if (!dotNumber || !companyId) return;

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/fmcsa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dotNumber: dotNumber.trim(),
          companyId,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast({
          title: 'Refresh failed',
          description: data.error || 'Failed to refresh FMCSA data',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'FMCSA data refreshed',
        description: 'Compliance data has been updated from FMCSA records.',
      });

      onRefresh?.();
      router.refresh();
    } catch {
      toast({
        title: 'Refresh failed',
        description: 'Failed to connect to FMCSA. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatAuthority = (status: string | null): { label: string; active: boolean } => {
    if (status === 'A') return { label: 'Active', active: true };
    if (status === 'I') return { label: 'Inactive', active: false };
    return { label: 'None', active: false };
  };

  // Not verified or no DOT number
  if (!isVerified || !fmcsaData || !dotNumber) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            FMCSA Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <XCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-muted-foreground">Not Verified</p>
              <p className="text-sm text-muted-foreground">
                {dotNumber
                  ? 'This company has not completed FMCSA verification.'
                  : 'No DOT number on file for this company.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verified state with full details
  return (
    <Card className="border-green-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-green-500" />
          FMCSA Compliance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification Status Banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-600 dark:text-green-400">Verified with FMCSA</p>
            <p className="text-sm text-muted-foreground">
              DOT #{dotNumber} • Last checked{' '}
              {fmcsaData.lastChecked
                ? new Date(fmcsaData.lastChecked).toLocaleDateString()
                : 'recently'}
            </p>
          </div>
          {showRefresh && companyId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-muted-foreground"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Name Mismatch Warning */}
        {hasNameMismatch && (
          <Alert className="py-2 border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              <span className="font-medium">Name Mismatch</span>
              <br />
              <span className="text-sm">
                Display name &quot;{displayName}&quot; differs from FMCSA legal name &quot;
                {fmcsaData.legalName}&quot;
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Not Allowed to Operate Warning */}
        {!fmcsaData.allowedToOperate && (
          <Alert className="py-2 border-red-500/30 bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-600 dark:text-red-400">
              <span className="font-medium">Not Allowed to Operate</span>
              <br />
              <span className="text-sm">
                This carrier is not currently authorized to operate by FMCSA.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* No HHG Authority Warning (for moving companies) */}
        {fmcsaData.hhgAuthorized === false && (
          <Alert className="py-2 border-amber-500/30 bg-amber-500/10">
            <Home className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              <span className="font-medium">No HHG Authority</span>
              <br />
              <span className="text-sm">
                This carrier is not authorized to transport Household Goods (HHG).
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Data Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Legal Name */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Legal Name</p>
            <p className="font-medium text-sm">{fmcsaData.legalName}</p>
            {fmcsaData.dbaName && (
              <p className="text-xs text-muted-foreground">DBA: {fmcsaData.dbaName}</p>
            )}
          </div>

          {/* Operating Status */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Operating Status</p>
            <p className="font-medium text-sm flex items-center gap-1.5">
              {fmcsaData.allowedToOperate ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Allowed to Operate
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  Not Allowed
                </>
              )}
            </p>
            {fmcsaData.operationType && (
              <p className="text-xs text-muted-foreground">{fmcsaData.operationType}</p>
            )}
          </div>

          {/* Authority */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Authority</p>
            <div className="space-y-0.5 text-xs">
              {['Common', 'Contract', 'Broker'].map((type) => {
                const key = `${type.toLowerCase()}Authority` as keyof FMCSAData;
                const status = formatAuthority(fmcsaData[key] as string | null);
                return (
                  <p key={type} className="flex items-center gap-1.5">
                    {status.active ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                    )}
                    {type}: {status.label}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Cargo Authorization */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Cargo Authorization
            </p>
            <div className="space-y-0.5 text-xs">
              <p className="flex items-center gap-1.5">
                {fmcsaData.hhgAuthorized ? (
                  <>
                    <Home className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      HHG Authorized
                    </span>
                  </>
                ) : (
                  <>
                    <Home className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">No HHG Authority</span>
                  </>
                )}
              </p>
              {fmcsaData.cargoCarried && fmcsaData.cargoCarried.length > 0 && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Package className="h-3 w-3" />
                  {fmcsaData.cargoCarried.length} cargo type
                  {fmcsaData.cargoCarried.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Insurance & Fleet */}
          <div className="space-y-1 sm:col-span-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Insurance & Fleet
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {fmcsaData.bipdInsurance ? (
                <p className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-blue-500" />$
                  {(fmcsaData.bipdInsurance * 1000).toLocaleString()} liability
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Shield className="h-3 w-3 text-amber-500" />
                  No insurance on file
                </p>
              )}
              {(fmcsaData.totalPowerUnits || fmcsaData.totalDrivers) && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-3 w-3" />
                  {fmcsaData.totalPowerUnits || 0} trucks • {fmcsaData.totalDrivers || 0} drivers
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SAFER Link */}
        <div className="pt-2 border-t">
          <a
            href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${dotNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View on FMCSA SAFER
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
