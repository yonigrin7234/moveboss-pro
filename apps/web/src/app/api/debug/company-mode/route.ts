import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getDashboardMode } from '@/lib/dashboardMode';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: company, error } = await supabase
      .from('companies')
      .select('id, name, is_carrier, is_broker, owner_id')
      .eq('owner_id', user.id)
      .single();

    if (error) {
      return NextResponse.json({
        error: error.message,
        user_id: user.id,
        company: null
      });
    }

    const mode = getDashboardMode(company || {});

    return NextResponse.json({
      user_id: user.id,
      user_email: user.email,
      company: {
        id: company?.id,
        name: company?.name,
        is_carrier: company?.is_carrier,
        is_broker: company?.is_broker,
      },
      computed_mode: mode,
      logic: {
        explanation: 'is_broker && is_carrier = hybrid, is_carrier = carrier, else = broker'
      }
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
