'use client';

import { Search, Bell, DollarSign, BadgeCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
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

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Clean minimal top bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-4">
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-9 px-3 rounded-lg bg-gray-100/80 hover:bg-gray-100 border border-gray-200/60 transition-colors group"
          >
            <Search className="h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            <span className="text-sm text-gray-500 hidden sm:inline">Search...</span>
            <kbd className="hidden md:inline-flex h-5 px-1.5 items-center rounded bg-white border border-gray-200 font-mono text-[10px] text-gray-400 ml-8">
              ⌘K
            </kbd>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {mode !== 'broker' && fmcsaStatus === 'verified' && (
              <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                <BadgeCheck className="h-3.5 w-3.5" />
                <span>Verified</span>
              </div>
            )}

            <Link
              href="/dashboard/finance/receivables"
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold transition-colors ${
                hasOverdue
                  ? 'text-red-700 bg-red-50 border border-red-200/60 hover:bg-red-100'
                  : 'text-gray-600 bg-gray-50 border border-gray-200/60 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>${(moneyOwed / 1000).toFixed(1)}k</span>
            </Link>

            <button className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
              <Bell className="h-4 w-4 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search loads, drivers, companies..."
                className="flex-1 bg-transparent border-0 outline-none text-base text-gray-900 placeholder:text-gray-400"
              />
              <kbd className="h-6 px-2 flex items-center rounded bg-gray-100 border border-gray-200 font-mono text-xs text-gray-400">
                ESC
              </kbd>
            </div>
            <div className="p-3 flex items-center gap-2">
              <span className="text-xs text-gray-400">Try:</span>
              <button className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors">Phoenix to Denver</button>
              <button className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors">John Doe</button>
              <button className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors">Load #L-123</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
