'use client';

import { Search, Bell, DollarSign, BadgeCheck } from 'lucide-react';
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
    <div className="bg-white border-b border-border/50">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Compact Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 max-w-md flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/40 text-left transition-colors"
          >
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center rounded border border-border/50 bg-background/50 font-mono text-xs text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Status Indicators */}
          <div className="flex items-center gap-3 ml-auto">
            {mode !== 'broker' && fmcsaStatus === 'verified' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/50">
                <BadgeCheck className="h-3.5 w-3.5" />
                <span>Verified</span>
              </div>
            )}
            <Link
              href="/dashboard/finance/receivables"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                hasOverdue 
                  ? 'text-red-700 bg-red-50 border border-red-200/50 hover:bg-red-100' 
                  : 'text-muted-foreground bg-muted/30 border border-border/40 hover:bg-muted/50'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>${(moneyOwed / 1000).toFixed(1)}k</span>
            </Link>
            <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-32"
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
