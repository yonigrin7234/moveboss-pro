/**
 * Marketplace Load Management API
 *
 * Handles marketplace posting status transitions:
 * - POST: Release, unpublish, cancel, or repost loads
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  releaseLoadToMarketplace,
  unpublishLoad,
  cancelPostedLoad,
  repostLoadToMarketplace,
} from '@/data/company-portal';
import {
  notifyOwnerLoadReleased,
  notifyCarrierLoadCancelled,
} from '@/lib/push-notifications';

type MarketplaceAction = 'release' | 'unpublish' | 'cancel' | 'repost';

interface MarketplaceActionRequest {
  action: MarketplaceAction;
  loadId: string;
  carrierId?: string; // Required for 'release' action
  reason?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MarketplaceActionRequest = await request.json();
    const { action, loadId, carrierId, reason } = body;

    if (!action || !loadId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, loadId' },
        { status: 400 }
      );
    }

    let result: { success: boolean; error?: string; previousCarrierId?: string; loadOwnerId?: string };

    switch (action) {
      case 'release':
        // Carrier releases a load back to marketplace
        if (!carrierId) {
          return NextResponse.json(
            { error: 'carrierId is required for release action' },
            { status: 400 }
          );
        }

        // Verify the user owns the carrier company
        const { data: carrierCompany } = await supabase
          .from('companies')
          .select('id, owner_id')
          .eq('id', carrierId)
          .eq('owner_id', user.id)
          .single();

        if (!carrierCompany) {
          return NextResponse.json(
            { error: 'You do not own this carrier company' },
            { status: 403 }
          );
        }

        result = await releaseLoadToMarketplace(loadId, carrierId, reason);

        if (result.success) {
          // Send notification to load owner
          await notifyOwnerLoadReleased(loadId, carrierId, reason);
        }
        break;

      case 'unpublish':
        // Owner takes load off marketplace
        result = await unpublishLoad(loadId, user.id);
        break;

      case 'cancel':
        // Owner cancels the load
        result = await cancelPostedLoad(loadId, user.id, reason);

        if (result.success && result.previousCarrierId) {
          // Notify the carrier that the load was cancelled
          await notifyCarrierLoadCancelled(loadId, result.previousCarrierId, reason);
        }
        break;

      case 'repost':
        // Owner reposts a cancelled/draft load
        result = await repostLoadToMarketplace(loadId, user.id);
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: release, unpublish, cancel, repost` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      loadId,
    });
  } catch (error) {
    console.error('Marketplace action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
