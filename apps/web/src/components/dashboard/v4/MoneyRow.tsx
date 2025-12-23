/**
 * MoneyRow - Simplified 3-card money overview for dashboard
 * Shows: Money Owed, Collected Today, Needs Attention (amount)
 */

import Link from 'next/link';
import { DollarSign, Banknote, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MoneyRowProps {
  moneyOwed: number;
  collectedToday: number;
  needsAttentionAmount: number;
  needsAttentionCount: number;
  owedHref?: string;
  collectedHref?: string;
  attentionHref?: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function MoneyRow({
  moneyOwed,
  collectedToday,
  needsAttentionAmount,
  needsAttentionCount,
  owedHref = '/dashboard/finance/receivables',
  collectedHref = '/dashboard/finance/receivables',
  attentionHref = '/dashboard/assigned-loads?filter=unassigned',
}: MoneyRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Money Owed */}
      <Link href={owedHref}>
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Money Owed</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(moneyOwed)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Collected Today */}
      <Link href={collectedHref}>
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Banknote className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Collected Today</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(collectedToday)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Needs Attention */}
      <Link href={attentionHref}>
        <Card className={`hover:bg-muted/50 transition-colors cursor-pointer h-full ${
          needsAttentionCount > 0 ? 'border-amber-500/50' : ''
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                needsAttentionCount > 0 ? 'bg-amber-500/10' : 'bg-muted'
              }`}>
                <AlertCircle className={`h-5 w-5 ${
                  needsAttentionCount > 0 ? 'text-amber-500' : 'text-muted-foreground'
                }`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Needs Attention</p>
                <p className="text-xl font-semibold text-foreground">
                  {needsAttentionCount > 0 ? formatCurrency(needsAttentionAmount) : '$0'}
                </p>
                {needsAttentionCount > 0 && (
                  <p className="text-xs text-amber-500">{needsAttentionCount} items</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
