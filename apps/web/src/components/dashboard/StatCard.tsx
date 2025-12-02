import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  description: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
}

export function StatCard({
  label,
  value,
  description,
  href,
  icon: Icon,
  trend,
}: StatCardProps) {
  const content = (
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-3xl font-semibold text-foreground tracking-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.positive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground/70">{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      <div className="border-t border-border/40 mt-3 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide">
              {label}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{description}</p>
          </div>
          {href && (
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="group h-full rounded-lg hover:shadow-lg hover:border-primary/50 transition-all hover:-translate-y-0.5 cursor-pointer">
          {content}
        </Card>
      </Link>
    );
  }

  return (
    <Card className="h-full rounded-lg">
      {content}
    </Card>
  );
}
