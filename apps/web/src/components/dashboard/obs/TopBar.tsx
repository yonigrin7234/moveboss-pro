'use client';

import { Search, BadgeCheck, DollarSign, Bell } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { DashboardMode } from '@/lib/dashboardMode';

interface TopBarProps {
  mode: DashboardMode;
  fmcsaStatus: 'verified' | 'pending' | 'none';
  moneyOwed: number;
  hasOverdue: boolean;
}

export function TopBar({ mode, fmcsaStatus, moneyOwed, hasOverdue }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Global Search */}
        <div className="flex-1 max-w-xl">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/50 transition-colors text-left group"
          >
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Search loads, drivers, companies, trips...
            </span>
            <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Status Pills */}
        <div className="flex items-center gap-3">
          {/* FMCSA Badge */}
          {mode !== 'broker' && (
            <FMCSABadge status={fmcsaStatus} />
          )}

          {/* Money Owed Pill */}
          <MoneyOwedPill amount={moneyOwed} hasOverdue={hasOverdue} />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">JM</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Global Search Modal (simplified for now) */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <input
                autoFocus
                type="text"
                placeholder="Search everything..."
                className="w-full px-4 py-3 bg-transparent border-0 outline-none text-lg"
              />
            </div>
            <div className="border-t border-border p-4 text-sm text-muted-foreground text-center">
              Start typing to search loads, drivers, companies, and trips
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FMCSABadge({ status }: { status: 'verified' | 'pending' | 'none' }) {
  if (status === 'verified') {
    return (
      <Link
        href="/dashboard/settings/company-profile"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
      >
        <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700">FMCSA Verified</span>
      </Link>
    );
  }

  if (status === 'pending') {
    return (
      <Link
        href="/dashboard/settings/company-profile"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
      >
        <BadgeCheck className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700">Pending</span>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/settings/company-profile"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
    >
      <BadgeCheck className="h-3.5 w-3.5 text-red-600" />
      <span className="text-xs font-semibold text-red-700">Not Verified</span>
    </Link>
  );
}

function MoneyOwedPill({ amount, hasOverdue }: { amount: number; hasOverdue: boolean }) {
  const formattedAmount = `$${(amount / 1000).toFixed(1)}k`;

  return (
    <Link
      href="/dashboard/finance/receivables"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
        hasOverdue
          ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
          : 'bg-muted/30 border-border/50 hover:bg-muted/50'
      }`}
    >
      <DollarSign className={`h-3.5 w-3.5 ${hasOverdue ? 'text-red-600' : 'text-muted-foreground'}`} />
      <span className={`text-xs font-semibold ${hasOverdue ? 'text-red-700' : 'text-foreground'}`}>
        {formattedAmount} owed
      </span>
    </Link>
  );
}
