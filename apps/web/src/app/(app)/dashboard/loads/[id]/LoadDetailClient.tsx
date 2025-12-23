'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, MessageSquare } from 'lucide-react';
import { useSingleEntityUnreadCount } from '@/hooks/useEntityUnreadCounts';
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
  const searchParams = useSearchParams();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { unreadCount } = useSingleEntityUnreadCount('load', load.id);

  const scrollToMessages = () => {
    const messagesSection = document.getElementById('messages-section');
    if (messagesSection) {
      messagesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to messages section if ?tab=messages is in the URL
  useEffect(() => {
    if (searchParams.get('tab') === 'messages') {
      // Small delay to ensure the page is rendered
      const timer = setTimeout(() => {
        scrollToMessages();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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
            {/* Messages Chip */}
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToMessages}
              className="gap-2 relative"
            >
              <MessageSquare className="h-4 w-4" />
              Messages
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

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
            compact
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
