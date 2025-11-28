import { useState, useCallback } from 'react';

interface ZipLookupResult {
  city: string;
  state: string;
  stateAbbr: string;
}

interface UseZipLookupReturn {
  lookup: (zip: string) => Promise<ZipLookupResult | null>;
  isLoading: boolean;
  error: string | null;
}

// Cache to avoid repeated API calls for the same zip
const zipCache = new Map<string, ZipLookupResult>();

export function useZipLookup(): UseZipLookupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (zip: string): Promise<ZipLookupResult | null> => {
    // Clean the zip code - only digits, 5 characters
    const cleanZip = zip.replace(/\D/g, '').slice(0, 5);

    if (cleanZip.length !== 5) {
      return null;
    }

    // Check cache first
    if (zipCache.has(cleanZip)) {
      return zipCache.get(cleanZip)!;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Invalid zip code');
          return null;
        }
        throw new Error('Failed to lookup zip code');
      }

      const data = await response.json();

      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        const result: ZipLookupResult = {
          city: place['place name'],
          state: place['state'],
          stateAbbr: place['state abbreviation'],
        };

        // Cache the result
        zipCache.set(cleanZip, result);

        return result;
      }

      return null;
    } catch (err) {
      setError('Failed to lookup zip code');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { lookup, isLoading, error };
}

// Standalone function for server-side or one-off lookups
export async function lookupZip(zip: string): Promise<ZipLookupResult | null> {
  const cleanZip = zip.replace(/\D/g, '').slice(0, 5);

  if (cleanZip.length !== 5) {
    return null;
  }

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        city: place['place name'],
        state: place['state'],
        stateAbbr: place['state abbreviation'],
      };
    }

    return null;
  } catch {
    return null;
  }
}
