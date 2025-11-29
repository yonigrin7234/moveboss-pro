'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import { updateTrip, updateTripInputSchema } from '@/data/trips';

function cleanFormValues(formData: FormData | null | undefined, fields: string[]) {
  const cleaned: Record<string, string> = {};
  if (!formData) return cleaned;
  fields.forEach((field) => {
    const value = formData.get(field);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        cleaned[field] = trimmed;
      }
    }
  });
  return cleaned;
}

export async function updateTripStatusAction(
  prevState: { errors?: Record<string, string>; success?: boolean } | null,
  formData: FormData
): Promise<{ errors?: Record<string, string>; success?: boolean } | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { errors: { _form: 'Not authenticated' } };

  const tripId = formData.get('trip_id');
  if (typeof tripId !== 'string' || !tripId) {
    return { errors: { _form: 'Missing trip id' } };
  }

  const payload = cleanFormValues(formData, [
    'status',
    'odometer_start',
    'odometer_start_photo_url',
    'odometer_end',
    'odometer_end_photo_url',
  ]);

  try {
    const validated = updateTripInputSchema.parse(payload);
    await updateTrip(tripId, validated, currentUser.id);
    revalidatePath(`/dashboard/trips/${tripId}`);
    revalidatePath('/dashboard/trips');
    return { success: true };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      const errors: Record<string, string> = {};
      zodError.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
      return { errors };
    }
    return { errors: { _form: error instanceof Error ? error.message : 'Failed to update status' } };
  }
}

