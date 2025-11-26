import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Building2, User, Phone, MapPin, Package, ChevronLeft } from "lucide-react";

import {
  driverAcceptLoad,
  driverStartLoading,
  driverFinishLoading,
  driverCompleteLoadDetails,
  driverSetStorageDrop,
  driverStartDelivery,
  driverCompleteDelivery,
  getDriverLoadDetail,
  requireCurrentDriver,
} from "@/data/driver-workflow";
import { LoadFinancialSummary } from "@/components/driver/driver-load-forms";
import { PreDeliveryCheckCard } from "@/components/driver/pre-delivery-check-card";
import {
  AcceptLoadCard,
  StartLoadingCard,
  FinishLoadingCard,
  CompleteLoadDetailsCard,
  StorageDropCard,
  ReadyForDeliveryCard,
  CompleteDeliveryCard,
  DeliveryCompleteCard,
} from "@/components/driver/driver-load-workflow-cards";
import type { DriverFormState } from "@/components/driver/driver-trip-forms";

interface DriverLoadPageProps {
  params: Promise<{ id: string; loadId: string }>;
}

const statusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  loading: "bg-purple-100 text-purple-800",
  loaded: "bg-green-100 text-green-800",
  in_transit: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  storage_completed: "bg-purple-100 text-purple-800",
};

function formatAddress(company: any): string | null {
  if (!company?.address && !company?.city) return null;
  const parts = [company.address, company.city, company.state, company.zip].filter(Boolean);
  return parts.join(", ");
}

