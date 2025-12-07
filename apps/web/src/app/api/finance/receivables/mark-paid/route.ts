import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';
import { markReceivablePaid } from '@/data/settlements';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receivableId } = body;

    if (!receivableId) {
      return NextResponse.json(
        { error: 'Receivable ID is required' },
        { status: 400 }
      );
    }

    const result = await markReceivablePaid(receivableId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to mark as paid' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking receivable as paid:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
