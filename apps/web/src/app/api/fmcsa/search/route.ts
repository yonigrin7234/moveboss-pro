import { NextResponse } from 'next/server';

import { searchCarriersByName, getCarrierByMC, formatInsuranceAmount } from '@/lib/fmcsa';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name')?.trim();
  const mc = searchParams.get('mc')?.trim();

  if (!name && !mc) {
    return NextResponse.json(
      { error: 'Either name or mc parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Search by MC number
    if (mc) {
      const carrier = await getCarrierByMC(mc);
      if (!carrier) {
        return NextResponse.json({ results: [], total: 0 });
      }
      return NextResponse.json({
        results: [
          {
            dotNumber: carrier.dotNumber,
            legalName: carrier.legalName,
            dbaName: carrier.dbaName,
            city: carrier.phyCity,
            state: carrier.phyState,
            allowedToOperate: carrier.allowedToOperate === 'Y',
            statusCode: carrier.statusCode,
            insurance: formatInsuranceAmount(carrier.bipdInsuranceOnFile),
            totalDrivers: carrier.totalDrivers,
            totalPowerUnits: carrier.totalPowerUnits,
          },
        ],
        total: 1,
      });
    }

    // Search by name
    const carriers = await searchCarriersByName(name!, { size: 20 });

    const results = carriers.map((carrier) => ({
      dotNumber: carrier.dotNumber,
      legalName: carrier.legalName,
      dbaName: carrier.dbaName,
      city: carrier.phyCity,
      state: carrier.phyState,
      allowedToOperate: carrier.allowedToOperate === 'Y',
      statusCode: carrier.statusCode,
      insurance: formatInsuranceAmount(carrier.bipdInsuranceOnFile),
      totalDrivers: carrier.totalDrivers,
      totalPowerUnits: carrier.totalPowerUnits,
    }));

    return NextResponse.json({
      results,
      total: results.length,
    });
  } catch (error) {
    console.error('FMCSA search error:', error);
    return NextResponse.json(
      { error: 'Failed to search carriers' },
      { status: 500 }
    );
  }
}
