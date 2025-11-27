import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ReliabilityBadgeProps {
  loadsGivenBack: number | null;
  loadsAcceptedTotal: number | null;
  showTooltip?: boolean;
  className?: string;
}

type ReliabilityLevel = 'excellent' | 'good' | 'caution' | 'new';

function getReliabilityLevel(
  givenBack: number | null,
  accepted: number | null
): { level: ReliabilityLevel; rate: number | null } {
  // New carrier - no data
  if (!accepted || accepted === 0) {
    return { level: 'new', rate: null };
  }

  const rate = ((givenBack || 0) / accepted) * 100;

  if (rate < 5) {
    return { level: 'excellent', rate };
  } else if (rate < 15) {
    return { level: 'good', rate };
  } else {
    return { level: 'caution', rate };
  }
}

const levelConfig: Record<
  ReliabilityLevel,
  {
    label: string;
    color: string;
    icon: React.ElementType;
    description: string;
  }
> = {
  excellent: {
    label: 'Excellent',
    color: 'bg-green-500/20 text-green-600 dark:text-green-400',
    icon: ShieldCheck,
    description: 'Rarely gives back loads',
  },
  good: {
    label: 'Good',
    color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    icon: Shield,
    description: 'Reliable with occasional returns',
  },
  caution: {
    label: 'Caution',
    color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    icon: ShieldAlert,
    description: 'Higher than average return rate',
  },
  new: {
    label: 'New',
    color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
    icon: Shield,
    description: 'No track record yet',
  },
};

export function ReliabilityBadge({
  loadsGivenBack,
  loadsAcceptedTotal,
  showTooltip = true,
  className,
}: ReliabilityBadgeProps) {
  const { level, rate } = getReliabilityLevel(loadsGivenBack, loadsAcceptedTotal);
  const config = levelConfig[level];
  const Icon = config.icon;

  const badge = (
    <Badge className={cn(config.color, className)}>
      <Icon className="h-3 w-3 mr-1" />
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
          <div className="text-sm">
            <p className="font-medium">{config.description}</p>
            {rate !== null && (
              <p className="text-muted-foreground">
                {(loadsGivenBack || 0)} of {loadsAcceptedTotal} loads returned ({rate.toFixed(1)}%)
              </p>
            )}
            {level === 'new' && (
              <p className="text-muted-foreground">
                This carrier hasn&apos;t accepted loads yet
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function getReliabilityInfo(
  loadsGivenBack: number | null,
  loadsAcceptedTotal: number | null
) {
  const { level, rate } = getReliabilityLevel(loadsGivenBack, loadsAcceptedTotal);
  const config = levelConfig[level];
  return {
    level,
    rate,
    label: config.label,
    color: config.color,
    description: config.description,
  };
}
