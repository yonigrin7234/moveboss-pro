'use client';

import type { LoadDetailViewModel } from '@/lib/load-detail-model';
import { LoadDetailHeader } from './LoadDetailHeader';
import { LoadDetailRoute } from './LoadDetailRoute';
import { LoadDetailSizing } from './LoadDetailSizing';
import { LoadDetailAssignments } from './LoadDetailAssignments';
import { LoadDetailInstructions } from './LoadDetailInstructions';
import { LoadDetailMessaging } from './LoadDetailMessaging';

interface LoadDetailShellProps {
  model: LoadDetailViewModel;
  backHref: string;
  backLabel: string;
  /** Slot for context-specific actions (buttons, forms) */
  actionsSlot?: React.ReactNode;
  /** Slot for trip assignment form (passed to assignments) */
  tripAssignmentSlot?: React.ReactNode;
  /** Slot for additional sidebar content */
  sidebarSlot?: React.ReactNode;
  /** Slot for status update form */
  statusUpdateSlot?: React.ReactNode;
  /** Whether to use sidebar layout (default: true for carrier views) */
  useSidebarLayout?: boolean;
  /** Slot for content above messaging (e.g., photos, timeline) */
  beforeMessagingSlot?: React.ReactNode;
  /** Custom main content (replaces route + sizing + instructions) */
  mainContentSlot?: React.ReactNode;
}

export function LoadDetailShell({
  model,
  backHref,
  backLabel,
  actionsSlot,
  tripAssignmentSlot,
  sidebarSlot,
  statusUpdateSlot,
  useSidebarLayout = model.context !== 'owner',
  beforeMessagingSlot,
  mainContentSlot,
}: LoadDetailShellProps) {
  if (useSidebarLayout) {
    return (
      <div className="space-y-6">
        <LoadDetailHeader model={model} backHref={backHref} backLabel={backLabel} />

        {actionsSlot && <div className="flex flex-wrap gap-2">{actionsSlot}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {mainContentSlot ? (
              mainContentSlot
            ) : (
              <>
                <LoadDetailSizing model={model} />
                <LoadDetailRoute model={model} />
                <LoadDetailInstructions model={model} />
              </>
            )}

            {beforeMessagingSlot}

            {/* Messaging */}
            <LoadDetailMessaging model={model} />
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            {/* Pricing card is shown via LoadDetailSizing for carrier views */}

            {/* Trip Assignment */}
            <LoadDetailAssignments
              model={model}
              tripAssignmentSlot={tripAssignmentSlot}
            />

            {/* Status Update */}
            {statusUpdateSlot}

            {/* Additional sidebar content */}
            {sidebarSlot}
          </div>
        </div>
      </div>
    );
  }

  // Single-column layout (for owner view with form)
  return (
    <div className="space-y-6">
      <LoadDetailHeader model={model} backHref={backHref} backLabel={backLabel} />

      {actionsSlot && <div className="flex flex-wrap gap-2">{actionsSlot}</div>}

      {mainContentSlot ? (
        mainContentSlot
      ) : (
        <>
          <LoadDetailSizing model={model} />
          <LoadDetailRoute model={model} />
          <LoadDetailInstructions model={model} />
          <LoadDetailAssignments
            model={model}
            tripAssignmentSlot={tripAssignmentSlot}
          />
        </>
      )}

      {beforeMessagingSlot}

      {/* Messaging */}
      <LoadDetailMessaging model={model} />

      {sidebarSlot}
    </div>
  );
}
