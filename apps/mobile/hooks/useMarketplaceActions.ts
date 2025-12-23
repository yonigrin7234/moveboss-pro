/**
 * Hook for marketplace actions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useOwner } from '../providers/OwnerProvider';

interface PostToMarketplaceParams {
  loadId: string;
  postingType?: 'live_load' | 'load' | 'pickup';
}

interface UnpostFromMarketplaceParams {
  loadId: string;
}

export function useMarketplaceActions() {
  const { company } = useOwner();
  const queryClient = useQueryClient();

  const postMutation = useMutation({
    mutationFn: async ({ loadId, postingType = 'load' }: PostToMarketplaceParams) => {
      if (!company?.id) throw new Error('No company');

      console.log('[Marketplace] Posting load:', loadId, 'type:', postingType, 'company:', company.id);

      // First verify the load belongs to this company
      const { data: existingLoad, error: fetchError } = await supabase
        .from('loads')
        .select('id, company_id, posted_by_company_id, owner_id')
        .eq('id', loadId)
        .single();

      console.log('[Marketplace] Existing load:', existingLoad, 'fetchError:', fetchError);

      if (fetchError) {
        console.error('[Marketplace] Fetch error:', fetchError.message, fetchError.code, fetchError.details);
        throw new Error(`Failed to fetch load: ${fetchError.message}`);
      }
      if (!existingLoad) throw new Error('Load not found');

      // Check ownership via either company_id or posted_by_company_id
      const isOwner = existingLoad.company_id === company.id ||
                      existingLoad.posted_by_company_id === company.id;
      console.log('[Marketplace] Ownership check:', {
        loadCompanyId: existingLoad.company_id,
        loadPostedByCompanyId: existingLoad.posted_by_company_id,
        userCompanyId: company.id,
        isOwner
      });

      if (!isOwner) throw new Error('Not authorized to post this load');

      const { data, error } = await supabase
        .from('loads')
        .update({
          posting_status: 'posted',
          is_marketplace_visible: true,
          posted_to_marketplace_at: new Date().toISOString(),
          posting_type: postingType,
          posted_by_company_id: company.id,
        })
        .eq('id', loadId)
        .select()
        .single();

      console.log('[Marketplace] Update result:', data, 'error:', error);

      if (error) {
        console.error('[Marketplace] Update error:', error.message, error.code, error.details);
        throw new Error(`Failed to update load: ${error.message}`);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats'] });
    },
  });

  const unpostMutation = useMutation({
    mutationFn: async ({ loadId }: UnpostFromMarketplaceParams) => {
      if (!company?.id) throw new Error('No company');

      // First verify the load belongs to this company
      const { data: existingLoad, error: fetchError } = await supabase
        .from('loads')
        .select('id, company_id, posted_by_company_id')
        .eq('id', loadId)
        .single();

      if (fetchError) throw fetchError;
      if (!existingLoad) throw new Error('Load not found');

      // Check ownership via either company_id or posted_by_company_id
      const isOwner = existingLoad.company_id === company.id ||
                      existingLoad.posted_by_company_id === company.id;
      if (!isOwner) throw new Error('Not authorized to unpost this load');

      const { data, error } = await supabase
        .from('loads')
        .update({
          posting_status: 'draft',
          is_marketplace_visible: false,
        })
        .eq('id', loadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats'] });
    },
  });

  return {
    postToMarketplace: postMutation.mutateAsync,
    unpostFromMarketplace: unpostMutation.mutateAsync,
    isPosting: postMutation.isPending,
    isUnposting: unpostMutation.isPending,
  };
}
