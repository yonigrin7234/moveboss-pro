'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
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
      {/* Hero Section - Giant Centered Search */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6">
          {/* Giant Search Bar */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full max-w-3xl flex items-center gap-4 px-6 py-4 rounded-xl bg-white border-2 border-border/40 hover:border-border/60 shadow-sm hover:shadow-md transition-all duration-150 text-left group"
          >
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="text-base text-muted-foreground flex-1">Search loads, drivers, companies, trips...</span>
            <kbd className="hidden sm:inline-flex h-6 px-2 items-center rounded border border-border/50 bg-muted/50 font-mono text-xs text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Smart Suggestions */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="text-xs uppercase tracking-wider">Try:</span>
            <button 
              onClick={() => setSearchOpen(true)}
              className="px-3 py-1.5 rounded-full bg-muted/30 hover:bg-muted/50 text-foreground transition-colors duration-150"
            >
              Phoenix to Denver
            </button>
            <button 
              onClick={() => setSearchOpen(true)}
              className="px-3 py-1.5 rounded-full bg-muted/30 hover:bg-muted/50 text-foreground transition-colors duration-150"
            >
              Load #L-123
            </button>
            <button 
              onClick={() => setSearchOpen(true)}
              className="px-3 py-1.5 rounded-full bg-muted/30 hover:bg-muted/50 text-foreground transition-colors duration-150"
            >
              John Doe
            </button>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-background border border-border rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <input
                autoFocus
                type="text"
                placeholder="Search loads, drivers, companies, trips..."
                className="w-full px-4 py-4 bg-transparent border-0 outline-none text-lg"
              />
            </div>
            <div className="border-t border-border px-6 py-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="text-xs uppercase tracking-wider">Try:</span>
              <button className="px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors">Phoenix to Denver</button>
              <button className="px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors">John Doe</button>
              <button className="px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors">Load #L-123</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
