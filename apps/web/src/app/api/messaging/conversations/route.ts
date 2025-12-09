import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getUserConversations,
  getOrCreateLoadConversation,
  getOrCreateTripConversation,
  getOrCreateCompanyConversation,
  getOrCreateDriverDispatchConversation,
  createConversationSchema,
} from '@/data/conversations';
import type { ConversationType } from '@/lib/communication-types';

// GET /api/messaging/conversations
// List conversations for the authenticated user
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ConversationType | null;
    const loadId = searchParams.get('load_id');
    const tripId = searchParams.get('trip_id');
    const includeArchived = searchParams.get('include_archived') === 'true';
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    // Get user's primary company
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No company membership found' }, { status: 400 });
    }

    console.log('[Conversations API] Fetching for user:', user.id, 'company:', membership.company_id);

    const conversations = await getUserConversations(user.id, membership.company_id, {
      type: type ?? undefined,
      load_id: loadId ?? undefined,
      trip_id: tripId ?? undefined,
      include_archived: includeArchived,
      limit,
      offset,
    });

    console.log('[Conversations API] Found:', conversations.length, 'conversations');

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/messaging/conversations
// Create a new conversation or get existing one
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, load_id, trip_id, driver_id, partner_company_id, title } = parsed.data;

    // Get user's primary company
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No company membership found' }, { status: 400 });
    }

    let conversation;

    switch (type) {
      case 'load_internal':
      case 'load_shared':
        if (!load_id) {
          return NextResponse.json({ error: 'load_id is required for load conversations' }, { status: 400 });
        }
        conversation = await getOrCreateLoadConversation(
          load_id,
          type,
          membership.company_id,
          partner_company_id,
          user.id
        );
        break;

      case 'trip_internal':
        if (!trip_id) {
          return NextResponse.json({ error: 'trip_id is required for trip conversations' }, { status: 400 });
        }
        conversation = await getOrCreateTripConversation(trip_id, membership.company_id, user.id);
        break;

      case 'company_to_company':
        if (!partner_company_id) {
          return NextResponse.json(
            { error: 'partner_company_id is required for company-to-company conversations' },
            { status: 400 }
          );
        }
        conversation = await getOrCreateCompanyConversation(
          membership.company_id,
          partner_company_id,
          user.id
        );
        break;

      case 'driver_dispatch':
        if (!driver_id) {
          return NextResponse.json(
            { error: 'driver_id is required for driver-dispatch conversations' },
            { status: 400 }
          );
        }
        conversation = await getOrCreateDriverDispatchConversation(
          driver_id,
          membership.company_id,
          user.id
        );
        break;

      case 'general':
        // Create a new general conversation
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            type: 'general',
            owner_company_id: membership.company_id,
            title,
            created_by_user_id: user.id,
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create conversation: ${error.message}`);
        }
        conversation = newConv;
        break;

      default:
        return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
    }

    // Auto-add the creator as a participant if not already added
    await supabase.from('conversation_participants').upsert(
      {
        conversation_id: conversation.id,
        user_id: user.id,
        company_id: membership.company_id,
        role: membership.role as 'owner' | 'dispatcher' | 'driver',
        can_read: true,
        can_write: true,
        added_by_user_id: user.id,
      },
      { onConflict: 'conversation_id,user_id' }
    );

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Create conversation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
