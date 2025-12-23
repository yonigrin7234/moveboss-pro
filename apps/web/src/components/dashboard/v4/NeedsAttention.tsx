/**
 * NeedsAttention - Consolidated action items requiring owner attention
 * Combines: unassigned loads, compliance issues, overdue payments
 */

import Link from 'next/link';
import { AlertTriangle, Truck, Shield, DollarSign, ArrowRight, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface AttentionItem {
  id: string;
  type: 'unassigned_load' | 'compliance' | 'overdue_payment' | 'pending_request';
  title: string;
  subtitle: string;
  urgency: 'critical' | 'urgent' | 'normal';
  href: string;
  value?: number; // dollar amount if applicable
}

interface NeedsAttentionProps {
  items: AttentionItem[];
}

const typeConfig = {
  unassigned_load: {
    icon: Truck,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  compliance: {
    icon: Shield,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  overdue_payment: {
    icon: DollarSign,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  pending_request: {
    icon: AlertTriangle,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
};

const urgencyConfig: Record<string, { badge: 'destructive' | 'secondary'; label: string; className?: string }> = {
  critical: {
    badge: 'destructive',
    label: 'Critical',
  },
  urgent: {
    badge: 'secondary',
    label: 'Urgent',
    className: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  normal: {
    badge: 'secondary',
    label: '',
  },
};

export function NeedsAttention({ items }: NeedsAttentionProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-70" />
            <p className="text-sm font-medium text-emerald-600">All caught up!</p>
            <p className="text-xs mt-1">No items require your attention right now</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by urgency: critical first, then urgent, then normal
  const sortedItems = [...items].sort((a, b) => {
    const order = { critical: 0, urgent: 1, normal: 2 };
    return order[a.urgency] - order[b.urgency];
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Needs Attention
            <Badge variant="secondary" className="ml-1 text-xs">
              {items.length}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedItems.slice(0, 6).map((item) => {
          const config = typeConfig[item.type];
          const urgency = urgencyConfig[item.urgency];
          const Icon = config.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                item.urgency === 'critical' ? 'border-red-500/30 bg-red-500/5' : ''
              }`}
            >
              <div className={`p-1.5 rounded-md ${config.bgColor}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm truncate">{item.title}</span>
                  {item.urgency !== 'normal' && (
                    <Badge
                      variant={urgency.badge}
                      className={`text-xs ${urgency.className || ''}`}
                    >
                      {urgency.label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              {item.value && (
                <span className="text-sm font-medium text-foreground">
                  ${item.value.toLocaleString()}
                </span>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            </Link>
          );
        })}

        {items.length > 6 && (
          <Link
            href="/dashboard/assigned-loads?filter=unassigned"
            className="block text-center text-xs text-primary hover:underline py-2"
          >
            View {items.length - 6} more items
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
