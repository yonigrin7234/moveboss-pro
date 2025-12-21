import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  HelpCircle,
} from 'lucide-react';

export type FilterType = 'status' | 'rfdUrgency';

interface ClickableStatCardProps {
  label: string;
  value: number;
  iconName: 'package' | 'clock' | 'truck' | 'checkCircle' | 'alertCircle' | 'calendarClock' | 'helpCircle';
  iconClassName?: string;
  href: string;
  isActive?: boolean;
}

const iconMap = {
  package: Package,
  clock: Clock,
  truck: Truck,
  checkCircle: CheckCircle2,
  alertCircle: AlertCircle,
  calendarClock: CalendarClock,
  helpCircle: HelpCircle,
};

export function ClickableStatCard({
  label,
  value,
  iconName,
  iconClassName,
  href,
  isActive = false,
}: ClickableStatCardProps) {
  const Icon = iconMap[iconName];

  return (
    <Link href={href}>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
          isActive && 'ring-2 ring-primary border-primary bg-primary/5'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', iconClassName)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
