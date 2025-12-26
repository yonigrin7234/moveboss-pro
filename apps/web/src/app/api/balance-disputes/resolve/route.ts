/**
 * Balance Dispute Resolve API
 *
 * Called by dispatch from the web dashboard to resolve a balance dispute.
 * Updates the load balance if needed and notifies the driver.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { notifyDriverBalanceDisputeResolved } from '@/lib/push-notifications';

interface ResolveDisputeRequest {
  disputeId: string;
  resolutionType: 'confirmed_zero' | 'balance_updated' | 'cancelled';
  newBalance?: number;
  resolutionNote?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as ResolveDisputeRequest;
    const { disputeId, resolutionType, newBalance, resolutionNote } = body;

    if (!disputeId) {
      return NextResponse.json({ error: 'disputeId is required' }, { status: 400 });
    }

    if (!resolutionType || !['confirmed_zero', 'balance_updated', 'cancelled'].includes(resolutionType)) {
      return NextResponse.json(
        { error: 'resolutionType must be one of: confirmed_zero, balance_updated, cancelled' },
        { status: 400 }
      );
    }

    if (resolutionType === 'balance_updated' && (newBalance === undefined || newBalance === null)) {
      return NextResponse.json(
        { error: 'newBalance is required when resolutionType is balance_updated' },
        { status: 400 }
      );
    }

    // Get the dispute with load and driver info
    const { data: dispute, error: disputeError } = await supabase
      .from('load_balance_disputes')
      .select(`
        id,
        load_id,
        driver_id,
        status,
        original_balance,
        loads:load_id (
          id,
          load_number,
          owner_id,
          balance_due_on_delivery,
          remaining_balance_for_delivery
        )
      `)
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    if (dispute.status !== 'pending') {
      return NextResponse.json(
        { error: 'This dispute has already been resolved' },
        { status: 409 }
      );
    }

    // Verify the user has access to resolve this dispute
    // (must be owner or workspace member)
    type LoadData = {
      id: string;
      load_number: string;
      owner_id: string;
      balance_due_on_delivery: number;
      remaining_balance_for_delivery: number;
    };

    // Supabase returns object for many-to-one joins, but handle array case too
    const loadData = dispute.loads as unknown as LoadData | LoadData[] | null;
    const load = Array.isArray(loadData) ? loadData[0] : loadData;

    if (!load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Check if user is owner or workspace member
    const isOwner = load.owner_id === user.id;

    let hasWorkspaceAccess = false;
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('company_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      hasWorkspaceAccess = !!membership;
    }

    if (!isOwner && !hasWorkspaceAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to resolve this dispute' },
        { status: 403 }
      );
    }

    // Update the dispute
    const { error: updateDisputeError } = await supabase
      .from('load_balance_disputes')
      .update({
        status: 'resolved',
        resolution_type: resolutionType,
        new_balance: resolutionType === 'balance_updated' ? newBalance : null,
        resolution_note: resolutionNote || null,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', disputeId);

    if (updateDisputeError) {
      console.error('Error updating dispute:', updateDisputeError);
      return NextResponse.json(
        { error: 'Failed to update dispute' },
        { status: 500 }
      );
    }

    // If balance was updated, also update the load
    if (resolutionType === 'balance_updated' && newBalance !== undefined) {
      const { error: updateLoadError } = await supabase
        .from('loads')
        .update({
          balance_due_on_delivery: newBalance,
          remaining_balance_for_delivery: newBalance,
          balance_adjusted: true,
          balance_adjusted_amount: newBalance,
          balance_adjusted_reason: resolutionNote || 'Balance corrected via driver dispute',
          updated_at: new Date().toISOString(),
        })
        .eq('id', load.id);

      if (updateLoadError) {
        console.error('Error updating load balance:', updateLoadError);
        // Don't fail the request, dispute is already resolved
      }
    }

    // Send push notification to driver
    try {
      await notifyDriverBalanceDisputeResolved(
        dispute.driver_id,
        load.load_number || 'Unknown',
        load.id,
        resolutionType,
        resolutionType === 'balance_updated' ? newBalance : undefined,
        resolutionNote
      );
    } catch (notifyError) {
      // Log but don't fail the request if notification fails
      console.error('Error sending dispute resolution notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: resolutionType === 'balance_updated'
        ? `Balance updated to $${newBalance?.toFixed(2)}. Driver has been notified.`
        : resolutionType === 'confirmed_zero'
        ? 'Balance confirmed as $0. Driver has been notified.'
        : 'Dispute cancelled. Driver has been notified.',
    });
  } catch (error) {
    console.error('Balance dispute resolve error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}

// GET endpoint to list pending disputes for the workspace
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // Get disputes for loads owned by this user or their workspace
    const { data: disputes, error } = await supabase
      .from('load_balance_disputes')
      .select(`
        id,
        load_id,
        driver_id,
        trip_id,
        status,
        original_balance,
        driver_note,
        resolution_type,
        new_balance,
        resolution_note,
        resolved_at,
        created_at,
        loads:load_id (
          id,
          load_number,
          customer_name,
          pickup_city,
          pickup_state,
          delivery_city,
          delivery_state
        ),
        drivers:driver_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching disputes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch disputes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      disputes: disputes || [],
    });
  } catch (error) {
    console.error('Balance dispute list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch disputes' },
      { status: 500 }
    );
  }
}
