'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  RefreshCw,
  MapPin,
  Truck,
  DollarSign,
  Star,
  ArrowRight,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Check,
} from 'lucide-react';

interface LoadSuggestion {
  id: string;
  suggestion_type: 'near_delivery' | 'backhaul' | 'capacity_fit' | 'high_profit' | 'partner_load';
  match_score: number;
  status: 'pending' | 'viewed' | 'interested' | 'claimed' | 'dismissed' | 'expired';
  distance_to_pickup_miles: number;
  load_miles: number;
  total_miles: number;
  profit_estimate: number;
  profit_per_mile: number;
  revenue_estimate: number;
  capacity_fit_percent: number;
  load: {
    id: string;
    load_number: string;
    job_number?: string;
    pickup_city: string;
    pickup_state: string;
    delivery_city: string;
    delivery_state: string;
    cubic_feet: number;
    total_rate?: number;
    posting_type?: string;
    pickup_date?: string;
    company?: {
      id: string;
      company_name?: string;
      name?: string;
    };
  };
}

const SUGGESTION_TYPE_LABELS: Record<LoadSuggestion['suggestion_type'], string> = {
  near_delivery: 'Near Delivery',
  backhaul: 'Backhaul',
  capacity_fit: 'Perfect Fit',
  high_profit: 'High Profit',
  partner_load: 'Partner',
};

const SUGGESTION_TYPE_COLORS: Record<LoadSuggestion['suggestion_type'], string> = {
  near_delivery: 'bg-blue-500/10 text-blue-500',
  backhaul: 'bg-purple-500/10 text-purple-500',
  capacity_fit: 'bg-green-500/10 text-green-500',
  high_profit: 'bg-amber-500/10 text-amber-500',
  partner_load: 'bg-indigo-500/10 text-indigo-500',
};

interface LoadSuggestionsPanelProps {
  tripId: string;
  onClaimLoad?: (loadId: string) => void;
}

export function LoadSuggestionsPanel({ tripId, onClaimLoad }: LoadSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<LoadSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch(`/api/matching/suggestions?tripId=${tripId}`);
      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const refreshSuggestions = async () => {
    setIsRefreshing(true);
    try {
      // First refresh/regenerate suggestions
      await fetch('/api/matching/suggestions/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      });
      // Then fetch updated list
      await fetchSuggestions();
      toast({
        title: 'Suggestions refreshed',
        description: 'Load suggestions have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh suggestions',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAction = async (suggestionId: string, action: string) => {
    try {
      await fetch(`/api/matching/suggestions/${suggestionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (action === 'dismissed') {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      } else {
        setSuggestions((prev) =>
          prev.map((s) => (s.id === suggestionId ? { ...s, status: action as LoadSuggestion['status'] } : s))
        );
      }

      if (action === 'claimed' && onClaimLoad) {
        const suggestion = suggestions.find((s) => s.id === suggestionId);
        if (suggestion) {
          onClaimLoad(suggestion.load.id);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update suggestion',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Smart Load Suggestions
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {suggestions.length} loads match your route and capacity
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshSuggestions} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-6">
            <Truck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No matching loads found. Try refreshing or adjusting your settings.
            </p>
            <Button variant="outline" size="sm" onClick={refreshSuggestions} className="mt-4">
              Find Matching Loads
            </Button>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={SUGGESTION_TYPE_COLORS[suggestion.suggestion_type]}
                  >
                    {SUGGESTION_TYPE_LABELS[suggestion.suggestion_type]}
                  </Badge>
                  {suggestion.status === 'interested' && (
                    <Badge variant="outline" className="text-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Interested
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">{Math.round(suggestion.match_score)}</span>
                </div>
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>
                  {suggestion.load.pickup_city}, {suggestion.load.pickup_state}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span>
                  {suggestion.load.delivery_city}, {suggestion.load.delivery_state}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Deadhead</p>
                  <p className="font-medium">{Math.round(suggestion.distance_to_pickup_miles)} mi</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Load Miles</p>
                  <p className="font-medium">{Math.round(suggestion.load_miles)} mi</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">CUFT</p>
                  <p className="font-medium">{suggestion.load.cubic_feet || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Est. Profit</p>
                  <p className="font-medium text-green-600">
                    ${Math.round(suggestion.profit_estimate)}
                  </p>
                </div>
              </div>

              {/* Company */}
              <p className="text-xs text-muted-foreground">
                {suggestion.load.company?.company_name || suggestion.load.company?.name || 'Unknown Company'} •{' '}
                ${suggestion.profit_per_mile.toFixed(2)}/mi
              </p>

              {/* Actions */}
              {suggestion.status !== 'claimed' && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAction(suggestion.id, 'claimed')}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Claim Load
                  </Button>
                  {suggestion.status !== 'interested' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(suggestion.id, 'interested')}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction(suggestion.id, 'dismissed')}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
