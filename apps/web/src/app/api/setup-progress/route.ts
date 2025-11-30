import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';
import {
  getSetupProgress,
  updateSetupProgress,
  type SetupProgressField,
} from '@/data/setup-progress';

// GET - Fetch current setup progress
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getSetupProgress(user.id);

    if (result.error && !result.progress) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      progress: result.progress,
      counts: result.counts,
    });
  } catch (error) {
    console.error('Error fetching setup progress:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch setup progress' },
      { status: 500 }
    );
  }
}

// PATCH - Update specific progress item
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { field, value } = body as { field: SetupProgressField; value: boolean };

    if (!field || typeof value !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await updateSetupProgress(user.id, field, value);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ progress: result.progress });
  } catch (error) {
    console.error('Error updating setup progress:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update setup progress' },
      { status: 500 }
    );
  }
}
