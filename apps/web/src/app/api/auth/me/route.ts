import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ user: null, error: 'Failed to get user' }, { status: 500 });
  }
}
