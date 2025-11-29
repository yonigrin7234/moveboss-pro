import { createClient } from '@/lib/supabase-server';

export interface LoadPhoto {
  id: string;
  load_id: string;
  uploaded_by_id: string;
  company_id: string | null;
  photo_type: 'loading' | 'loaded' | 'delivery' | 'damage' | 'other';
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  status_history_id: string | null;
  created_at: string;
}

export type PhotoType = LoadPhoto['photo_type'];

// Upload a photo for a load
export async function uploadLoadPhoto(
  loadId: string,
  uploadedById: string,
  companyId: string | null,
  photoType: PhotoType,
  file: File,
  options?: {
    caption?: string;
    latitude?: number;
    longitude?: number;
    statusHistoryId?: string;
  }
): Promise<{ success: boolean; photo?: LoadPhoto; error?: string }> {
  const supabase = await createClient();

  // Upload file to storage
  const fileName = `${loadId}/${photoType}/${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('load-photos')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('load-photos')
    .getPublicUrl(fileName);

  // Create database record
  const { data: photo, error: dbError } = await supabase
    .from('load_photos')
    .insert({
      load_id: loadId,
      uploaded_by_id: uploadedById,
      company_id: companyId,
      photo_type: photoType,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      caption: options?.caption || null,
      latitude: options?.latitude || null,
      longitude: options?.longitude || null,
      status_history_id: options?.statusHistoryId || null,
      taken_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) {
    console.error('Database error:', dbError);
    return { success: false, error: dbError.message };
  }

  return { success: true, photo };
}

// Get all photos for a load
export async function getLoadPhotos(loadId: string): Promise<LoadPhoto[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_photos')
    .select('*')
    .eq('load_id', loadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }

  return data || [];
}

// Get photos by type
export async function getLoadPhotosByType(
  loadId: string,
  photoType: PhotoType
): Promise<LoadPhoto[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_photos')
    .select('*')
    .eq('load_id', loadId)
    .eq('photo_type', photoType)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }

  return data || [];
}

// Delete a photo
export async function deleteLoadPhoto(
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get photo to find file path
  const { data: photo } = await supabase
    .from('load_photos')
    .select('file_url')
    .eq('id', photoId)
    .single();

  if (!photo) {
    return { success: false, error: 'Photo not found' };
  }

  // Delete from storage
  const filePath = photo.file_url.split('/load-photos/')[1];
  if (filePath) {
    await supabase.storage.from('load-photos').remove([filePath]);
  }

  // Delete from database
  const { error } = await supabase
    .from('load_photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    console.error('Error deleting photo:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get photo counts for a load
export async function getLoadPhotoCounts(
  loadId: string
): Promise<{ loading: number; delivery: number; total: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_photos')
    .select('photo_type')
    .eq('load_id', loadId);

  if (error || !data) {
    return { loading: 0, delivery: 0, total: 0 };
  }

  const loading = data.filter(
    (p) => p.photo_type === 'loading' || p.photo_type === 'loaded'
  ).length;
  const delivery = data.filter((p) => p.photo_type === 'delivery').length;

  return { loading, delivery, total: data.length };
}
