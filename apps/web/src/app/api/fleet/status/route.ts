/**
 * Fleet Status Management API
 *
 * Handles status changes for drivers, trucks, and trailers:
 * - POST: Deactivate, archive, or reactivate entities
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  deactivateTruck,
  archiveTruck,
  reactivateTruck,
  deactivateTrailer,
  archiveTrailer,
  reactivateTrailer,
} from '@/data/fleet';
import {
  deactivateDriver,
  archiveDriver,
  reactivateDriver,
} from '@/data/drivers';

type EntityType = 'driver' | 'truck' | 'trailer';
type StatusAction = 'deactivate' | 'archive' | 'reactivate';

interface StatusActionRequest {
  entityType: EntityType;
  entityId: string;
  action: StatusAction;
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

    const body: StatusActionRequest = await request.json();
    const { entityType, entityId, action } = body;

    if (!entityType || !entityId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, entityId, action' },
        { status: 400 }
      );
    }

    if (!['driver', 'truck', 'trailer'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type. Must be: driver, truck, or trailer' },
        { status: 400 }
      );
    }

    if (!['deactivate', 'archive', 'reactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: deactivate, archive, or reactivate' },
        { status: 400 }
      );
    }

    let result: { success: boolean; error?: string };

    // Route to appropriate handler based on entity type and action
    switch (entityType) {
      case 'driver':
        switch (action) {
          case 'deactivate':
            result = await deactivateDriver(entityId, user.id);
            break;
          case 'archive':
            result = await archiveDriver(entityId, user.id);
            break;
          case 'reactivate':
            result = await reactivateDriver(entityId, user.id);
            break;
          default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        break;

      case 'truck':
        switch (action) {
          case 'deactivate':
            result = await deactivateTruck(entityId, user.id);
            break;
          case 'archive':
            result = await archiveTruck(entityId, user.id);
            break;
          case 'reactivate':
            result = await reactivateTruck(entityId, user.id);
            break;
          default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        break;

      case 'trailer':
        switch (action) {
          case 'deactivate':
            result = await deactivateTrailer(entityId, user.id);
            break;
          case 'archive':
            result = await archiveTrailer(entityId, user.id);
            break;
          case 'reactivate':
            result = await reactivateTrailer(entityId, user.id);
            break;
          default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const actionMessages: Record<StatusAction, string> = {
      deactivate: 'deactivated',
      archive: 'archived',
      reactivate: 'reactivated',
    };

    return NextResponse.json({
      success: true,
      message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${actionMessages[action]} successfully`,
    });
  } catch (error) {
    console.error('Fleet status action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
