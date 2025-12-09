'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { LoadDetailShell } from '@/components/load-detail/LoadDetailShell';
import type { LoadDetailViewModel } from '@/lib/load-detail-model';
import { LoadForm } from '@/components/loads/LoadForm';
import { LoadPhotos } from '@/components/loads/LoadPhotos';
import { ActivityFeed } from '@/components/activity';
import { LoadActions, type MarketplacePostingData } from './load-actions';
import type { Load } from '@/data/loads';
import type { Company } from '@/data/companies';
import type { Driver } from '@/data/drivers';
import type { Truck, Trailer } from '@/data/fleet';
import type { AuditLogEntry } from '@/lib/audit';

interface Trip {
  id: string;
  trip_number: string;
  origin_city?: string | null;
  destination_city?: string | null;
  driver?: { first_name?: string; last_name?: string } | null;
}

interface LoadDetailClientProps {
  load: Load;
  model: LoadDetailViewModel;
  companies: Company[];
  drivers: Driver[];
  trucks: Truck[];
  trailers: Trailer[];
  trips: Trip[];
  auditLogs: AuditLogEntry[];
  canPostToMarketplace: boolean;
  isOwnCompanyLoad: boolean;
  initialFormData: Record<string, unknown>;
  // Server actions
  onUpdate: (
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string> } | null>;
  onPostToMarketplace: (data: MarketplacePostingData) => Promise<{ success: boolean; error?: string }>;
  onAssignToTrip: (tripId: string) => Promise<{ success: boolean; error?: string }>;
}

export function LoadDetailClient({
  load,
  model,
  companies,
  drivers,
  trucks,
  trailers,
  trips,
  auditLogs,
  canPostToMarketplace,
  isOwnCompanyLoad,
  initialFormData,
  onUpdate,
  onPostToMarketplace,
  onAssignToTrip,
}: LoadDetailClientProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Handle successful form submission - close sheet and refresh
  const handleFormSuccess = () => {
    setIsEditOpen(false);
    router.refresh();
  };

  // Wrap the server action to handle sheet close on success
  const handleUpdate = async (
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> => {
    const result = await onUpdate(prevState, formData);
    // If no errors, close the sheet (success case - redirect happens server-side)
    // Note: The redirect in the server action will handle navigation
    return result;
  };

  return (
    <>
      <LoadDetailShell
        model={model}
        backHref="/dashboard/loads"
        backLabel="Back to Loads"
        useSidebarLayout={true}
        actionsSlot={
          <div className="flex flex-wrap items-center gap-3">
            {/* Edit Button */}
            {model.permissions.canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit Load
              </Button>
            )}

            {/* External Company Badge */}
            {!isOwnCompanyLoad && (
              <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                External Company
              </span>
            )}

            {/* Load Actions: Post to Marketplace, Assign to Trip */}
            <LoadActions
              loadId={load.id}
              postingStatus={load.posting_status ?? null}
              initialCubicFeet={load.cubic_feet_estimate ?? (load as any).cubic_feet ?? null}
              canPostToMarketplace={canPostToMarketplace}
              trips={trips}
              onPostToMarketplace={onPostToMarketplace}
              onAssignToTrip={onAssignToTrip}
            />
          </div>
        }
        beforeMessagingSlot={
          <>
            {/* Trip Assignment Info */}
            {load.trip_id && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This load is assigned to a trip.{' '}
                  <a href={`/dashboard/trips/${load.trip_id}`} className="font-medium underline hover:no-underline">
                    View trip details
                  </a>
                </p>
              </div>
            )}

            {/* Driver-Uploaded Photos */}
            <LoadPhotos load={load} />
          </>
        }
        sidebarSlot={
          /* Activity Section */
          <ActivityFeed
            logs={auditLogs}
            currentEntityId={load.id}
            emptyMessage="No activity recorded yet. Changes to this load will appear here."
          />
        }
      />

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Edit Load</SheetTitle>
            <SheetDescription>
              Update load details, assignments, and pricing.
            </SheetDescription>
          </SheetHeader>

          <LoadForm
            initialData={initialFormData}
            companies={companies}
            drivers={drivers}
            trucks={trucks}
            trailers={trailers}
            onSubmit={handleUpdate}
            submitLabel="Save changes"
            cancelHref={`/dashboard/loads/${load.id}`}
            onCancel={() => setIsEditOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
