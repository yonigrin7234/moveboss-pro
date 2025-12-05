'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Search,
  Package,
  Truck,
  Users,
  Building2,
  Plus,
  UserPlus,
  Banknote,
  Map,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'load' | 'driver' | 'company' | 'trip';
  title: string;
  subtitle: string;
  href: string;
  metadata?: Record<string, unknown>;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = 'moveboss-recent-searches';
const MAX_RECENT_SEARCHES = 5;

const typeIcons = {
  load: Package,
  driver: Users,
  company: Building2,
  trip: Truck,
};

const typeLabels = {
  load: 'Load',
  driver: 'Driver',
  company: 'Company',
  trip: 'Trip',
};

const quickActions = [
  { id: 'post-load', label: 'Post Load', href: '/dashboard/post-load', icon: Plus },
  { id: 'add-driver', label: 'Add Driver', href: '/dashboard/drivers/new', icon: UserPlus },
  { id: 'new-trip', label: 'New Trip', href: '/dashboard/trips/new', icon: Truck },
  { id: 'fleet-map', label: 'Live Fleet', href: '/dashboard/live-fleet', icon: Map },
  { id: 'receivables', label: 'Receivables', href: '/dashboard/finance/receivables', icon: Banknote },
  { id: 'add-company', label: 'Add Company', href: '/dashboard/companies/new', icon: Building2 },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<RecentSearch[]>([]);

  // Load recent searches from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Global keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search API call with debounce
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Search error:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const saveRecentSearch = (searchQuery: string) => {
    const newSearches = [
      { query: searchQuery, timestamp: Date.now() },
      ...recentSearches.filter((s) => s.query !== searchQuery),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(newSearches);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
  };

  const handleSelect = (href: string, searchQuery?: string) => {
    if (searchQuery) {
      saveRecentSearch(searchQuery);
    }
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const handleRecentSearchSelect = (searchQuery: string) => {
    setQuery(searchQuery);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl">
        <Command
          className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search loads, drivers, companies, trips..."
              className="flex-1 h-14 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-base"
            />
            {loading && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin mr-2" />}
            <kbd className="hidden sm:inline-flex h-6 px-2 items-center rounded border border-border bg-muted font-mono text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {query.length < 2 ? 'Type at least 2 characters to search' : 'No results found'}
            </Command.Empty>

            {/* Search Results */}
            {results.length > 0 && (
              <Command.Group heading="Results" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {results.map((result) => {
                  const Icon = typeIcons[result.type];
                  return (
                    <Command.Item
                      key={`${result.type}-${result.id}`}
                      value={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result.href, query)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-foreground data-[selected=true]:bg-accent transition-colors"
                    >
                      <div className={cn(
                        'flex items-center justify-center h-8 w-8 rounded-md',
                        result.type === 'load' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                        result.type === 'driver' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        result.type === 'company' && 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
                        result.type === 'trip' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded bg-muted">
                        {typeLabels[result.type]}
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Recent Searches - only show when no query */}
            {!query && recentSearches.length > 0 && (
              <Command.Group className="px-2 py-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Recent Searches</span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((recent) => (
                  <Command.Item
                    key={recent.timestamp}
                    value={`recent-${recent.query}`}
                    onSelect={() => handleRecentSearchSelect(recent.query)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-foreground data-[selected=true]:bg-accent transition-colors"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{recent.query}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick Actions - only show when no query */}
            {!query && (
              <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Command.Item
                      key={action.id}
                      value={action.id}
                      onSelect={() => handleSelect(action.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-foreground data-[selected=true]:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{action.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/50">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
