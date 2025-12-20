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
  // Compliance documents
  cdl_document_url: string | null;
  cdl_expiry: string | null;
  medical_card_document_url: string | null;
  medical_card_expiry: string | null;
  mvr_document_url: string | null;
  mvr_expiry: string | null;
  drug_test_document_url: string | null;
  drug_test_expiry: string | null;
  twic_document_url: string | null;
  twic_card_expiry: string | null;
  hazmat_document_url: string | null;
  hazmat_expiry: string | null;
  hazmat_endorsement: boolean | null;
}

interface CompanyInfo {
  id: string;
  name: string;
  dot_number: string | null;
  mc_number: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  // Insurance documents
  cargo_insurance_document_url: string | null;
  cargo_insurance_expiry: string | null;
  liability_insurance_document_url: string | null;
  liability_insurance_expiry: string | null;
  workers_comp_document_url: string | null;
  workers_comp_expiry: string | null;
  // Authority documents
  authority_document_url: string | null;
  authority_expiry: string | null;
  ucr_document_url: string | null;
  ucr_expiry: string | null;
  boc3_document_url: string | null;
}

interface UseVehicleDocumentsReturn {
  truck: TruckWithDocuments | null;
  trailer: TrailerWithDocuments | null;
  driver: DriverInfo | null;
  company: CompanyInfo | null;
  driverDocuments: VehicleDocument[];
  companyDocuments: VehicleDocument[];
  isLoading: boolean;
  error: string | null;
  hasActiveTrip: boolean;
  hasPlannedTrip: boolean;
  tripNumber: number | null;
  tripStatus: string | null;
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

function getDriverDocuments(driver: DriverInfo): VehicleDocument[] {
  const docs: VehicleDocument[] = [
    {
      type: 'license' as DocumentType,
      label: 'CDL License',
      url: driver.cdl_document_url,
      expiry: driver.cdl_expiry,
      status: getDocumentStatus(driver.cdl_document_url, driver.cdl_expiry),
    },
    {
      type: 'medical' as DocumentType,
      label: 'Medical Card',
      url: driver.medical_card_document_url,
      expiry: driver.medical_card_expiry,
      status: getDocumentStatus(driver.medical_card_document_url, driver.medical_card_expiry),
    },
    {
      type: 'mvr' as DocumentType,
      label: 'MVR Report',
      url: driver.mvr_document_url,
      expiry: driver.mvr_expiry,
      status: getDocumentStatus(driver.mvr_document_url, driver.mvr_expiry),
    },
    {
      type: 'drug_test' as DocumentType,
      label: 'Drug Test',
      url: driver.drug_test_document_url,
      expiry: driver.drug_test_expiry,
      status: getDocumentStatus(driver.drug_test_document_url, driver.drug_test_expiry),
    },
  ];

  // Add TWIC if present
  if (driver.twic_document_url || driver.twic_card_expiry) {
    docs.push({
      type: 'twic' as DocumentType,
      label: 'TWIC Card',
      url: driver.twic_document_url,
      expiry: driver.twic_card_expiry,
      status: getDocumentStatus(driver.twic_document_url, driver.twic_card_expiry),
    });
  }

  // Add Hazmat if driver has endorsement
  if (driver.hazmat_endorsement) {
    docs.push({
      type: 'hazmat' as DocumentType,
      label: 'Hazmat Endorsement',
      url: driver.hazmat_document_url,
      expiry: driver.hazmat_expiry,
      status: getDocumentStatus(driver.hazmat_document_url, driver.hazmat_expiry),
    });
  }

  return docs;
}

function getCompanyDocuments(company: CompanyInfo): VehicleDocument[] {
  return [
    {
      type: 'cargo_insurance' as DocumentType,
      label: 'Cargo Insurance',
      url: company.cargo_insurance_document_url,
      expiry: company.cargo_insurance_expiry,
      status: getDocumentStatus(company.cargo_insurance_document_url, company.cargo_insurance_expiry),
    },
    {
      type: 'liability_insurance' as DocumentType,
      label: 'Liability Insurance',
      url: company.liability_insurance_document_url,
      expiry: company.liability_insurance_expiry,
      status: getDocumentStatus(company.liability_insurance_document_url, company.liability_insurance_expiry),
    },
    {
      type: 'workers_comp' as DocumentType,
      label: 'Workers Comp',
      url: company.workers_comp_document_url,
      expiry: company.workers_comp_expiry,
      status: getDocumentStatus(company.workers_comp_document_url, company.workers_comp_expiry),
    },
    {
      type: 'authority' as DocumentType,
      label: 'Operating Authority',
      url: company.authority_document_url,
      expiry: company.authority_expiry,
      status: getDocumentStatus(company.authority_document_url, company.authority_expiry),
    },
    {
      type: 'ucr' as DocumentType,
      label: 'UCR Registration',
      url: company.ucr_document_url,
      expiry: company.ucr_expiry,
      status: getDocumentStatus(company.ucr_document_url, company.ucr_expiry),
    },
    {
      type: 'boc3' as DocumentType,
      label: 'BOC-3',
      url: company.boc3_document_url,
      expiry: null, // BOC-3 doesn't expire
      status: company.boc3_document_url ? 'valid' : 'missing',
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
    hasPlannedTrip: boolean;
    tripNumber: number | null;
    tripStatus: string | null;
  }>({
    queryKey: ['vehicleDocuments', user?.id, driverId, ownerId],
    enabled: driverReady && !!driverId && !!ownerId,
    queryFn: async () => {
      if (driverError) throw new Error(driverError);
      if (!driverId || !ownerId) throw new Error('Driver profile not found');

      // Fetch driver with all compliance document fields
      const { data: driverData, error: driverDataError } = await supabase
        .from('drivers')
        .select(`
          id, owner_id, first_name, last_name,
          license_number, license_state, license_expiry,
          cdl_document_url, cdl_expiry,
          medical_card_document_url, medical_card_expiry,
          mvr_document_url, mvr_expiry,
          drug_test_document_url, drug_test_expiry,
          twic_document_url, twic_card_expiry,
          hazmat_document_url, hazmat_expiry, hazmat_endorsement
        `)
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
        cdl_document_url: driverData.cdl_document_url,
        cdl_expiry: driverData.cdl_expiry || driverData.license_expiry,
        medical_card_document_url: driverData.medical_card_document_url,
        medical_card_expiry: driverData.medical_card_expiry,
        mvr_document_url: driverData.mvr_document_url,
        mvr_expiry: driverData.mvr_expiry,
        drug_test_document_url: driverData.drug_test_document_url,
        drug_test_expiry: driverData.drug_test_expiry,
        twic_document_url: driverData.twic_document_url,
        twic_card_expiry: driverData.twic_card_expiry,
        hazmat_document_url: driverData.hazmat_document_url,
        hazmat_expiry: driverData.hazmat_expiry,
        hazmat_endorsement: driverData.hazmat_endorsement,
      };

      // Fetch company with all document fields
      const { data: companyData } = await supabase
        .from('companies')
        .select(`
          id, name, dot_number, mc_number, phone, city, state,
          cargo_insurance_document_url, cargo_insurance_expiry,
          liability_insurance_document_url, liability_insurance_expiry,
          workers_comp_document_url, workers_comp_expiry,
          authority_document_url, authority_expiry,
          ucr_document_url, ucr_expiry,
          boc3_document_url
        `)
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
            cargo_insurance_document_url: companyData.cargo_insurance_document_url,
            cargo_insurance_expiry: companyData.cargo_insurance_expiry,
            liability_insurance_document_url: companyData.liability_insurance_document_url,
            liability_insurance_expiry: companyData.liability_insurance_expiry,
            workers_comp_document_url: companyData.workers_comp_document_url,
            workers_comp_expiry: companyData.workers_comp_expiry,
            authority_document_url: companyData.authority_document_url,
            authority_expiry: companyData.authority_expiry,
            ucr_document_url: companyData.ucr_document_url,
            ucr_expiry: companyData.ucr_expiry,
            boc3_document_url: companyData.boc3_document_url,
          }
        : null;

      // Look for active or planned trips (include 'planned' for viewing)
      const { data: tripData } = await supabase
        .from('trips')
        .select('id, trip_number, truck_id, trailer_id, status')
        .eq('driver_id', driverId)
        .eq('owner_id', ownerId)
        .in('status', ['planned', 'assigned', 'active', 'en_route'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!tripData) {
        return {
          truck: null,
          trailer: null,
          driver: driverInfo,
          company: companyInfo,
          hasActiveTrip: false,
          hasPlannedTrip: false,
          tripNumber: null,
          tripStatus: null,
        };
      }

      const isPlanned = tripData.status === 'planned';
      const isActive = ['assigned', 'active', 'en_route'].includes(tripData.status);

      let truckResult: TruckWithDocuments | null = null;
      if (tripData.truck_id) {
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
          .eq('id', tripData.truck_id)
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
      if (tripData.trailer_id) {
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
          .eq('id', tripData.trailer_id)
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
        hasActiveTrip: isActive,
        hasPlannedTrip: isPlanned,
        tripNumber: tripData.trip_number,
        tripStatus: tripData.status,
      };
    },
  });

  const truck = documentsQuery.data?.truck || null;
  const trailer = documentsQuery.data?.trailer || null;
  const driver = documentsQuery.data?.driver || null;
  const company = documentsQuery.data?.company || null;
  const hasActiveTrip = documentsQuery.data?.hasActiveTrip || false;
  const hasPlannedTrip = documentsQuery.data?.hasPlannedTrip || false;
  const tripNumber = documentsQuery.data?.tripNumber || null;
  const tripStatus = documentsQuery.data?.tripStatus || null;

  // Get driver and company documents
  const driverDocuments = useMemo(() => (driver ? getDriverDocuments(driver) : []), [driver]);
  const companyDocuments = useMemo(() => (company ? getCompanyDocuments(company) : []), [company]);

  // Count expiring/expired across all document types
  const allDocuments = useMemo(
    () => [
      ...(truck?.documents || []),
      ...(trailer?.documents || []),
      ...driverDocuments,
      ...companyDocuments,
    ],
    [truck, trailer, driverDocuments, companyDocuments],
  );

  const expiringCount = useMemo(
    () => allDocuments.filter((doc) => doc.status === 'expiring').length,
    [allDocuments],
  );

  const expiredCount = useMemo(
    () => allDocuments.filter((doc) => doc.status === 'expired').length,
    [allDocuments],
  );

  const isLoading = driverLoading || documentsQuery.isLoading;
  const error = driverError || (documentsQuery.error ? (documentsQuery.error as Error).message : null);

  return useMemo(
    () => ({
      truck,
      trailer,
      driver,
      company,
      driverDocuments,
      companyDocuments,
      isLoading,
      error,
      hasActiveTrip,
      hasPlannedTrip,
      tripNumber,
      tripStatus,
      refetch: async () => {
        await documentsQuery.refetch();
      },
      expiringCount,
      expiredCount,
    }),
    [truck, trailer, driver, company, driverDocuments, companyDocuments, isLoading, error, hasActiveTrip, hasPlannedTrip, tripNumber, tripStatus, documentsQuery.refetch, expiringCount, expiredCount],
  );
}
