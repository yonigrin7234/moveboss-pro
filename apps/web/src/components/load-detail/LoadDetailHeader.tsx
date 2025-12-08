'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { LoadDetailViewModel, BadgeVariant, StatusVariant } from '@/lib/load-detail-model';
import { cn } from '@/lib/utils';

interface LoadDetailHeaderProps {
  model: LoadDetailViewModel;
  backHref: string;
  backLabel: string;
}

const statusVariantClasses: Record<StatusVariant, string> = {
  gray: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  yellow: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  blue: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  green: 'bg-green-500/20 text-green-600 dark:text-green-400',
  red: 'bg-red-500/20 text-red-600 dark:text-red-400',
  indigo: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  orange: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
};

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export function LoadDetailHeader({ model, backHref, backLabel }: LoadDetailHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back Link */}
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {model.badges.map((badge, idx) => (
              <Badge
                key={idx}
                className={cn('border-0', badgeVariantClasses[badge.variant])}
              >
                {badge.label}
              </Badge>
            ))}
            <Badge className={cn('border-0', statusVariantClasses[model.statusVariant])}>
              {model.statusLabel}
            </Badge>
          </div>

          {/* Route */}
          <div className="flex items-center gap-2 text-2xl font-bold mb-1">
            <MapPin className="h-5 w-5" />
            <span>{model.origin.city}, {model.origin.state}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span>{model.destination.city}, {model.destination.state}</span>
          </div>

          {/* Load Number */}
          <p className="text-muted-foreground">
            Load #{model.loadNumber}
            {model.internalReference && (
              <span className="ml-2 text-sm">
                (Ref: {model.internalReference})
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
