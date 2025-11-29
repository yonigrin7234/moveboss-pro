'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Building2,
  Truck,
  UserCircle,
  User,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';
import { setRoleAction, updateCapabilitiesAction } from './actions';
import type { UserRole } from '@/data/onboarding';

interface RoleSelectionProps {
  userId: string;
  currentRole?: UserRole | null;
}

type RoleOption = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  role: UserRole;
  canPostLoads: boolean;
  canHaulLoads: boolean;
  isOwnerOperator: boolean;
  setupPath: string;
  features: string[];
};

const roleOptions: RoleOption[] = [
  {
    id: 'broker',
    title: 'Broker',
    description: 'I book moves and coordinate with carriers',
    icon: Briefcase,
    iconColor: 'text-blue-500',
    role: 'company',
    canPostLoads: true,
    canHaulLoads: false,
    isOwnerOperator: false,
    setupPath: '/onboarding/company',
    features: [
      'Post pickups to marketplace',
      'Review carrier requests',
      'Manage carrier partnerships',
      'Track job financials',
    ],
  },
  {
    id: 'moving_company',
    title: 'Moving Company',
    description: 'I have a crew and warehouse',
    icon: Building2,
    iconColor: 'text-emerald-500',
    role: 'company',
    canPostLoads: true,
    canHaulLoads: true,
    isOwnerOperator: false,
    setupPath: '/onboarding/company',
    features: [
      'Post pickups & loads to marketplace',
      'Manage your own fleet & drivers',
      'Track trips & financials',
      'Storage & warehouse management',
    ],
  },
  {
    id: 'carrier',
    title: 'Carrier',
    description: 'I have trucks and drivers for hauling',
    icon: Truck,
    iconColor: 'text-orange-500',
    role: 'carrier',
    canPostLoads: false,
    canHaulLoads: true,
    isOwnerOperator: false,
    setupPath: '/onboarding/carrier',
    features: [
      'Find & accept loads from brokers',
      'Manage drivers & vehicles',
      'Track trips & settlements',
      'Compliance & documents',
    ],
  },
  {
    id: 'owner_operator',
    title: 'Owner-Operator',
    description: 'I own and drive my own truck',
    icon: UserCircle,
    iconColor: 'text-purple-500',
    role: 'owner_operator',
    canPostLoads: false,
    canHaulLoads: true,
    isOwnerOperator: true,
    setupPath: '/onboarding/owner_operator',
    features: [
      'Find & accept loads',
      'Simplified one-person setup',
      'Track your earnings',
      'Manage your truck & compliance',
    ],
  },
  {
    id: 'driver',
    title: 'Driver',
    description: 'I work for a company',
    icon: User,
    iconColor: 'text-slate-500',
    role: 'driver',
    canPostLoads: false,
    canHaulLoads: false,
    isOwnerOperator: false,
    setupPath: '/onboarding/driver',
    features: [
      'Driver mobile app access',
      'View assigned loads & trips',
      'Update status & submit photos',
      'Track your hours & earnings',
    ],
  },
];

export function RoleSelection({ userId, currentRole }: RoleSelectionProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    // Try to match current role to an option
    if (currentRole === 'driver') return 'driver';
    if (currentRole === 'owner_operator') return 'owner_operator';
    if (currentRole === 'carrier') return 'carrier';
    if (currentRole === 'company') return null; // Could be broker or moving_company
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We're using userId to identify this component is user-specific
  // but the actual user id is handled by the server action
  void userId;

  const selectedOption = roleOptions.find((opt) => opt.id === selectedRole);

  const handleContinue = async () => {
    if (!selectedOption) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Save role
      const roleResult = await setRoleAction(selectedOption.role);
      if (!roleResult.success) {
        setError(roleResult.error || 'Failed to save role. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Save capabilities
      const capResult = await updateCapabilitiesAction({
        canPostLoads: selectedOption.canPostLoads,
        canHaulLoads: selectedOption.canHaulLoads,
        isOwnerOperator: selectedOption.isOwnerOperator,
      });

      if (!capResult.success) {
        setError(capResult.error || 'Failed to save. Please try again.');
        setIsSubmitting(false);
        return;
      }

      router.push(selectedOption.setupPath);
    } catch (err) {
      console.error('Error during onboarding:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to MoveBoss Pro</h1>
          <p className="text-lg text-muted-foreground">
            What best describes you?
          </p>
        </div>

        {/* Role Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roleOptions.slice(0, 3).map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRole === option.id;

            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary border-2 bg-primary/5 shadow-md'
                    : 'hover:border-muted-foreground/50 hover:shadow-sm'
                }`}
                onClick={() => setSelectedRole(option.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-8 w-8 ${option.iconColor}`} />
                    {isSelected && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {option.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Second row - 2 options centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          {roleOptions.slice(3).map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRole === option.id;

            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary border-2 bg-primary/5 shadow-md'
                    : 'hover:border-muted-foreground/50 hover:shadow-sm'
                }`}
                onClick={() => setSelectedRole(option.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-8 w-8 ${option.iconColor}`} />
                    {isSelected && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {option.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Features Summary */}
        {selectedOption && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                As a {selectedOption.title}, you&apos;ll get:
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedOption.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
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
            disabled={!selectedRole || isSubmitting}
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
