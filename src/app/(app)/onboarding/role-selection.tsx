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

  // We're using userId to identify this component is user-specific
  // but the actual user id is handled by the server action
  void userId;

  const handleContinue = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);

    const result = await setRoleAction(selectedRole);

    if (result.success) {
      router.push(`/onboarding/${selectedRole}`);
    } else {
      setIsSubmitting(false);
    }
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
              <div
                key={role.id}
                role="button"
                tabIndex={0}
                className="text-left w-full"
                onClick={() => setSelectedRole(role.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedRole(role.id);
                  }
                }}
              >
                <Card
                  className={`h-full cursor-pointer transition-all ${
                    isSelected
                      ? `${role.color} border-2`
                      : 'hover:border-muted-foreground/50'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Icon
                        className={`h-10 w-10 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
                      />
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="mt-4">{role.title}</CardTitle>
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
              </div>
            );
          })}
        </div>

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
