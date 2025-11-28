import { BadgeCheck, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { VerificationStatus } from '@/data/verification';

interface VerificationBadgeProps {
  status: VerificationStatus;
  showTooltip?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

const statusConfig: Record<
  VerificationStatus,
  {
    label: string;
    color: string;
    icon: React.ElementType;
    description: string;
  }
> = {
  verified: {
    label: 'Verified',
    color: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
    icon: BadgeCheck,
    description: 'This company has verified their credentials',
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    icon: Clock,
    description: 'Verification in progress',
  },
  unverified: {
    label: 'Unverified',
    color: 'bg-gray-500/20 text-gray-500 dark:text-gray-400 border-gray-500/30',
    icon: AlertCircle,
    description: 'This company has not completed verification',
  },
};

export function VerificationBadge({
  status,
  showTooltip = true,
  className,
  size = 'default',
}: VerificationBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0' : '';
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  const badge = (
    <Badge className={cn(config.color, sizeClasses, className)}>
      <Icon className={cn(iconSize, 'mr-1')} />
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline version - just the icon with color, no badge wrapper
export function VerificationIcon({
  status,
  showTooltip = true,
  className,
}: Omit<VerificationBadgeProps, 'size'>) {
  const config = statusConfig[status];
  const Icon = config.icon;

  // Only show for verified status in inline mode
  if (status !== 'verified') {
    return null;
  }

  const icon = (
    <Icon className={cn('h-4 w-4 text-green-500', className)} />
  );

  if (!showTooltip) {
    return icon;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{icon}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
