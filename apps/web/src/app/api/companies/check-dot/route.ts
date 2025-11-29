import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dot = searchParams.get('dot')?.trim()

  if (!dot) {
    return NextResponse.json({ exists: false })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('dot_number', dot)
    .limit(1)

  if (error) {
    return NextResponse.json({ exists: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ exists: (data?.length ?? 0) > 0 })
}
