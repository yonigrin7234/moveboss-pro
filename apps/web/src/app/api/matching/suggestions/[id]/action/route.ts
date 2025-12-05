import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';

type SuggestionAction = 'viewed' | 'interested' | 'dismissed' | 'claimed';

/**
 * POST /api/matching/suggestions/:id/action
 * Updates the status of a load suggestion
 *
 * Body:
 * - action: 'viewed' | 'interested' | 'dismissed' | 'claimed'
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: suggestionId } = await context.params;

  try {
    const { action } = await request.json();

    const validActions: SuggestionAction[] = ['viewed', 'interested', 'dismissed', 'claimed'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Build update payload
    const updateData: Record<string, unknown> = {
      status: action,
      actioned_at: new Date().toISOString(),
    };

    // Set viewed_at on first view
    if (action === 'viewed') {
      updateData.viewed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('load_suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .eq('owner_id', user.id)
      .select(
        `
        *,
        load:loads(id, load_number, pickup_city, pickup_state)
      `
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ suggestion: data });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to update suggestion' },
      { status: 500 }
    );
  }
}
