'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, User, Clock, Search, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatPanel } from '@/components/messaging/unified';
import type { ConversationListItem } from '@/lib/communication-types';
import type { Driver } from '@/data/drivers';

interface DispatchPageClientProps {
  drivers: Driver[];
  conversations: ConversationListItem[];
  companyId: string;
  userId: string;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DispatchPageClient({
  drivers,
  conversations,
  companyId,
  userId,
}: DispatchPageClientProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Find the selected driver
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  // Create a map of driver IDs to conversations for quick lookup
  const driverConversationMap = useMemo(() => {
    const map = new Map<string, ConversationListItem>();
    conversations.forEach((conv) => {
      // Prefer driver_id if available, fall back to driver_name
      if (conv.context?.driver_id) {
        map.set(conv.context.driver_id, conv);
      } else if (conv.context?.driver_name) {
        // Fall back to name-based lookup (legacy)
        map.set(conv.context.driver_name, conv);
      }
    });
    return map;
  }, [conversations]);

  // Filter drivers by search query
  const filteredDrivers = useMemo(() => {
    if (!searchQuery) return drivers;
    const query = searchQuery.toLowerCase();
    return drivers.filter((driver) => {
      const fullName = `${driver.first_name} ${driver.last_name}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [drivers, searchQuery]);

  // Calculate total unread count
  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  }, [conversations]);

  if (drivers.length === 0) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Dispatch Console</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Direct messaging with your drivers
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-10">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Drivers with Portal Access</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Driver messaging is available for drivers who have portal access enabled.
              Enable portal access for a driver to start messaging.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Dispatch Console</h1>
          {totalUnread > 0 && (
            <Badge variant="default" className="ml-2">
              {totalUnread} unread
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Direct messaging with your drivers
        </p>
      </div>

      {/* Main content - two column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Driver list */}
        <div className="w-[320px] border-r flex flex-col bg-background">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Driver list */}
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredDrivers.map((driver) => {
                const fullName = `${driver.first_name} ${driver.last_name}`;
                // Look up by driver.id first, then fall back to fullName for legacy data
                const conversation = driverConversationMap.get(driver.id) ?? driverConversationMap.get(fullName);
                const isSelected = selectedDriverId === driver.id;
                const unreadCount = conversation?.unread_count || 0;

                return (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriverId(driver.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {fullName}
                          </span>
                          {conversation?.last_message_at && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                              {formatRelativeTime(conversation.last_message_at)}
                            </span>
                          )}
                        </div>
                        {conversation?.last_message_preview ? (
                          <p className={`text-xs truncate mt-0.5 ${
                            unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                          }`}>
                            {conversation.last_message_preview}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            No messages yet
                          </p>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center text-xs shrink-0">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right column - Chat panel */}
        <div className="flex-1 flex flex-col bg-card">
          {selectedDriverId && selectedDriver ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b flex items-center gap-3 bg-background/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-sm truncate">
                    {selectedDriver.first_name} {selectedDriver.last_name}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    Direct message
                  </p>
                </div>
              </div>

              {/* Chat panel */}
              <div className="flex-1 min-h-0">
                {/* #region agent log */}
                {(() => {
                  const existingConv = driverConversationMap.get(selectedDriverId);
                  fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DispatchPageClient.tsx:RENDER_CHATPANEL',message:'Rendering ChatPanel for driver',data:{driverId:selectedDriverId,existingConversationId:existingConv?.id,existingConversationType:existingConv?.type,usingProvidedId:!!existingConv?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                  return null;
                })()}
                {/* #endregion */}
                <ChatPanel
                  context="driver_dispatch"
                  driverId={selectedDriverId}
                  companyId={companyId}
                  userId={userId}
                  isInternal={true}
                  height="100%"
                  conversationId={driverConversationMap.get(selectedDriverId)?.id}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a driver</p>
              <p className="text-sm text-center mt-1">
                Choose a driver from the list to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
