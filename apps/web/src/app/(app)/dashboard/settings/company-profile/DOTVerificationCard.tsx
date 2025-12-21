'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSetupProgress } from '@/hooks/use-setup-progress';
import {
  BadgeCheck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Truck,
  Building2,
  RefreshCw,
  ExternalLink,
  Home,
  Package,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FMCSAVerificationData {
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

interface DOTVerificationCardProps {
  companyId: string;
  /** Company's display name (used for mismatch detection) */
  companyDisplayName: string;
  currentDotNumber: string | null;
  fmcsaData: FMCSAVerificationData | null;
  readOnly?: boolean;
}

interface VerifyResponse {
  success?: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
  alreadyClaimed?: boolean;
  claimedByName?: string;
  hhgAuthorized?: boolean;
  cargoTypes?: string[];
  carrier?: {
    legalName: string;
    dbaName: string | null;
    dotNumber: number;
    city: string | null;
    state: string | null;
    allowedToOperate: boolean;
    statusCode: string;
    authorityTypes: string[];
    insurance: string;
    totalDrivers: number | null;
    totalPowerUnits: number | null;
    hhgAuthorized?: boolean;
  };
}

export function DOTVerificationCard({
  companyId,
  companyDisplayName,
  currentDotNumber,
  fmcsaData,
  readOnly = false,
}: DOTVerificationCardProps) {
  const router = useRouter();
  const { markComplete } = useSetupProgress();
  const [dotNumber, setDotNumber] = useState(currentDotNumber || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  const isVerified = fmcsaData?.verified ?? false;

  // Check for name mismatch (case-insensitive, trimmed)
  const hasNameMismatch =
    isVerified &&
    fmcsaData?.legalName &&
    companyDisplayName.trim().toLowerCase() !== fmcsaData.legalName.trim().toLowerCase();

  const handleVerify = async () => {
    if (!dotNumber.trim()) {
      setError('Please enter a DOT number');
      return;
    }

    if (!/^\d+$/.test(dotNumber.trim())) {
      setError('DOT number must contain only digits');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setVerifyResult(null);

    try {
      const response = await fetch('/api/fmcsa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dotNumber: dotNumber.trim(),
          companyId,
        }),
      });

      const data: VerifyResponse = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Verification failed');
        return;
      }

      setVerifyResult(data);

      // Mark setup progress for compliance verification when FMCSA verified
      if (data.verified) {
        markComplete('compliance_verified');
      }

      router.refresh(); // Refresh to update the page with new data
    } catch {
      setError('Failed to verify DOT number. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatAuthority = (status: string | null): { label: string; active: boolean } => {
    if (status === 'A') return { label: 'Active', active: true };
    if (status === 'I') return { label: 'Inactive', active: false };
    return { label: 'None', active: false };
  };

  // Already verified state
  if (isVerified && fmcsaData) {
    return (
      <Card className="border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-green-500" />
            FMCSA Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-600 dark:text-green-400">Verified with FMCSA</p>
              <p className="text-sm text-muted-foreground">
                DOT #{currentDotNumber} • Last checked{' '}
                {fmcsaData.lastChecked
                  ? new Date(fmcsaData.lastChecked).toLocaleDateString()
                  : 'recently'}
              </p>
            </div>
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVerify}
                disabled={isVerifying}
                className="text-muted-foreground"
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
                  Your company name &quot;{companyDisplayName}&quot; differs from FMCSA legal name &quot;
                  {fmcsaData?.legalName}&quot;. Consider updating your display name or using this as your DBA.
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Legal Name</p>
              <p className="font-medium">{fmcsaData.legalName}</p>
              {fmcsaData.dbaName && (
                <p className="text-sm text-muted-foreground">DBA: {fmcsaData.dbaName}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Operating Status</p>
              <p className="font-medium flex items-center gap-1.5">
                {fmcsaData.allowedToOperate ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Allowed to Operate
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Not Allowed
                  </>
                )}
              </p>
              {fmcsaData.operationType && (
                <p className="text-sm text-muted-foreground">{fmcsaData.operationType}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Authority</p>
              <div className="space-y-0.5 text-sm">
                {['Common', 'Contract', 'Broker'].map((type) => {
                  const key = `${type.toLowerCase()}Authority` as keyof FMCSAVerificationData;
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

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cargo Authorization</p>
              <div className="space-y-0.5 text-sm">
                <p className="flex items-center gap-1.5">
                  {fmcsaData.hhgAuthorized ? (
                    <>
                      <Home className="h-3 w-3 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">HHG Authorized</span>
                    </>
                  ) : (
                    <>
                      <Home className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">No HHG Authority</span>
                    </>
                  )}
                </p>
                {fmcsaData.cargoCarried && fmcsaData.cargoCarried.length > 0 && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-3 w-3" />
                    {fmcsaData.cargoCarried.length} cargo type{fmcsaData.cargoCarried.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Insurance & Fleet</p>
              <div className="space-y-0.5 text-sm">
                {fmcsaData.bipdInsurance ? (
                  <p className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-blue-500" />
                    ${(fmcsaData.bipdInsurance * 1000).toLocaleString()} liability
                  </p>
                ) : (
                  <p className="text-muted-foreground">No insurance on file</p>
                )}
                {(fmcsaData.totalPowerUnits || fmcsaData.totalDrivers) && (
                  <p className="flex items-center gap-1.5">
                    <Truck className="h-3 w-3 text-muted-foreground" />
                    {fmcsaData.totalPowerUnits || 0} trucks • {fmcsaData.totalDrivers || 0} drivers
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <a
              href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${currentDotNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View on FMCSA SAFER
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not verified state
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          FMCSA Verification
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Verify your DOT number with FMCSA to build trust and unlock marketplace features.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {verifyResult && !verifyResult.verified && (
          <Alert className="py-2 border-yellow-500/30 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-600 dark:text-yellow-400">
              {verifyResult.message || 'DOT found but does not meet verification requirements'}
            </AlertDescription>
          </Alert>
        )}

        {verifyResult?.verified && verifyResult.carrier && (
          <Alert className="py-2 border-green-500/30 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              Verified! {verifyResult.carrier.legalName} ({verifyResult.carrier.city}, {verifyResult.carrier.state})
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="dot_verify" className="sr-only">DOT Number</Label>
            <Input
              id="dot_verify"
              placeholder="Enter DOT number (e.g., 964348)"
              value={dotNumber}
              onChange={(e) => setDotNumber(e.target.value.replace(/\D/g, ''))}
              disabled={readOnly || isVerifying}
              className="font-mono"
            />
          </div>
          <Button
            onClick={handleVerify}
            disabled={readOnly || isVerifying || !dotNumber.trim()}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <BadgeCheck className="h-4 w-4 mr-2" />
                Verify with FMCSA
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          We&apos;ll verify your DOT number with the Federal Motor Carrier Safety Administration
          and automatically pull your company information, authority status, and insurance details.
          Your FMCSA legal name will be disclosed to partners viewing your verified status.
        </p>
      </CardContent>
    </Card>
  );
}
