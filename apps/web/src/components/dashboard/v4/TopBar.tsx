'use client';

import { Search, BadgeCheck, DollarSign, Bell } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
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
    <div className="bg-background border-b border-border/40">
      {/* Compact nav bar with integrated search */}
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-4">
        {/* Search - takes most space */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex-1 max-w-xl flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/30 text-left group transition-colors"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground flex-1">Search loads, drivers, companies...</span>
          <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center rounded border border-border/50 bg-background/50 font-mono text-xs text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {mode !== 'broker' && fmcsaStatus === 'verified' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs text-emerald-600 bg-emerald-50">
              <BadgeCheck className="h-3.5 w-3.5" />
              <span className="font-medium">Verified</span>
            </div>
          )}
          <Link
            href="/dashboard/finance/receivables"
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              hasOverdue ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>${(moneyOwed / 1000).toFixed(1)}k</span>
          </Link>
          <button className="relative p-2 rounded hover:bg-muted/50 transition-colors">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>

      {/* Search Modal */}
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
                placeholder="Search loads, drivers, companies, trips..."
                className="w-full px-3 py-3 bg-transparent border-0 outline-none text-lg"
              />
            </div>
            <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Try:</span>
              <button className="px-2 py-1 rounded bg-muted/50 hover:bg-muted text-foreground">Phoenix to Denver</button>
              <button className="px-2 py-1 rounded bg-muted/50 hover:bg-muted text-foreground">John Doe</button>
              <button className="px-2 py-1 rounded bg-muted/50 hover:bg-muted text-foreground">Load #L-123</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
