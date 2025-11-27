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
import {
  Building2,
  Truck,
  User,
  UserCircle,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';
import { setRoleAction } from './actions';
import type { UserRole } from '@/data/onboarding';

interface RoleOption {
  id: UserRole;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  color: string;
}

const roles: RoleOption[] = [
  {
    id: 'company',
    title: 'Moving Company / Broker',
    description: 'I post loads and hire carriers to haul them',
    icon: Building2,
    features: [
      'Post loads to marketplace',
      'Manage carrier partnerships',
      'Track shipments in real-time',
      'Review and rate carriers',
    ],
    color: 'border-blue-500 bg-blue-500/10',
  },
  {
    id: 'carrier',
    title: 'Carrier',
    description: 'I have a fleet and haul loads for companies',
    icon: Truck,
    features: [
      'Find and accept loads',
      'Manage drivers & vehicles',
      'Track trips & financials',
      'Driver pay calculations',
    ],
    color: 'border-green-500 bg-green-500/10',
  },
  {
    id: 'owner_operator',
    title: 'Owner-Operator',
    description: "I'm an independent operator - I drive my own truck",
    icon: UserCircle,
    features: [
      'Find and accept loads',
      'Manage your vehicle',
      'Track your earnings',
      'All-in-one driver + carrier',
    ],
    color: 'border-purple-500 bg-purple-500/10',
  },
  {
    id: 'driver',
    title: 'Driver',
    description: 'I drive for a carrier company',
    icon: User,
    features: [
      'View assigned loads',
      'Update load status',
      'Submit photos & docs',
      'Track your trips',
    ],
    color: 'border-orange-500 bg-orange-500/10',
  },
];

interface RoleSelectionProps {
  userId: string;
  currentRole?: UserRole | null;
}

export function RoleSelection({ userId, currentRole }: RoleSelectionProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(currentRole ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We're using userId to identify this component is user-specific
  // but the actual user id is handled by the server action
  void userId;

  const handleSelectRole = async (role: UserRole) => {
    setSelectedRole(role);
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await setRoleAction(role);

      if (result.success) {
        router.push(`/onboarding/${role}`);
      } else {
        setError(result.error || 'Failed to set role. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Error setting role:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedRole) return;
    await handleSelectRole(selectedRole);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to MoveBoss Pro</h1>
          <p className="text-lg text-muted-foreground">
            Let&apos;s get you set up. What best describes you?
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <button
                key={role.id}
                type="button"
                disabled={isSubmitting}
                className="text-left w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                onClick={() => handleSelectRole(role.id)}
              >
                <Card
                  className={`h-full cursor-pointer transition-all ${
                    isSelected
                      ? `${role.color} border-2`
                      : 'hover:border-muted-foreground/50'
                  } ${isSubmitting && selectedRole === role.id ? 'opacity-70' : ''}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      {isSubmitting && isSelected ? (
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      ) : (
                        <Icon
                          className={`h-10 w-10 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
                        />
                      )}
                      {isSelected && !isSubmitting && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="mt-4">
                      {isSubmitting && isSelected ? 'Setting up...' : role.title}
                    </CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {role.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Error Message */}
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
            {isSubmitting ? 'Setting up...' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
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
