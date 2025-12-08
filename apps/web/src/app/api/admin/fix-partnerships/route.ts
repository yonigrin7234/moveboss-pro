import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';
import { createMissingPartnerships } from '@/data/marketplace';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/fix-partnerships
 * Retroactively creates missing partnerships for marketplace transactions.
 * Only accessible to authenticated users (will create partnerships for all affected transactions).
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log(`[Fix Partnerships] Triggered by user ${user.id}`);

    const result = await createMissingPartnerships(user.id);

    console.log('[Fix Partnerships] Result:', result);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Successfully created ${result.created} missing partnerships`
        : `Created ${result.created} partnerships with ${result.errors.length} errors`,
      created: result.created,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[Fix Partnerships] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix partnerships' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/fix-partnerships
 * Check status - just returns info about what would be fixed
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'POST to this endpoint to retroactively create missing partnerships for marketplace transactions',
    warning: 'This will scan all accepted load requests and create partnerships where missing',
  });
}
