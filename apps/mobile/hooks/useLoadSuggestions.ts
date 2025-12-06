/**
 * useLoadSuggestions Hook
 * Fetches load suggestions for a driver's trip
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface LoadSuggestion {
  id: string;
  suggestion_type: 'near_delivery' | 'backhaul' | 'capacity_fit' | 'high_profit' | 'partner_load';
  match_score: number;
  status: 'pending' | 'viewed' | 'interested' | 'claimed' | 'dismissed' | 'expired';

  // Distance metrics
  distance_to_pickup_miles: number;
  load_miles: number;
  total_miles: number;

  // Financial
  profit_estimate: number;
  profit_per_mile: number;
  revenue_estimate: number;
  capacity_fit_percent: number;

  // Load details
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

  created_at: string;
  expires_at?: string;
}

interface UseLoadSuggestionsReturn {
  suggestions: LoadSuggestion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsViewed: (suggestionId: string) => Promise<void>;
  notifyDispatcher: (suggestionId: string) => Promise<void>;
}

export function useLoadSuggestions(tripId?: string): UseLoadSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<LoadSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!tripId) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('load_suggestions')
        .select(`
          *,
          load:loads(
            id,
            load_number,
            job_number,
            pickup_city,
            pickup_state,
            delivery_city,
            delivery_state,
            cubic_feet,
            total_rate,
            posting_type,
            pickup_date,
            company:companies!loads_company_id_fkey(id, company_name, name)
          )
        `)
        .eq('trip_id', tripId)
        .in('status', ['pending', 'viewed', 'interested'])
        .order('match_score', { ascending: false })
        .limit(10);

      if (fetchError) {
        throw fetchError;
      }

      setSuggestions((data as LoadSuggestion[]) || []);
    } catch {
      setError('Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const markAsViewed = useCallback(async (suggestionId: string) => {
    try {
      await supabase
        .from('load_suggestions')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

      // Update local state
      setSuggestions(prev =>
        prev.map(s =>
          s.id === suggestionId ? { ...s, status: 'viewed' as const } : s
        )
      );
    } catch {
      // Silently fail
    }
  }, []);

  const notifyDispatcher = useCallback(async (suggestionId: string) => {
    try {
      await supabase
        .from('load_suggestions')
        .update({
          status: 'interested',
          actioned_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

      // Update local state
      setSuggestions(prev =>
        prev.map(s =>
          s.id === suggestionId ? { ...s, status: 'interested' as const } : s
        )
      );

      // TODO: Send push notification to owner/dispatcher
    } catch (e) {
      throw e;
    }
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    refresh: fetchSuggestions,
    markAsViewed,
    notifyDispatcher,
  };
}
