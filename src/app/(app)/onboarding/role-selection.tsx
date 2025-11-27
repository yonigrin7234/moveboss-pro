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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Truck,
  User,
  UserCircle,
  ArrowRight,
  Check,
  Send,
  Loader2,
} from 'lucide-react';
import { setRoleAction, updateCapabilitiesAction } from './actions';
import type { UserRole } from '@/data/onboarding';

interface RoleSelectionProps {
  userId: string;
  currentRole?: UserRole | null;
}

type UserType = 'company' | 'driver';

export function RoleSelection({ userId, currentRole }: RoleSelectionProps) {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType | null>(
    currentRole === 'driver' ? 'driver' : currentRole ? 'company' : null
  );
  const [canPostLoads, setCanPostLoads] = useState(false);
  const [canHaulLoads, setCanHaulLoads] = useState(false);
  const [isOwnerOperator, setIsOwnerOperator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We're using userId to identify this component is user-specific
  // but the actual user id is handled by the server action
  void userId;

  const handleContinue = async () => {
    if (!userType) return;

    if (userType === 'company' && !canPostLoads && !canHaulLoads) {
      setError('Please select at least one capability');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Determine the role and setup path
      let role: UserRole;
      let setupPath: string;

      if (userType === 'driver') {
        role = 'driver';
        setupPath = '/onboarding/driver';
      } else if (canHaulLoads && !canPostLoads && isOwnerOperator) {
        role = 'owner_operator';
        setupPath = '/onboarding/owner_operator';
      } else if (canHaulLoads && !canPostLoads) {
        role = 'carrier';
        setupPath = '/onboarding/carrier';
      } else {
        // Company (broker, or both broker and carrier)
        role = 'company';
        setupPath = '/onboarding/company';
      }

      // Save role
      const roleResult = await setRoleAction(role);
      if (!roleResult.success) {
        setError(roleResult.error || 'Failed to save role. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Save capabilities
      const capResult = await updateCapabilitiesAction({
        canPostLoads,
        canHaulLoads,
        isOwnerOperator,
      });

      if (!capResult.success) {
        setError(capResult.error || 'Failed to save. Please try again.');
        setIsSubmitting(false);
        return;
      }

      router.push(setupPath);
    } catch (err) {
      console.error('Error during onboarding:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to MoveBoss Pro</h1>
          <p className="text-lg text-muted-foreground">
            Let&apos;s set up your account
          </p>
        </div>

        {/* Step 1: Company or Driver? */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">What best describes you?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all ${
                userType === 'company'
                  ? 'border-primary border-2 bg-primary/5'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => {
                setUserType('company');
                setIsOwnerOperator(false);
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Building2 className="h-10 w-10 text-primary" />
                  {userType === 'company' && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <CardTitle className="mt-4">I run a moving company</CardTitle>
                <CardDescription>
                  Moving company, broker, or carrier
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${
                userType === 'driver'
                  ? 'border-primary border-2 bg-primary/5'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => {
                setUserType('driver');
                setCanPostLoads(false);
                setCanHaulLoads(false);
                setIsOwnerOperator(false);
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <User className="h-10 w-10 text-orange-500" />
                  {userType === 'driver' && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <CardTitle className="mt-4">I&apos;m a driver</CardTitle>
                <CardDescription>
                  I drive for a carrier or moving company
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Step 2: Company capabilities */}
        {userType === 'company' && (
          <Card>
            <CardHeader>
              <CardTitle>What does your company do?</CardTitle>
              <CardDescription>Select all that apply</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`flex items-start space-x-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  canPostLoads ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setCanPostLoads(!canPostLoads)}
              >
                <Checkbox
                  id="postLoads"
                  checked={canPostLoads}
                  onCheckedChange={(checked) => setCanPostLoads(checked as boolean)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="postLoads"
                    className="text-base font-medium cursor-pointer"
                  >
                    <Send className="h-4 w-4 inline mr-2" />
                    We post loads &amp; hire carriers
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Post pickups, live loads, or overflow work for carriers to claim
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  canHaulLoads ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setCanHaulLoads(!canHaulLoads)}
              >
                <Checkbox
                  id="haulLoads"
                  checked={canHaulLoads}
                  onCheckedChange={(checked) => setCanHaulLoads(checked as boolean)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="haulLoads"
                    className="text-base font-medium cursor-pointer"
                  >
                    <Truck className="h-4 w-4 inline mr-2" />
                    We haul loads with our own trucks
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Find loads, manage drivers &amp; vehicles, track trips &amp;
                    finances
                  </p>
                </div>
              </div>

              {canHaulLoads && !canPostLoads && (
                <div
                  className={`flex items-start space-x-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    isOwnerOperator
                      ? 'border-purple-500 bg-purple-500/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setIsOwnerOperator(!isOwnerOperator)}
                >
                  <Checkbox
                    id="ownerOp"
                    checked={isOwnerOperator}
                    onCheckedChange={(checked) =>
                      setIsOwnerOperator(checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="ownerOp"
                      className="text-base font-medium cursor-pointer"
                    >
                      <UserCircle className="h-4 w-4 inline mr-2" />
                      I&apos;m an owner-operator
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      I drive my own truck - one-person operation
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {userType && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">
                You&apos;ll get access to:
              </p>
              <ul className="space-y-1">
                {userType === 'driver' && (
                  <>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      Driver mobile app
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      View assigned loads &amp; trips
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      Update status &amp; submit photos
                    </li>
                  </>
                )}
                {canPostLoads && (
                  <>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      Post pickups &amp; loads to marketplace
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      Review carrier requests
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      Manage carrier partnerships
                    </li>
                  </>
                )}
                {canHaulLoads && (
                  <>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      Find &amp; accept loads
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      Manage drivers &amp; vehicles
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      Track trips &amp; financials
                    </li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="text-center">
            <p className="text-sm text-red-500 bg-red-500/10 px-4 py-2 rounded-lg inline-block">
              {error}
            </p>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!userType || isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground">
          Not sure? You can always change this later in settings.
        </p>
      </div>
    </div>
  );
}
