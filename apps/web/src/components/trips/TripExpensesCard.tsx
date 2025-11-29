'use client';

import { useActionState, useState } from 'react';
import type { TripExpense, TripExpenseCategory } from '@/data/trips';
import { PhotoField } from '@/components/ui/photo-field';

export type TripExpenseFormState = {
  errors?: Record<string, string>;
  success?: boolean;
};

interface TripExpensesCardProps {
  tripId: string;
  expenses: TripExpense[];
  summary: {
    driver_pay_total: number;
    fuel_total: number;
    tolls_total: number;
    other_expenses_total: number;
  };
  onCreate: (
    prevState: TripExpenseFormState | null,
    formData: FormData
  ) => Promise<TripExpenseFormState | null>;
  onUpdate: (
    prevState: TripExpenseFormState | null,
    formData: FormData
  ) => Promise<TripExpenseFormState | null>;
  onDelete: (formData: FormData) => Promise<void>;
}

const categoryOptions: { value: TripExpenseCategory; label: string }[] = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'tolls', label: 'Tolls' },
  { value: 'driver_pay', label: 'Driver Pay' },
  { value: 'lumper', label: 'Lumper' },
  { value: 'parking', label: 'Parking' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

const paidByOptions = [
  { value: 'driver_personal', label: 'Driver personal' },
  { value: 'driver_cash', label: 'Driver cash' },
  { value: 'company_card', label: 'Company card' },
  { value: 'fuel_card', label: 'Fuel card' },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatDate(date: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface TripExpenseRowProps {
  expense: TripExpense;
  onUpdate: TripExpensesCardProps['onUpdate'];
  onDelete: TripExpensesCardProps['onDelete'];
}

function TripExpenseRow({ expense, onUpdate, onDelete }: TripExpenseRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(onUpdate, null);

  return (
    <tr>
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(expense.incurred_at)}</td>
      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap capitalize">{expense.category.replace('_', ' ')}</td>
      <td className="px-4 py-3 text-sm text-foreground" colSpan={isEditing ? 2 : 1}>
        {isEditing ? (
          <form action={formAction} className="space-y-2">
            <input type="hidden" name="expense_id" value={expense.id} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="sr-only" htmlFor={`edit-category-${expense.id}`}>
                  Category
                </label>
                <select
                  id={`edit-category-${expense.id}`}
                  name="category"
                  defaultValue={expense.category}
                  className="w-full px-2 py-1 border border-border rounded-md text-sm"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor={`edit-amount-${expense.id}`}>
                  Amount
                </label>
                <input
                  id={`edit-amount-${expense.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  defaultValue={expense.amount}
                  className="w-full px-2 py-1 border border-border rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="sr-only" htmlFor={`edit-date-${expense.id}`}>
                  Date
                </label>
                <input
                  id={`edit-date-${expense.id}`}
                  type="date"
                  name="incurred_at"
                  defaultValue={expense.incurred_at}
                  className="w-full px-2 py-1 border border-border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor={`edit-description-${expense.id}`}>
                  Description
                </label>
                <input
                  id={`edit-description-${expense.id}`}
                  type="text"
                  name="description"
                  defaultValue={expense.description || ''}
                  placeholder="Description"
                  className="w-full px-2 py-1 border border-border rounded-md text-sm"
                />
              </div>
              </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="sr-only" htmlFor={`edit-expense-type-${expense.id}`}>
                  Expense type
                </label>
                <input
                  id={`edit-expense-type-${expense.id}`}
                  type="text"
                  name="expense_type"
                  defaultValue={(expense as any).expense_type || ''}
                  placeholder="Expense type"
                  className="w-full px-2 py-1 border border-border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor={`edit-paid-by-${expense.id}`}>
                  Paid by
                </label>
                <select
                  id={`edit-paid-by-${expense.id}`}
                  name="paid_by"
                  defaultValue={(expense as any).paid_by || ''}
                  className="w-full px-2 py-1 border border-border rounded-md text-sm"
                >
                  <option value="">Paid by</option>
                  {paidByOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
              <div className="space-y-2">
              <PhotoField
                name="receipt_photo_url"
                label="Receipt photo"
                required
                defaultValue={(expense as any).receipt_photo_url || ''}
                className="p-0"
                description="Upload or capture the receipt"
              />
              </div>
            <div className="space-y-2">
              <label className="sr-only" htmlFor={`edit-notes-${expense.id}`}>
                Notes
              </label>
              <textarea
                id={`edit-notes-${expense.id}`}
                name="notes"
                defaultValue={(expense as any).notes || ''}
                placeholder="Notes"
                className="w-full px-2 py-1 border border-border rounded-md text-sm"
                rows={2}
              />
            </div>
            {state?.errors && (
              <p className="text-xs text-red-600">
                {Object.values(state.errors)[0]}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs disabled:opacity-50"
              >
                {pending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 border border-border text-foreground rounded-md text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-1">
            <div className="text-sm text-foreground">{expense.description || '—'}</div>
            <div className="text-xs text-muted-foreground">{currencyFormatter.format(expense.amount)}</div>
            <div className="text-xs text-muted-foreground">
              {((expense as any).paid_by || 'payer not set')} · {((expense as any).expense_type || 'type not set')}
            </div>
            <div className="text-xs text-muted-foreground break-all">
              Receipt: {(expense as any).receipt_photo_url || '—'}
            </div>
          </div>
        )}
      </td>
      {!isEditing && (
        <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-foreground">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-primary hover:text-primary/80 font-medium mr-4"
          >
            Edit
          </button>
          <form
            className="inline"
            action={onDelete}
            onSubmit={(event) => {
              if (!confirm('Delete this expense?')) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="expense_id" value={expense.id} />
            <button type="submit" className="text-red-600 hover:text-destructive font-medium">
              Delete
            </button>
          </form>
        </td>
      )}
    </tr>
  );
}

export function TripExpensesCard({
  tripId,
  expenses,
  summary,
  onCreate,
  onUpdate,
  onDelete,
}: TripExpensesCardProps) {
  const [state, formAction, pending] = useActionState(onCreate, null);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Capture every dollar spent on this trip for true profitability.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-muted-foreground tracking-wide">Total Expenses</div>
          <div className="text-lg font-semibold text-foreground">
            {currencyFormatter.format(
              (summary.driver_pay_total || 0) +
                (summary.fuel_total || 0) +
                (summary.tolls_total || 0) +
                (summary.other_expenses_total || 0)
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground">Driver Pay</div>
          <div className="text-base font-semibold text-foreground">
            {currencyFormatter.format(summary.driver_pay_total || 0)}
          </div>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground">Fuel</div>
          <div className="text-base font-semibold text-foreground">
            {currencyFormatter.format(summary.fuel_total || 0)}
          </div>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground">Tolls</div>
          <div className="text-base font-semibold text-foreground">
            {currencyFormatter.format(summary.tolls_total || 0)}
          </div>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground">Other</div>
          <div className="text-base font-semibold text-foreground">
            {currencyFormatter.format(summary.other_expenses_total || 0)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No expenses recorded yet.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <TripExpenseRow
                  key={expense.id}
                  expense={expense}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">Add Expense</h3>
        {state?.errors?._form && (
          <div className="bg-destructive/10 border-destructive rounded-lg p-3 text-sm text-destructive mb-4">
            {state.errors._form}
          </div>
        )}
        {state?.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
            Expense added.
          </div>
        )}
        <form action={formAction} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input type="hidden" name="trip_id" value={tripId} />
          <div>
            <label htmlFor="expense_category" className="block text-sm font-medium text-foreground mb-1">
              Category
            </label>
            <select
              id="expense_category"
              name="category"
              defaultValue="fuel"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {state?.errors?.category && (
              <p className="text-xs text-red-600 mt-1">{state.errors.category}</p>
            )}
          </div>
          <div>
            <label htmlFor="expense_amount" className="block text-sm font-medium text-foreground mb-1">
              Amount
            </label>
            <input
              id="expense_amount"
              type="number"
              step="0.01"
              min="0"
              name="amount"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
            {state?.errors?.amount && (
              <p className="text-xs text-red-600 mt-1">{state.errors.amount}</p>
            )}
          </div>
          <div>
            <label htmlFor="expense_date" className="block text-sm font-medium text-foreground mb-1">
              Date
            </label>
            <input
              id="expense_date"
              type="date"
              name="incurred_at"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
            {state?.errors?.incurred_at && (
              <p className="text-xs text-red-600 mt-1">{state.errors.incurred_at}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="expense_description"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Description
            </label>
            <input
              id="expense_description"
              type="text"
              name="description"
              placeholder="Optional notes"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
            {state?.errors?.description && (
              <p className="text-xs text-red-600 mt-1">{state.errors.description}</p>
            )}
          </div>
          <div>
            <label htmlFor="expense_type" className="block text-sm font-medium text-foreground mb-1">
              Expense type
            </label>
            <input
              id="expense_type"
              type="text"
              name="expense_type"
              placeholder="fuel, repair, etc."
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
          <div>
            <label htmlFor="expense_paid_by" className="block text-sm font-medium text-foreground mb-1">
              Paid by
            </label>
            <select
              id="expense_paid_by"
              name="paid_by"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            >
              <option value="">Select</option>
              {paidByOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {state?.errors?.paid_by && (
              <p className="text-xs text-red-600 mt-1">{state.errors.paid_by}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <PhotoField
              name="receipt_photo_url"
              label="Receipt photo (required)"
              required
              description="Capture or upload the receipt image"
            />
            {state?.errors?.receipt_photo_url && (
              <p className="text-xs text-red-600 mt-1">{state.errors.receipt_photo_url}</p>
            )}
          </div>
          <div className="md:col-span-5">
            <label htmlFor="expense_notes" className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <textarea
              id="expense_notes"
              name="notes"
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
              placeholder="Optional notes"
            />
            {state?.errors?.notes && (
              <p className="text-xs text-red-600 mt-1">{state.errors.notes}</p>
            )}
          </div>
          <div className="md:col-span-5 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
