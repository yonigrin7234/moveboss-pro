import { createClient } from '@/lib/supabase-server';

export interface Rating {
  id: string;
  load_id: string;
  rater_company_id: string;
  rated_company_id: string;
  rating: number;
  comment: string | null;
  rater_type: 'shipper' | 'carrier';
  created_at: string;
}

// Submit a rating for a load
export async function submitRating(
  loadId: string,
  raterCompanyId: string,
  ratedCompanyId: string,
  rating: number,
  raterType: 'shipper' | 'carrier',
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if already rated
  const { data: existing } = await supabase
    .from('ratings')
    .select('id')
    .eq('load_id', loadId)
    .eq('rater_company_id', raterCompanyId)
    .single();

  if (existing) {
    return { success: false, error: 'You have already rated this load' };
  }

  const { error } = await supabase
    .from('ratings')
    .insert({
      load_id: loadId,
      rater_company_id: raterCompanyId,
      rated_company_id: ratedCompanyId,
      rating,
      rater_type: raterType,
      comment: comment || null,
    });

  if (error) {
    console.error('Error submitting rating:', error);
    return { success: false, error: error.message };
  }

  // Create notification for the rated company
  const { data: raterCompany } = await supabase
    .from('companies')
    .select('name')
    .eq('id', raterCompanyId)
    .single();

  const { data: load } = await supabase
    .from('loads')
    .select('load_number')
    .eq('id', loadId)
    .single();

  await supabase.from('notifications').insert({
    company_id: ratedCompanyId,
    type: 'rating_received',
    title: `New ${rating}-star rating`,
    message: `${raterCompany?.name || 'A partner'} rated you ${rating} stars for load ${load?.load_number || ''}`,
    load_id: loadId,
  });

  return { success: true };
}

// Get rating for a specific load by a specific rater
export async function getRatingForLoad(
  loadId: string,
  raterCompanyId: string
): Promise<Rating | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('load_id', loadId)
    .eq('rater_company_id', raterCompanyId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Rating;
}

// Get all ratings for a company
export async function getCompanyRatings(
  companyId: string,
  limit: number = 20
): Promise<Rating[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('rated_company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching ratings:', error);
    return [];
  }

  return data || [];
}

// Get average rating for a company
export async function getCompanyAverageRating(
  companyId: string
): Promise<{ average: number | null; count: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('rated_company_id', companyId);

  if (error || !data || data.length === 0) {
    return { average: null, count: 0 };
  }

  const sum = data.reduce((acc, r) => acc + r.rating, 0);
  const average = Math.round((sum / data.length) * 10) / 10;

  return { average, count: data.length };
}
