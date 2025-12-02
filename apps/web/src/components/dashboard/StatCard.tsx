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
    <CardContent className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              <span
                className={cn(
                  'text-xs font-semibold',
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
          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      <div className="border-t border-border/50 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
              {label}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{description}</p>
          </div>
          {href && (
            <ArrowRight className="h-4 w-4 ml-2 text-muted-foreground/70 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          )}
        </div>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        <Card className="group h-full rounded-xl border-border bg-card shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
          {content}
        </Card>
      </Link>
    );
  }

  return (
    <Card className="h-full rounded-xl border-border bg-card shadow-sm">
      {content}
    </Card>
  );
}
