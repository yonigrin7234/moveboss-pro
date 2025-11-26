import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-admin';

const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getDbClient() {
  if (hasServiceRoleKey) return createServiceRoleClient();
  return createClient();
}

export type ActivityType =
  | 'trip_started'
  | 'trip_completed'
  | 'load_accepted'
  | 'loading_started'
  | 'loading_finished'
  | 'delivery_started'
  | 'delivery_completed'
  | 'expense_added';

export interface LogActivityParams {
  ownerId: string;
  driverId?: string;
  driverName?: string;
  activityType: ActivityType;
  tripId?: string;
  tripNumber?: string;
  loadId?: string;
  loadNumber?: string;
  expenseId?: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity event
 * Silently fails to avoid blocking main workflow
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const supabase = await getDbClient();

    const { error } = await supabase.from('activity_log').insert({
      owner_id: params.ownerId,
      driver_id: params.driverId || null,
      driver_name: params.driverName || null,
      activity_type: params.activityType,
      trip_id: params.tripId || null,
      trip_number: params.tripNumber || null,
      load_id: params.loadId || null,
      load_number: params.loadNumber || null,
      expense_id: params.expenseId || null,
      title: params.title,
      description: params.description || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[logActivity] Error:', error.message);
    }
  } catch (err) {
    // Silently fail - activity logging should not block main workflow
    console.error('[logActivity] Exception:', err);
  }
}

export interface ActivityLogEntry {
  id: string;
  owner_id: string;
  driver_id: string | null;
  driver_name: string | null;
  activity_type: ActivityType;
  trip_id: string | null;
  trip_number: string | null;
  load_id: string | null;
  load_number: string | null;
  expense_id: string | null;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface GetActivitiesOptions {
  limit?: number;
  driverId?: string;
  tripId?: string;
  activityType?: ActivityType;
  since?: Date;
}

/**
 * Get recent activities for an owner
 */
export async function getRecentActivities(
  ownerId: string,
  options?: GetActivitiesOptions
): Promise<ActivityLogEntry[]> {
  try {
    const supabase = await getDbClient();

    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(options?.limit || 50);

    if (options?.driverId) {
      query = query.eq('driver_id', options.driverId);
    }

    if (options?.tripId) {
      query = query.eq('trip_id', options.tripId);
    }

    if (options?.activityType) {
      query = query.eq('activity_type', options.activityType);
    }

    if (options?.since) {
      query = query.gte('created_at', options.since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getRecentActivities] Error:', error.message);
      return [];
    }

    return (data || []) as ActivityLogEntry[];
  } catch (err) {
    console.error('[getRecentActivities] Exception:', err);
    return [];
  }
}

/**
 * Get activity count for today
 */
export async function getTodayActivityCount(ownerId: string): Promise<number> {
  try {
    const supabase = await getDbClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .gte('created_at', today.toISOString());

    if (error) {
      console.error('[getTodayActivityCount] Error:', error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('[getTodayActivityCount] Exception:', err);
    return 0;
  }
}
