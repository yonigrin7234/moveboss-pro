'use client';

import { MessageSquare } from 'lucide-react';
import { LoadConversationPanel } from '@/components/messaging/LoadConversationPanel';
import type { LoadDetailViewModel } from '@/lib/load-detail-model';

interface LoadDetailMessagingProps {
  model: LoadDetailViewModel;
}

export function LoadDetailMessaging({ model }: LoadDetailMessagingProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Messages
      </h2>
      <LoadConversationPanel
        loadId={model.messagingProps.loadId}
        loadNumber={model.messagingProps.loadNumber}
        companyId={model.messagingProps.companyId}
        userId={model.messagingProps.userId}
        partnerCompanyId={model.messagingProps.partnerCompanyId}
        partnerCompanyName={model.messagingProps.partnerCompanyName}
        driverId={model.messagingProps.driverId}
        driverName={model.messagingProps.driverName}
      />
    </div>
  );
}
