import { NextResponse } from 'next/server';

import { getCurrentDriverForSession } from '@/data/driver-workflow';

export async function GET() {
  const driver = await getCurrentDriverForSession();
  if (!driver) {
    return NextResponse.json({ 
      error: 'Portal access is not enabled for this driver. Please contact your fleet manager.' 
    }, { status: 401 });
  }
  return NextResponse.json({ driver });
}
