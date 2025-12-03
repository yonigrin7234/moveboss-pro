'use client';

import { Search, BadgeCheck, DollarSign, Bell, TrendingUp } from 'lucide-react';
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
    <div className="bg-background">
      {/* Top status pills - minimal */}
      <div className="max-w-[1400px] mx-auto px-6 py-2 flex items-center justify-end gap-2">
        {mode !== 'broker' && fmcsaStatus === 'verified' && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-emerald-600">
            <BadgeCheck className="h-3 w-3" />
            <span>Verified</span>
          </div>
        )}
        <Link
          href="/dashboard/finance/receivables"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors ${
            hasOverdue ? 'text-red-600 hover:bg-red-50' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <DollarSign className="h-3 w-3" />
          <span>${(moneyOwed / 1000).toFixed(1)}k owed</span>
        </Link>
        <button className="relative p-1.5 rounded-full hover:bg-muted/50 transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full" />
        </button>
      </div>

      {/* HERO: Giant Centered Search */}
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Giant Search Bar */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-4 px-8 py-6 rounded-3xl bg-white hover:bg-gray-50 border-2 border-border/40 hover:border-border/60 transition-all text-left group shadow-lg hover:shadow-xl"
          >
            <Search className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-xl text-muted-foreground group-hover:text-foreground transition-colors flex-1">
              Search loads, drivers, companies, trips...
            </span>
            <kbd className="hidden sm:inline-flex h-7 px-3 items-center gap-1 rounded-lg border border-border/50 bg-background/50 font-mono text-sm text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Smart Suggestions */}
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="text-muted-foreground">Try:</span>
            <button className="px-3 py-1.5 rounded-full bg-muted/40 hover:bg-muted/60 text-foreground transition-colors">
              Phoenix to Denver
            </button>
            <button className="px-3 py-1.5 rounded-full bg-muted/40 hover:bg-muted/60 text-foreground transition-colors">
              John Doe
            </button>
            <button className="px-3 py-1.5 rounded-full bg-muted/40 hover:bg-muted/60 text-foreground transition-colors">
              Load #L-123
            </button>
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-background border-2 border-border rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <input
                autoFocus
                type="text"
                placeholder="Search everything..."
                className="w-full px-4 py-4 bg-transparent border-0 outline-none text-xl"
              />
            </div>
            <div className="border-t border-border p-6 text-sm text-muted-foreground text-center">
              Start typing to search loads, drivers, companies, and trips
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
