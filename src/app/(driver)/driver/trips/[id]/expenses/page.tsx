import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  getDriverTripDetail,
  requireCurrentDriver,
  getDriverDbClientForActions,
} from "@/data/driver-workflow";
import { createTripExpense, deleteTripExpense } from "@/data/trips";
import { DriverExpenseForm } from "@/components/driver/driver-expense-form";
import type { DriverFormState } from "@/components/driver/driver-trip-forms";

interface DriverTripExpensesPageProps {
  params: Promise<{ id: string }>;
}

export default async function DriverTripExpensesPage({ params }: DriverTripExpensesPageProps) {
  const { id } = await params;
  const driver = await requireCurrentDriver();
  if (!driver?.owner_id) notFound();

  const detail = await getDriverTripDetail(id, { id: driver.id, owner_id: driver.owner_id });
  if (!detail?.trip) notFound();
  const expenses = detail.expenses;

  const addExpenseAction = async (prev: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const tripId = formData.get("trip_id");
      if (typeof tripId !== "string") return { error: "Missing trip" };
      const tripCheck = await getDriverTripDetail(tripId, {
        id: currentDriver.id,
        owner_id: currentDriver.owner_id,
      });
      if (!tripCheck?.trip) return { error: "Trip not found" };
      const amount = Number(formData.get("amount"));
      if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount is required" };
      const expenseType = (formData.get("expense_type") as string) || "other";
      const receiptUrl = formData.get("receipt_photo_url");
      if (typeof receiptUrl !== "string" || receiptUrl.length === 0) {
        return { error: "Receipt photo is required" };
      }

      const paidBy = formData.get("paid_by") as string | null;
      const notes = (formData.get("notes") as string) || undefined;
      const incurredAt = (formData.get("incurred_at") as string) || undefined;

      const category =
        expenseType === "fuel"
          ? "fuel"
          : expenseType === "tolls"
            ? "tolls"
            : expenseType === "driver_pay"
              ? "driver_pay"
              : "other";

      const supabase = await getDriverDbClientForActions();
      await createTripExpense(
        {
          trip_id: tripId,
          category,
          description: expenseType,
          amount,
          incurred_at: incurredAt,
          expense_type: expenseType,
          paid_by: (paidBy as any) || undefined,
          receipt_photo_url: receiptUrl,
          notes,
        },
        currentDriver.owner_id,
        supabase
      );

      revalidatePath(`/driver/trips/${tripId}/expenses`);
      revalidatePath(`/driver/trips/${tripId}`);
      return { success: "Expense saved" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to save expense" };
    }
  };

  const deleteExpenseAction = async (formData: FormData) => {
    "use server";
    const expenseId = formData.get("expense_id");
    if (typeof expenseId !== "string") return;
    const currentDriver = await requireCurrentDriver();
    if (!currentDriver?.owner_id) return;
    const tripCheck = await getDriverTripDetail(id, {
      id: currentDriver.id,
      owner_id: currentDriver.owner_id,
    });
    if (!tripCheck?.trip) return;
    const supabase = await getDriverDbClientForActions();
    await deleteTripExpense(expenseId, currentDriver.owner_id, supabase);
    revalidatePath(`/driver/trips/${id}/expenses`);
    revalidatePath(`/driver/trips/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Trip</p>
          <h1 className="text-2xl font-semibold text-foreground">{detail.trip.trip_number}</h1>
          <p className="text-sm text-muted-foreground">{expenses.length} expense{expenses.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <DriverExpenseForm tripId={id} action={addExpenseAction} />

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-3">Existing expenses</h3>
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              No expenses yet.
            </div>
          ) : (
            expenses.map((exp) => (
              <div key={exp.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">${Number(exp.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {(exp as any).expense_type || exp.category}
                  </p>
                  <p className="text-xs text-muted-foreground">Paid by: {(exp as any).paid_by || "n/a"}</p>
                  <a
                    href={(exp as any).receipt_photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline-offset-2 hover:underline break-all"
                  >
                    Receipt
                  </a>
                </div>
                <form action={deleteExpenseAction}>
                  <input type="hidden" name="expense_id" value={exp.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-muted"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
