import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useDriver } from '../providers/DriverProvider';
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

interface DriverInfo {
  id: string;
  first_name: string;
  last_name: string;
  cdl_number: string | null;
  cdl_state: string | null;
}

interface CompanyInfo {
  id: string;
  name: string;
  dot_number: string | null;
  mc_number: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

interface UseVehicleDocumentsReturn {
  truck: TruckWithDocuments | null;
  trailer: TrailerWithDocuments | null;
  driver: DriverInfo | null;
  company: CompanyInfo | null;
  isLoading: boolean;
  error: string | null;
  hasActiveTrip: boolean;
  tripNumber: number | null;
  refetch: () => Promise<void>;
  expiringCount: number;
  expiredCount: number;
}

function getDocumentStatus(url: string | null, expiry: string | null): DocumentStatus {
  if (!url) return 'missing';
  if (!expiry) return 'valid';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(expiry);
  expiryDate.setHours(0, 0, 0, 0);

  if (expiryDate < today) return 'expired';

  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expiryDate <= thirtyDaysFromNow) return 'expiring';

  return 'valid';
}

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
  const { driverId, ownerId, loading: driverLoading, error: driverError, isReady: driverReady } = useDriver();

  const documentsQuery = useQuery<{
    truck: TruckWithDocuments | null;
    trailer: TrailerWithDocuments | null;
    driver: DriverInfo | null;
    company: CompanyInfo | null;
    hasActiveTrip: boolean;
    tripNumber: number | null;
  }>({
    queryKey: ['vehicleDocuments', user?.id, driverId, ownerId],
    enabled: driverReady && !!driverId && !!ownerId,
    queryFn: async () => {
      if (driverError) throw new Error(driverError);
      if (!driverId || !ownerId) throw new Error('Driver profile not found');

      const { data: driverData, error: driverDataError } = await supabase
        .from('drivers')
        .select('id, owner_id, first_name, last_name, license_number, license_state')
        .eq('id', driverId)
        .eq('owner_id', ownerId)
        .single();

      if (driverDataError || !driverData) {
        throw driverDataError || new Error('Driver profile not found');
      }

      const driverInfo: DriverInfo = {
        id: driverData.id,
        first_name: driverData.first_name,
        last_name: driverData.last_name,
        cdl_number: driverData.license_number,
        cdl_state: driverData.license_state,
      };

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, dot_number, mc_number, phone, city, state')
        .eq('owner_id', ownerId)
        .single();

      const companyInfo: CompanyInfo | null = companyData
        ? {
            id: companyData.id,
            name: companyData.name,
            dot_number: companyData.dot_number,
            mc_number: companyData.mc_number,
            phone: companyData.phone,
            city: companyData.city,
            state: companyData.state,
          }
        : null;

      const { data: activeTrip } = await supabase
        .from('trips')
        .select('id, trip_number, truck_id, trailer_id')
        .eq('driver_id', driverId)
        .eq('owner_id', ownerId)
        .in('status', ['assigned', 'active', 'en_route'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!activeTrip) {
        return {
          truck: null,
          trailer: null,
          driver: driverInfo,
          company: companyInfo,
          hasActiveTrip: false,
          tripNumber: null,
        };
      }

      let truckResult: TruckWithDocuments | null = null;
      if (activeTrip.truck_id) {
        const { data: truckData } = await supabase
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
          .eq('owner_id', ownerId)
          .single();

        if (truckData) {
          truckResult = {
            ...(truckData as Truck),
            documents: getTruckDocuments(truckData as Truck),
          };
        }
      }

      let trailerResult: TrailerWithDocuments | null = null;
      if (activeTrip.trailer_id) {
        const { data: trailerData } = await supabase
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
          .eq('owner_id', ownerId)
          .single();

        if (trailerData) {
          trailerResult = {
            ...(trailerData as Trailer),
            documents: getTrailerDocuments(trailerData as Trailer),
          };
        }
      }

      return {
        truck: truckResult,
        trailer: trailerResult,
        driver: driverInfo,
        company: companyInfo,
        hasActiveTrip: true,
        tripNumber: activeTrip.trip_number,
      };
    },
  });

  const truck = documentsQuery.data?.truck || null;
  const trailer = documentsQuery.data?.trailer || null;
  const driver = documentsQuery.data?.driver || null;
  const company = documentsQuery.data?.company || null;
  const hasActiveTrip = documentsQuery.data?.hasActiveTrip || false;
  const tripNumber = documentsQuery.data?.tripNumber || null;

  const expiringCount = useMemo(
    () => [...(truck?.documents || []), ...(trailer?.documents || [])].filter((doc) => doc.status === 'expiring').length,
    [truck, trailer],
  );

  const expiredCount = useMemo(
    () => [...(truck?.documents || []), ...(trailer?.documents || [])].filter((doc) => doc.status === 'expired').length,
    [truck, trailer],
  );

  const isLoading = driverLoading || documentsQuery.isLoading;
  const error = driverError || (documentsQuery.error ? (documentsQuery.error as Error).message : null);

  return useMemo(
    () => ({
      truck,
      trailer,
      driver,
      company,
      isLoading,
      error,
      hasActiveTrip,
      tripNumber,
      refetch: async () => {
        await documentsQuery.refetch();
      },
      expiringCount,
      expiredCount,
    }),
    [truck, trailer, driver, company, isLoading, error, hasActiveTrip, tripNumber, documentsQuery.refetch, expiringCount, expiredCount],
  );
}