function getMapsUrl(company: any): string | null {
  const address = formatAddress(company);
  if (!address) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

export default async function DriverLoadPage({ params }: DriverLoadPageProps) {
  const { id, loadId } = await params;

  let driver: Awaited<ReturnType<typeof requireCurrentDriver>> | null = null;
  try {
    driver = await requireCurrentDriver();
  } catch (error) {
    console.error("[DriverLoadPage] Failed to load current driver", error);
    notFound();
  }
  if (!driver?.owner_id) notFound();

  const loadDetail = await getDriverLoadDetail(loadId, { id: driver.id, owner_id: driver.owner_id });
  if (!loadDetail) notFound();
  const { load, tripId, loadOrder } = loadDetail;

  // Server Actions
  const acceptAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      await driverAcceptLoad(loadId, currentDriver.owner_id);
      revalidatePath(`/driver/trips/${id}/loads/${loadId}`);
      revalidatePath(`/driver/trips/${id}`);
      return { success: "Load accepted" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to accept load" };
    }
  };

  const startLoadingAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      const startingCuft = Number(formData.get("starting_cuft"));
      const loadingStartPhoto = formData.get("loading_start_photo") as string;
      if (!loadingStartPhoto) return { error: "Trailer photo before loading is required" };
      await driverStartLoading(loadId, currentDriver.owner_id, {
        starting_cuft: startingCuft || 0,
        loading_start_photo: loadingStartPhoto,
      });
      revalidatePath(`/driver/trips/${id}/loads/${loadId}`);
      revalidatePath(`/driver/trips/${id}`);
      return { success: "Loading started" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to start loading" };
    }
  };

  const finishLoadingAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      const endingCuft = Number(formData.get("ending_cuft"));
      if (!Number.isFinite(endingCuft) || endingCuft < 0) return { error: "Ending CUFT is required" };
      const loadingEndPhoto = formData.get("loading_end_photo") as string;
      if (!loadingEndPhoto) return { error: "Trailer photo after loading is required" };
      await driverFinishLoading(loadId, currentDriver.owner_id, {
        ending_cuft: endingCuft,
        loading_end_photo: loadingEndPhoto,
      });
      revalidatePath(`/driver/trips/${id}/loads/${loadId}`);
      revalidatePath(`/driver/trips/${id}`);
      return { success: "Loading finished" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to finish loading" };
    }
  };

  const completeDetailsAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      await driverCompleteLoadDetails(loadId, currentDriver.owner_id, {
        actual_cuft_loaded: Number(formData.get("actual_cuft_loaded")) || undefined,
        contract_rate_per_cuft: Number(formData.get("contract_rate_per_cuft")) || undefined,
        contract_accessorials_shuttle: Number(formData.get("contract_accessorials_shuttle")) || 0,
        contract_accessorials_stairs: Number(formData.get("contract_accessorials_stairs")) || 0,
        contract_accessorials_long_carry: Number(formData.get("contract_accessorials_long_carry")) || 0,
        contract_accessorials_bulky: Number(formData.get("contract_accessorials_bulky")) || 0,
        contract_accessorials_other: Number(formData.get("contract_accessorials_other")) || 0,
        balance_due_on_delivery: Number(formData.get("balance_due_on_delivery")) || 0,
        first_available_date: (formData.get("first_available_date") as string) || undefined,
        load_report_photo_url: (formData.get("load_report_photo_url") as string) || undefined,
      });
      revalidatePath(`/driver/trips/${id}/loads/${loadId}`);
      revalidatePath(`/driver/trips/${id}`);
      return { success: "Load details saved" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to save load details" };
    }
  };

  const storageAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      await driverSetStorageDrop(loadId, currentDriver.owner_id, {
        storage_drop: formData.get("storage_drop") === "on",
        storage_location_name: (formData.get("storage_location_name") as string) || undefined,
        storage_location_address: (formData.get("storage_location_address") as string) || undefined,
        storage_unit_number: (formData.get("storage_unit_number") as string) || undefined,
        storage_move_in_fee: Number(formData.get("storage_move_in_fee")) || undefined,
        storage_daily_fee: Number(formData.get("storage_daily_fee")) || undefined,
        storage_days_billed: Number(formData.get("storage_days_billed")) || undefined,
        storage_notes: (formData.get("storage_notes") as string) || undefined,
        company_approved_exception_delivery: formData.get("company_approved_exception_delivery") === "on",
      });
      revalidatePath(`/driver/trips/${id}/loads/${loadId}`);
      revalidatePath(`/driver/trips/${id}`);
      return { success: "Storage details saved" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to save storage info" };
    }
  };

  const startDeliveryAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      await driverStartDelivery(loadId, currentDriver.owner_id);
      revalidatePath(`/driver/trips/${id}/loads/${loadId}`);
      revalidatePath(`/driver/trips/${id}`);
      return { success: "Delivery started" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to start delivery" };
    }
  };

  const completeDeliveryAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };

      // Parse multi-photo fields from JSON
      const signedBolPhotos = JSON.parse((formData.get("signed_bol_photos") as string) || "[]");
      const signedInventoryPhotos = JSON.parse((formData.get("signed_inventory_photos") as string) || "[]");

      await driverCompleteDelivery(loadId, currentDriver.owner_id, {
        delivery_location_photo: (formData.get("delivery_location_photo") as string) || undefined,
        signed_bol_photos: signedBolPhotos,
        signed_inventory_photos: signedInventoryPhotos,
        collected_amount: Number(formData.get("collected_amount")) || 0,
        collection_method: (formData.get("collection_method") as string) || undefined,
        delivery_notes: (formData.get("delivery_notes") as string) || undefined,
      });
      revalidatePath(`/driver/trips/${id}/loads/${loadId}`);
      revalidatePath(`/driver/trips/${id}`);
      return { success: "Delivery completed" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to complete delivery" };
    }
  };

  const loadStatus = load.load_status || "pending";
  const company = Array.isArray((load as any)?.company) ? (load as any).company[0] : (load as any).company;
  const mapsUrl = getMapsUrl(company);
  const companyAddress = formatAddress(company);

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href={`/driver/trips/${tripId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to trip
      </Link>

      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase text-muted-foreground">Load</p>
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
              #{loadOrder}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{load.load_number || loadId}</h1>
          <p className="text-sm text-muted-foreground">{company?.name || "Company n/a"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusTone[loadStatus] || "bg-gray-100 text-gray-800"}`}>
          {loadStatus.replace("_", " ")}
        </span>
      </div>

      {/* COMPANY CONTACT CARD */}
      {company && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">{company.name}</h3>
          </div>

          {company.dispatch_contact_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{company.dispatch_contact_name}</span>
            </div>
          )}

          {company.dispatch_contact_phone && (
            <a
              href={`tel:${company.dispatch_contact_phone}`}
              className="flex items-center justify-between gap-2 text-sm rounded-md border border-border bg-muted/30 p-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="font-medium">{company.dispatch_contact_phone}</span>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                Tap to call
              </span>
            </a>
          )}

          {companyAddress && mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 text-sm rounded-md border border-border bg-muted/30 p-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{companyAddress}</span>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                Tap to navigate
              </span>
            </a>
          )}
        </div>
      )}

      {/* LOAD DETAILS CARD */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Load Details</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Est. CUFT</p>
            <p className="font-medium">{load.cubic_feet || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Rate/CUFT</p>
            <p className="font-medium">${load.rate_per_cuft || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Origin</p>
            <p className="font-medium">{load.loading_city || load.pickup_city || "—"}, {load.loading_state || load.pickup_state || ""}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Destination</p>
            <p className="font-medium">{load.delivery_city || load.dropoff_city || "—"}, {load.delivery_state || load.dropoff_state || ""}</p>
          </div>
        </div>
      </div>

      {/* LOAD FINANCIAL SUMMARY */}
      <LoadFinancialSummary load={load} />

      {/* PRE-DELIVERY CHECK (only for loaded status) */}
      <PreDeliveryCheckCard load={load} company={company} />

      {/* WORKFLOW ACTIONS - conditional based on status */}

      {/* Status: pending - Accept Load */}
      {loadStatus === "pending" && (
        <AcceptLoadCard loadId={loadId} action={acceptAction} />
      )}

      {/* Status: accepted - Start Loading */}
      {loadStatus === "accepted" && (
        <StartLoadingCard loadId={loadId} action={startLoadingAction} />
      )}

      {/* Status: loading - Finish Loading */}
      {loadStatus === "loading" && (
        <FinishLoadingCard
          loadId={loadId}
          action={finishLoadingAction}
          startingCuft={load.starting_cuft}
        />
      )}

      {/* Status: loaded - Complete Load Details + Start Delivery */}
      {loadStatus === "loaded" && (
        <>
          <CompleteLoadDetailsCard
            loadId={loadId}
            action={completeDetailsAction}
            defaults={load}
          />
          <ReadyForDeliveryCard
            loadId={loadId}
            action={startDeliveryAction}
            defaults={load}
          />
        </>
      )}

      {/* Status: in_transit - Complete Delivery with signed docs */}
      {loadStatus === "in_transit" && (
        <CompleteDeliveryCard
          loadId={loadId}
          action={completeDeliveryAction}
          defaults={load}
        />
      )}

      {/* Status: delivered - Read-only summary */}
      {loadStatus === "delivered" && (
        <DeliveryCompleteCard defaults={load} />
      )}

      {/* STORAGE DROP SECTION - always visible but conditionally expands */}
      {loadStatus !== "delivered" && loadStatus !== "storage_completed" && loadStatus !== "in_transit" && (
        <StorageDropCard
          loadId={loadId}
          action={storageAction}
          defaults={load}
        />
      )}
    </div>
  );
}
