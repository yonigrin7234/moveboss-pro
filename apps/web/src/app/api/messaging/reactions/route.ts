import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { addReaction, removeReaction } from '@/data/conversations';
import { z } from 'zod';

const reactionSchema = z.object({
  message_id: z.string().uuid(),
  emoji: z.string().min(1).max(10), // Emoji can be compound emoji
  action: z.enum(['add', 'remove']),
});

// POST /api/messaging/reactions
// Add or remove a reaction
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
    const parsed = reactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message_id, emoji, action } = parsed.data;

    // Check if user is a driver
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (action === 'add') {
      if (driver) {
        await addReaction(message_id, emoji, undefined, driver.id);
      } else {
        await addReaction(message_id, emoji, user.id, undefined);
      }
    } else {
      if (driver) {
        await removeReaction(message_id, emoji, undefined, driver.id);
      } else {
        await removeReaction(message_id, emoji, user.id, undefined);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reaction API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reaction' },
      { status: 500 }
    );
  }
}
