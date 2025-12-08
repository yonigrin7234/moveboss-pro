'use client';

import { useState } from 'react';
import { MessageSquare, Users, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatPanel } from '@/components/messaging/unified';
import type { LoadDetailViewModel } from '@/lib/load-detail-model';

interface LoadDetailMessagingProps {
  model: LoadDetailViewModel;
}

export function LoadDetailMessaging({ model }: LoadDetailMessagingProps) {
  const { messagingProps } = model;
  const hasPartner = !!messagingProps.partnerCompanyId;
  const [activeTab, setActiveTab] = useState<'internal' | 'shared'>('internal');

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Messages
      </h2>

      {hasPartner ? (
        // Show tabs when there's a partner (internal + shared)
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'internal' | 'shared')}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="internal" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Internal
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Shared with {messagingProps.partnerCompanyName || 'Partner'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internal" className="mt-4">
            <ChatPanel
              context="load"
              loadId={messagingProps.loadId}
              companyId={messagingProps.companyId}
              userId={messagingProps.userId}
              isInternal={true}
              height={450}
            />
          </TabsContent>

          <TabsContent value="shared" className="mt-4">
            <ChatPanel
              context="load"
              loadId={messagingProps.loadId}
              companyId={messagingProps.companyId}
              userId={messagingProps.userId}
              partnerCompanyId={messagingProps.partnerCompanyId}
              partnerCompanyName={messagingProps.partnerCompanyName}
              isInternal={false}
              height={450}
            />
          </TabsContent>
        </Tabs>
      ) : (
        // Just internal chat when no partner
        <ChatPanel
          context="load"
          loadId={messagingProps.loadId}
          companyId={messagingProps.companyId}
          userId={messagingProps.userId}
          isInternal={true}
          height={450}
        />
      )}
    </div>
  );
}
