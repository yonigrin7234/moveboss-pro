import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { addParticipant, removeParticipant, addParticipantSchema } from '@/data/conversations';

// POST /api/messaging/participants
// Add a participant to a conversation
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
    const parsed = addParticipantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { conversation_id, user_id, driver_id, role, can_read, can_write } = parsed.data;

    if (!user_id && !driver_id) {
      return NextResponse.json(
        { error: 'Either user_id or driver_id must be provided' },
        { status: 400 }
      );
    }

    // Get the company for the participant
    let companyId: string | undefined;
    if (user_id) {
      const { data: membership } = await supabase
        .from('company_memberships')
        .select('company_id')
        .eq('user_id', user_id)
        .eq('is_primary', true)
        .single();
      companyId = membership?.company_id;
    } else if (driver_id) {
      const { data: driver } = await supabase
        .from('drivers')
        .select('owner_id')
        .eq('id', driver_id)
        .single();
      if (driver) {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', driver.owner_id)
          .single();
        companyId = company?.id;
      }
    }

    const participant = await addParticipant(conversation_id, user.id, {
      user_id,
      driver_id,
      company_id: companyId,
      role,
      can_read,
      can_write,
    });

    return NextResponse.json({ participant });
  } catch (error) {
    console.error('Add participant API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add participant' },
      { status: 500 }
    );
  }
}

// DELETE /api/messaging/participants
// Remove a participant from a conversation
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');
    const userId = searchParams.get('user_id');
    const driverId = searchParams.get('driver_id');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    if (!userId && !driverId) {
      return NextResponse.json(
        { error: 'Either user_id or driver_id must be provided' },
        { status: 400 }
      );
    }

    await removeParticipant(
      conversationId,
      user.id,
      userId ?? undefined,
      driverId ?? undefined
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove participant API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove participant' },
      { status: 500 }
    );
  }
}
