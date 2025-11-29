import { createClient } from '@/lib/supabase-server';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  timezone: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  created_at: string;
  updated_at: string;
}

const missingProfilesTable = (error: any) => {
  if (!error) return false;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return error.code === '42P01' || message.includes('profiles');
};

const defaultProfile = (userId: string): Profile => {
  const now = new Date().toISOString();
  return {
    id: userId,
    full_name: '',
    phone: null,
    timezone: 'UTC',
    email_notifications: true,
    sms_notifications: false,
    created_at: now,
    updated_at: now,
  };
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (missingProfilesTable(error)) {
      return null;
    }
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data as Profile | null;
}

export async function upsertProfile(userId: string, values: Partial<Profile>): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...values,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    if (missingProfilesTable(error)) {
      // Return a local profile representation if table is missing; caller can decide how to surface
      return {
        ...defaultProfile(userId),
        ...values,
        updated_at: new Date().toISOString(),
      } as Profile;
    }
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  return data as Profile;
}

export async function ensureProfile(userId: string): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  try {
    return await upsertProfile(userId, {
      full_name: '',
      phone: null,
      timezone: 'UTC',
      email_notifications: true,
      sms_notifications: false,
    });
  } catch (error) {
    if (missingProfilesTable(error)) {
      return defaultProfile(userId);
    }
    throw error;
  }
}
