'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Users,
  Truck,
  Building2,
  Package,
  Shield,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/data/onboarding';

interface SetupProgress {
  first_driver_added: boolean;
  first_vehicle_added: boolean;
  first_partner_added: boolean;
  first_load_created: boolean;
  compliance_verified: boolean;
  checklist_dismissed: boolean;
}

interface ChecklistItem {
  id: keyof Omit<SetupProgress, 'checklist_dismissed'>;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  roles: string[]; // Which roles need this item
}

const checklistItems: ChecklistItem[] = [
  {
    id: 'first_driver_added',
    title: 'Add your first driver',
    description: 'Add drivers who will haul loads for you',
    icon: <Users className="h-5 w-5" />,
    href: '/dashboard/drivers/new',
    roles: ['carrier', 'company'], // Not for owner-operator, driver
  },
  {
    id: 'first_vehicle_added',
    title: 'Add trucks & trailers',
    description: 'Set up your fleet with vehicle details and capacity',
    icon: <Truck className="h-5 w-5" />,
    href: '/dashboard/fleet/trucks/new',
    roles: ['carrier', 'company', 'owner_operator'],
  },
  {
    id: 'first_partner_added',
    title: 'Connect partner companies',
    description: 'Add companies you work with (brokers, shippers, carriers)',
    icon: <Building2 className="h-5 w-5" />,
    href: '/dashboard/partnerships/new',
    roles: ['carrier', 'company', 'owner_operator'],
  },
  {
    id: 'first_load_created',
    title: 'Create or accept a load',
    description: 'Post your first pickup or accept a load from the board',
    icon: <Package className="h-5 w-5" />,
    href: '/dashboard/load-board',
    roles: ['carrier', 'company', 'owner_operator'],
  },
  {
    id: 'compliance_verified',
    title: 'Verify DOT & Insurance',
    description: 'Complete FMCSA verification for your company',
    icon: <Shield className="h-5 w-5" />,
    href: '/dashboard/settings/company-profile',
    roles: ['carrier', 'company', 'owner_operator'],
  },
];

interface SetupChecklistProps {
  userRole: UserRole | string;
  className?: string;
}

export function SetupChecklist({ userRole, className }: SetupChecklistProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isHidden, setIsHidden] = useState(false);

  // Filter items based on user role
  const roleItems = checklistItems.filter((item) =>
    item.roles.includes(userRole.toLowerCase())
  );

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/setup-progress');
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
        if (data.progress?.checklist_dismissed) {
          setIsHidden(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch setup progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = async (field: string, value: boolean) => {
    try {
      const res = await fetch('/api/setup-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const dismissChecklist = async () => {
    await updateProgress('checklist_dismissed', true);
    setIsHidden(true);
  };

  // Don't render if loading, hidden, no progress, or driver role
  if (isLoading || isHidden || !progress || userRole === 'driver') {
    return null;
  }

  // If no applicable items for this role
  if (roleItems.length === 0) {
    return null;
  }

  const completedCount = roleItems.filter((item) => progress[item.id]).length;
  const totalCount = roleItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const allComplete = completedCount === totalCount;

  // If all complete, show celebration then hide
  if (allComplete && !progress.checklist_dismissed) {
    return (
      <Card className={cn('border-green-500/30 bg-green-500/5', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="font-semibold text-green-600 dark:text-green-400">
                Setup Complete!
              </h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re all set up and ready to start using MoveBoss Pro
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={dismissChecklist}>
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg">Get your workspace ready</CardTitle>
              <CardDescription>
                Complete these steps to unlock full functionality
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {completedCount}/{totalCount}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={dismissChecklist}
              title="Dismiss checklist"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{progressPercent}% complete</p>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-1">
            {roleItems.map((item) => {
              const isComplete = progress[item.id];

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer',
                    isComplete
                      ? 'bg-green-500/5 text-muted-foreground'
                      : 'hover:bg-accent'
                  )}
                  onClick={() => {
                    if (!isComplete) {
                      router.push(item.href);
                    }
                  }}
                >
                  <div
                    className={cn(
                      'flex-shrink-0',
                      isComplete ? 'text-green-500' : 'text-muted-foreground'
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>

                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                      isComplete
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    {item.icon}
                  </div>

                  <div className="flex-grow min-w-0">
                    <p
                      className={cn('font-medium text-sm', isComplete && 'line-through')}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>

                  {!isComplete && (
                    <Button variant="ghost" size="sm" className="flex-shrink-0 gap-1">
                      Start
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
