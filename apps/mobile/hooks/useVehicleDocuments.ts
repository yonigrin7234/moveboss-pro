import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { Truck, Trailer, VehicleDocument, DocumentStatus, DocumentType } from '../types';

interface TruckWithDocuments {
  id: string;
  unit_number: string;
  year: number | null;
  make: string | null;
  model: string | null;
  plate_number: string | null;
  plate_state: string | null;
  documents: VehicleDocument[];
}

interface TrailerWithDocuments {
  id: string;
  unit_number: string;
  capacity_cuft: number | null;
  plate_number: string | null;
  plate_state: string | null;
  documents: VehicleDocument[];
}

interface UseVehicleDocumentsReturn {
  truck: TruckWithDocuments | null;
  trailer: TrailerWithDocuments | null;
  isLoading: boolean;
  error: string | null;
  hasActiveTrip: boolean;
  tripNumber: number | null;
  refetch: () => Promise<void>;
  expiringCount: number;
  expiredCount: number;
}

/**
 * Calculate document status based on expiry date
 */
function getDocumentStatus(url: string | null, expiry: string | null): DocumentStatus {
  if (!url) return 'missing';
  if (!expiry) return 'valid'; // If no expiry but has URL, assume valid

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(expiry);
  expiryDate.setHours(0, 0, 0, 0);

  if (expiryDate < today) return 'expired';

  // Check if expiring within 30 days
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expiryDate <= thirtyDaysFromNow) return 'expiring';

  return 'valid';
}

/**
 * Transform truck data into documents array
 */
function getTruckDocuments(truck: Truck): VehicleDocument[] {
  return [
    {
      type: 'registration' as DocumentType,
      label: 'Registration',
      url: truck.registration_photo_url,
      expiry: truck.registration_expiry,
      status: getDocumentStatus(truck.registration_photo_url, truck.registration_expiry),
    },
    {
      type: 'insurance' as DocumentType,
      label: 'Insurance',
      url: truck.insurance_photo_url,
      expiry: truck.insurance_expiry,
      status: getDocumentStatus(truck.insurance_photo_url, truck.insurance_expiry),
    },
    {
      type: 'ifta' as DocumentType,
      label: 'IFTA Permit',
      url: truck.ifta_photo_url,
      expiry: truck.ifta_expiry,
      status: getDocumentStatus(truck.ifta_photo_url, truck.ifta_expiry),
    },
    {
      type: 'inspection' as DocumentType,
      label: 'Inspection',
      url: truck.inspection_photo_url,
      expiry: truck.inspection_expiry,
      status: getDocumentStatus(truck.inspection_photo_url, truck.inspection_expiry),
    },
    {
      type: 'permit' as DocumentType,
      label: 'Operating Permit',
      url: truck.permit_photo_url,
      expiry: truck.permit_expiry,
      status: getDocumentStatus(truck.permit_photo_url, truck.permit_expiry),
    },
  ];
}

/**
 * Transform trailer data into documents array
 */
function getTrailerDocuments(trailer: Trailer): VehicleDocument[] {
  return [
    {
      type: 'registration' as DocumentType,
      label: 'Registration',
      url: trailer.registration_photo_url,
      expiry: trailer.registration_expiry,
      status: getDocumentStatus(trailer.registration_photo_url, trailer.registration_expiry),
    },
    {
      type: 'inspection' as DocumentType,
      label: 'Inspection',
      url: trailer.inspection_photo_url,
      expiry: trailer.inspection_expiry,
      status: getDocumentStatus(trailer.inspection_photo_url, trailer.inspection_expiry),
    },
  ];
}

export function useVehicleDocuments(): UseVehicleDocumentsReturn {
  const { user } = useAuth();
  const [truck, setTruck] = useState<TruckWithDocuments | null>(null);
  const [trailer, setTrailer] = useState<TrailerWithDocuments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveTrip, setHasActiveTrip] = useState(false);
  const [tripNumber, setTripNumber] = useState<number | null>(null);

  const fetchVehicleDocuments = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First, get driver ID for current user
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        setIsLoading(false);
        setHasActiveTrip(false);
        return;
      }

      // Find active trip for this driver (assigned or in_progress)
      const { data: activeTrip, error: tripError } = await supabase
        .from('trips')
        .select('id, trip_number, truck_id, trailer_id')
        .eq('driver_id', driver.id)
        .eq('owner_id', driver.owner_id)
        .in('status', ['assigned', 'active', 'en_route'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tripError || !activeTrip) {
        setIsLoading(false);
        setHasActiveTrip(false);
        setTruck(null);
        setTrailer(null);
        setTripNumber(null);
        return;
      }

      setHasActiveTrip(true);
      setTripNumber(activeTrip.trip_number);

      // Fetch truck details if assigned
      if (activeTrip.truck_id) {
        const { data: truckData, error: truckError } = await supabase
          .from('trucks')
          .select(`
            id,
            unit_number,
            year,
            make,
            model,
            plate_number,
            plate_state,
            registration_photo_url,
            registration_expiry,
            insurance_photo_url,
            insurance_expiry,
            ifta_photo_url,
            ifta_expiry,
            inspection_photo_url,
            inspection_expiry,
            permit_photo_url,
            permit_expiry
          `)
          .eq('id', activeTrip.truck_id)
          .single();

        if (!truckError && truckData) {
          const documents = getTruckDocuments(truckData as Truck);
          setTruck({
            id: truckData.id,
            unit_number: truckData.unit_number,
            year: truckData.year,
            make: truckData.make,
            model: truckData.model,
            plate_number: truckData.plate_number,
            plate_state: truckData.plate_state,
            documents,
          });
        }
      } else {
        setTruck(null);
      }

      // Fetch trailer details if assigned
      if (activeTrip.trailer_id) {
        const { data: trailerData, error: trailerError } = await supabase
          .from('trailers')
          .select(`
            id,
            unit_number,
            capacity_cuft,
            plate_number,
            plate_state,
            registration_photo_url,
            registration_expiry,
            inspection_photo_url,
            inspection_expiry
          `)
          .eq('id', activeTrip.trailer_id)
          .single();

        if (!trailerError && trailerData) {
          const documents = getTrailerDocuments(trailerData as Trailer);
          setTrailer({
            id: trailerData.id,
            unit_number: trailerData.unit_number,
            capacity_cuft: trailerData.capacity_cuft,
            plate_number: trailerData.plate_number,
            plate_state: trailerData.plate_state,
            documents,
          });
        }
      } else {
        setTrailer(null);
      }
    } catch (err) {
      console.error('Error fetching vehicle documents:', err);
      setError('Failed to load vehicle documents');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVehicleDocuments();
  }, [fetchVehicleDocuments]);

  // Calculate expiring and expired counts
  const allDocuments = [
    ...(truck?.documents || []),
    ...(trailer?.documents || []),
  ];

  const expiringCount = allDocuments.filter(d => d.status === 'expiring').length;
  const expiredCount = allDocuments.filter(d => d.status === 'expired').length;

  return {
    truck,
    trailer,
    isLoading,
    error,
    hasActiveTrip,
    tripNumber,
    refetch: fetchVehicleDocuments,
    expiringCount,
    expiredCount,
  };
}
