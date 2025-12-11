import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getConversation, markConversationRead } from '@/data/conversations';

// GET /api/messaging/conversations/[id]
// Get a single conversation with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const conversation = await getConversation(id, user.id);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Get conversation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/messaging/conversations/[id]
// Update conversation (archive, mute, title)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Verify user has access to this conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('can_read')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .single();

    if (!participant?.can_read) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.is_archived === 'boolean') {
      updates.is_archived = body.is_archived;
    }
    if (typeof body.is_muted === 'boolean') {
      updates.is_muted = body.is_muted;
    }
    if (typeof body.title === 'string') {
      updates.title = body.title;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Update conversation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// POST /api/messaging/conversations/[id]
// Mark conversation as read (supports both users and drivers)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'mark_read') {
      // Check if user is a driver
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (driver) {
        // Mark as read for driver
        const { error } = await supabase
          .from('conversation_participants')
          .update({
            unread_count: 0,
            last_read_at: new Date().toISOString(),
          })
          .eq('conversation_id', id)
          .eq('driver_id', driver.id);

        if (error) {
          throw new Error(`Failed to mark conversation read: ${error.message}`);
        }
      } else {
        // Mark as read for user
        await markConversationRead(id, user.id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Conversation action API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 }
    );
  }
}
