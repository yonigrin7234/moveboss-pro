import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  driverMarkLoadDelivered,
  driverMarkLoadPickup,
  driverSetStorageDrop,
  getDriverLoadDetail,
  requireCurrentDriver,
} from "@/data/driver-workflow";
import { LoadDeliveryForm, LoadPickupForm, LoadStorageForm } from "@/components/driver/driver-load-forms";
import type { DriverFormState } from "@/components/driver/driver-trip-forms";

interface DriverLoadPageProps {
  params: { id: string; loadId: string };
}

const statusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  loaded: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  storage_completed: "bg-purple-100 text-purple-800",
};

export default async function DriverLoadPage({ params }: DriverLoadPageProps) {
  const driver = await requireCurrentDriver();
  if (!driver?.owner_id) notFound();

  const loadDetail = await getDriverLoadDetail(params.loadId, { id: driver.id, owner_id: driver.owner_id });
  if (!loadDetail) notFound();
  const { load, tripId } = loadDetail;

  const pickupAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      const actual = Number(formData.get("actual_cuft_loaded"));
      if (!Number.isFinite(actual) || actual <= 0) return { error: "Actual CUFT loaded is required" };
      const loadCheck = await getDriverLoadDetail(loadId, {
        id: currentDriver.id,
        owner_id: currentDriver.owner_id,
      });
      if (!loadCheck) return { error: "Load not found" };

      await driverMarkLoadPickup(loadId, currentDriver.owner_id, {
        actual_cuft_loaded: actual,
        contract_rate_per_cuft: Number(formData.get("contract_rate_per_cuft")) || 0,
        contract_accessorials_shuttle: Number(formData.get("contract_accessorials_shuttle")) || 0,
        contract_accessorials_stairs: Number(formData.get("contract_accessorials_stairs")) || 0,
        contract_accessorials_long_carry: Number(formData.get("contract_accessorials_long_carry")) || 0,
        contract_accessorials_bulky: Number(formData.get("contract_accessorials_bulky")) || 0,
        contract_accessorials_other: Number(formData.get("contract_accessorials_other")) || 0,
        balance_due_on_delivery: Number(formData.get("balance_due_on_delivery")) || 0,
        origin_arrival_at: (formData.get("origin_arrival_at") as string) || undefined,
        load_report_photo_url: (formData.get("load_report_photo_url") as string) || undefined,
      });

      revalidatePath(`/driver/trips/${params.id}/loads/${params.loadId}`);
      revalidatePath(`/driver/trips/${params.id}`);
      return { success: "Load marked as loaded" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to save load pickup" };
    }
  };

  const deliveryAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      const loadCheck = await getDriverLoadDetail(loadId, {
        id: currentDriver.id,
        owner_id: currentDriver.owner_id,
      });
      if (!loadCheck) return { error: "Load not found" };

      await driverMarkLoadDelivered(loadId, currentDriver.owner_id, {
        amount_collected_on_delivery: Number(formData.get("amount_collected_on_delivery")) || 0,
        amount_paid_directly_to_company: Number(formData.get("amount_paid_directly_to_company")) || 0,
        payment_method: (formData.get("payment_method") as any) || undefined,
        payment_method_notes: (formData.get("payment_method_notes") as string) || undefined,
        extra_shuttle: Number(formData.get("extra_shuttle")) || 0,
        extra_stairs: Number(formData.get("extra_stairs")) || 0,
        extra_long_carry: Number(formData.get("extra_long_carry")) || 0,
        extra_packing: Number(formData.get("extra_packing")) || 0,
        extra_bulky: Number(formData.get("extra_bulky")) || 0,
        extra_other: Number(formData.get("extra_other")) || 0,
        delivery_report_photo_url: (formData.get("delivery_report_photo_url") as string) || undefined,
      });

      revalidatePath(`/driver/trips/${params.id}/loads/${params.loadId}`);
      revalidatePath(`/driver/trips/${params.id}`);
      return { success: "Load marked as delivered" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to save delivery" };
    }
  };

  const storageAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const loadId = formData.get("load_id");
      if (typeof loadId !== "string") return { error: "Missing load" };
      const loadCheck = await getDriverLoadDetail(loadId, {
        id: currentDriver.id,
        owner_id: currentDriver.owner_id,
      });
      if (!loadCheck) return { error: "Load not found" };

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

      revalidatePath(`/driver/trips/${params.id}/loads/${params.loadId}`);
      revalidatePath(`/driver/trips/${params.id}`);
      return { success: "Storage details saved" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to save storage info" };
    }
  };

  const loadStatus = load.load_status || "pending";
  const company = Array.isArray((load as any)?.company) ? (load as any).company[0] : (load as any).company;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Load</p>
          <h1 className="text-2xl font-semibold text-foreground">{load.load_number || params.loadId}</h1>
          <p className="text-sm text-muted-foreground">{company?.name || "Company n/a"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[loadStatus] || ""}`}>
          {loadStatus.replace("_", " ")}
        </span>
      </div>

      {loadStatus === "pending" || loadStatus === "loaded" ? (
        <LoadPickupForm loadId={params.loadId} action={pickupAction} defaults={load} />
      ) : null}

      {loadStatus === "loaded" ? (
        <LoadDeliveryForm loadId={params.loadId} action={deliveryAction} defaults={load} />
      ) : null}

      <LoadStorageForm loadId={params.loadId} action={storageAction} defaults={load} />
    </div>
  );
}
