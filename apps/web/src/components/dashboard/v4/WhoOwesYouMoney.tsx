'use client';

import Link from 'next/link';
import { ArrowRight, MessageSquare, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReceivableCompany } from '@/data/dashboard-data';

interface WhoOwesYouMoneyProps {
  companies: ReceivableCompany[];
}

export function WhoOwesYouMoney({ companies }: WhoOwesYouMoneyProps) {
  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Who Owes You Money</h2>
        <div className="py-8 text-center">
          <DollarSign className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No outstanding receivables</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Who Owes You Money</h2>
        <Link
          href="/dashboard/finance/receivables"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {companies.map((company) => (
          <div
            key={company.id}
            className="px-6 py-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {company.initials}
              </div>

              {/* Company info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {company.companyName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {company.daysOutstanding > 0 && (
                    <span
                      className={cn(
                        'text-xs font-medium',
                        company.status === 'overdue'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {company.daysOutstanding}d overdue
                    </span>
                  )}
                  {company.lastPaymentDate && (
                    <span className="text-xs text-muted-foreground">
                      Last paid {new Date(company.lastPaymentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount and status */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    ${company.amountOwed.toLocaleString()}
                  </p>
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                      company.status === 'overdue'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {company.status === 'overdue' ? 'Overdue' : 'Current'}
                  </span>
                </div>

                {/* Message button */}
                <button
                  className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Send message"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
