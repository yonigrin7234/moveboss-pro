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
    <div className="bg-background border-b border-border/30">
      {/* Top status pills - subtle */}
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

      {/* Centered Global Search */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl bg-muted/20 hover:bg-muted/30 border border-border/30 hover:border-border/50 transition-all text-left group shadow-sm"
          >
            <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-base text-muted-foreground group-hover:text-foreground transition-colors flex-1">
              Search loads, drivers, companies, trips...
            </span>
            <kbd className="hidden sm:inline-flex h-6 px-2 items-center gap-1 rounded-md border border-border/50 bg-background/50 font-mono text-xs text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <input
                autoFocus
                type="text"
                placeholder="Search everything..."
                className="w-full px-4 py-4 bg-transparent border-0 outline-none text-lg"
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
