'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Key, ArrowRight, ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateStepAction, setupDriverAction, validateInviteCodeAction } from '../actions';

interface DriverSetupProps {
  userEmail: string;
  currentStep: number;
}

export function DriverSetup({ userEmail, currentStep }: DriverSetupProps) {
  const router = useRouter();
  const [step, setStep] = useState(currentStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite code
  const [inviteCode, setInviteCode] = useState('');
  const [carrierName, setCarrierName] = useState<string | null>(null);
  const [codeValidated, setCodeValidated] = useState(false);

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsValidating(true);
    setError(null);

    const result = await validateInviteCodeAction(inviteCode);

    if (!result.valid) {
      setError(result.error || 'Invalid invite code');
      setIsValidating(false);
      return;
    }

    setCarrierName(result.carrierName || null);
    setCodeValidated(true);
    setIsValidating(false);
  };

  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      // Validate code first
      if (!codeValidated) {
        setError('Please validate your invite code first');
        return;
      }

      await updateStepAction(2, { inviteCode, carrierName });
      setStep(2);
    } else if (step === 2) {
      // Validate personal info and complete
      if (!firstName.trim() || !lastName.trim()) {
        setError('First and last name are required');
        return;
      }

      setIsSubmitting(true);

      const result = await setupDriverAction(inviteCode, {
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        email: userEmail,
        license_number: licenseNumber || undefined,
        license_state: licenseState || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to complete setup');
        setIsSubmitting(false);
        return;
      }

      router.push('/driver');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push('/onboarding?change=true');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0 space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-2 w-16 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Step 1: Invite Code */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Key className="h-8 w-8 text-orange-500" />
              <div>
                <CardTitle>Join Your Carrier</CardTitle>
                <CardDescription>
                  Enter the invite code from your carrier company
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setCodeValidated(false);
                    setCarrierName(null);
                  }}
                  placeholder="ABC123"
                  className="uppercase"
                  maxLength={8}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidateCode}
                  disabled={isValidating || !inviteCode.trim()}
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Validate'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ask your dispatcher or fleet manager for your invite code
              </p>
            </div>

            {codeValidated && carrierName && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  You&apos;ll be joining <strong>{carrierName}</strong>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!codeValidated && !error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Don&apos;t have an invite code? Contact your carrier company to get one.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Personal Info */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-orange-500" />
              <div>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>
                  {carrierName
                    ? `Setting you up with ${carrierName}`
                    : 'Tell us about yourself'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">CDL Number</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseState">CDL State</Label>
                <Input
                  id="licenseState"
                  value={licenseState}
                  onChange={(e) => setLicenseState(e.target.value)}
                  maxLength={2}
                  placeholder="CA"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={isSubmitting || (step === 1 && !codeValidated)}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : step === 2 ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          {step === 2 ? 'Complete Setup' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
