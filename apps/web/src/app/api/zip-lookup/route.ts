import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postalCode = searchParams.get('postal_code');
  const country = searchParams.get('country') || 'US';

  if (!postalCode) {
    return NextResponse.json({ error: 'postal_code is required' }, { status: 400 });
  }

  // Only support US for now (Zippopotam.us API)
  if (country !== 'US') {
    return NextResponse.json({ city: null, state: null });
  }

  try {
    // Use Zippopotam.us API (free, no API key required)
    const response = await fetch(`https://api.zippopotam.us/us/${postalCode}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      // API returns 404 for invalid ZIP codes
      return NextResponse.json({ city: null, state: null });
    }

    const data = await response.json();

    // Extract city and state from the first place (most common)
    const place = data.places?.[0];
    if (place) {
      return NextResponse.json({
        city: place['place name'] || null,
        state: place['state abbreviation'] || data['state abbreviation'] || null,
      });
    }

    return NextResponse.json({ city: null, state: null });
  } catch (error) {
    // Fail gracefully - don't block the form
    console.error('ZIP lookup error:', error);
    return NextResponse.json({ city: null, state: null });
  }
}

