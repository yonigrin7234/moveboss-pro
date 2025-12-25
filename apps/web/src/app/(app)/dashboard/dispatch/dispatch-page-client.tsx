'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MessageSquare, Search, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatPanel } from '@/components/messaging/unified';
import { createClient } from '@/lib/supabase-client';
import type { ConversationListItem } from '@/lib/communication-types';
import type { Driver } from '@/data/drivers';
import { formatFullName } from '@/lib/utils';

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

// Avatar colors - professional palette
const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
];

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '??';
}

function getAvatarColor(name: string): { bg: string; text: string } {
  // Simple hash to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function DispatchPageClient({
  drivers,
  conversations: initialConversations,
  companyId,
  userId,
}: DispatchPageClientProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationListItem[]>(initialConversations);

  // Find the selected driver
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  // Create a map of driver IDs to conversations for quick lookup
  // If multiple conversations exist for the same driver, use the most recent one
  const driverConversationMap = useMemo(() => {
    const map = new Map<string, ConversationListItem>();
    conversations.forEach((conv) => {
      // Prefer driver_id if available, fall back to driver_name
      const key = conv.context?.driver_id || conv.context?.driver_name;
      if (key) {
        const existing = map.get(key);
        // If no existing conversation, or this one is more recent, use this one
        if (!existing || 
            (conv.last_message_at && 
             (!existing.last_message_at || 
              new Date(conv.last_message_at) > new Date(existing.last_message_at)))) {
          map.set(key, conv);
        }
      }
    });
    return map;
  }, [conversations]);

  // Filter and sort drivers - unread first, then by recent activity
  const filteredDrivers = useMemo(() => {
    let result = drivers;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((driver) => {
        const fullName = `${driver.first_name} ${driver.last_name}`.toLowerCase();
        return fullName.includes(query);
      });
    }

    // Sort: unread first, then by last message time
    return [...result].sort((a, b) => {
      const fullNameA = formatFullName(a.first_name, a.last_name);
      const fullNameB = formatFullName(b.first_name, b.last_name);
      const convA = driverConversationMap.get(a.id) ?? driverConversationMap.get(fullNameA);
      const convB = driverConversationMap.get(b.id) ?? driverConversationMap.get(fullNameB);

      const unreadA = convA?.unread_count || 0;
      const unreadB = convB?.unread_count || 0;

      // Unread messages first
      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadB > 0 && unreadA === 0) return 1;

      // Then by last message time (most recent first)
      const timeA = convA?.last_message_at ? new Date(convA.last_message_at).getTime() : 0;
      const timeB = convB?.last_message_at ? new Date(convB.last_message_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;

      // Finally alphabetically
      return fullNameA.localeCompare(fullNameB);
    });
  }, [drivers, searchQuery, driverConversationMap]);

  // Calculate total unread count
  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  }, [conversations]);

  // Handle selecting a driver - marks conversation as read
  const handleSelectDriver = useCallback((driverId: string) => {
    setSelectedDriverId(driverId);

    // Find the conversation for this driver and mark as read
    const conversation = driverConversationMap.get(driverId);
    if (conversation && conversation.unread_count > 0) {
      // Mark as read on the server
      fetch(`/api/messaging/conversations/${conversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      }).catch((err) => {
        console.error('Failed to mark conversation as read:', err);
      });

      // Update local state immediately for responsive UI
      setConversations(prev => prev.map(conv =>
        conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
      ));
    }
  }, [driverConversationMap]);

  // Real-time subscription for new messages
  const supabase = createClient();
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (conversations.length === 0) return;

    // Get all conversation IDs we're tracking
    const conversationIds = new Set(conversations.map(c => c.id));

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel('dispatch-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            sender_user_id: string | null;
            sender_driver_id: string | null;
            body: string;
            created_at: string;
          };

          // Only process if this is for a conversation we're tracking
          if (!conversationIds.has(newMessage.conversation_id)) return;

          const messagePreview = newMessage.body?.length > 50
            ? newMessage.body.substring(0, 50) + '...'
            : newMessage.body;
          const isFromDriver = newMessage.sender_driver_id !== null;

          // Find which driver this conversation belongs to
          const conversation = conversations.find(c => c.id === newMessage.conversation_id);
          const driverId = conversation?.context?.driver_id;

          // Update conversation list
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== newMessage.conversation_id) return conv;

              // Don't increment unread if we're viewing this driver's conversation
              const isViewingThisDriver = selectedDriverId === driverId;

              return {
                ...conv,
                last_message_preview: messagePreview,
                last_message_at: newMessage.created_at,
                unread_count: isFromDriver && !isViewingThisDriver
                  ? (conv.unread_count || 0) + 1
                  : conv.unread_count,
              };
            })
          );
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [conversations.length, selectedDriverId, supabase]);

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
    <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4 shrink-0">
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
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left column - Driver list */}
        <div className="w-[320px] border-r flex flex-col bg-background shrink-0 overflow-hidden">
          {/* Search - FIXED */}
          <div className="p-3 border-b shrink-0">
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
          <ScrollArea className="flex-1 min-h-0">
            <div className="divide-y">
              {filteredDrivers.map((driver) => {
                const fullName = formatFullName(driver.first_name, driver.last_name);
                // Look up by driver.id first, then fall back to fullName for legacy data
                const conversation = driverConversationMap.get(driver.id) ?? driverConversationMap.get(fullName);
                const isSelected = selectedDriverId === driver.id;
                const unreadCount = conversation?.unread_count || 0;
                const initials = getInitials(driver.first_name, driver.last_name);
                const avatarColor = getAvatarColor(fullName);

                return (
                  <button
                    key={driver.id}
                    onClick={() => handleSelectDriver(driver.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-medium text-sm ${avatarColor.bg} ${avatarColor.text}`}>
                        {initials}
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
        <div className="flex-1 flex flex-col bg-card min-h-0 min-w-0 overflow-hidden">
          {selectedDriverId && selectedDriver ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b flex items-center gap-3 bg-background/50 shrink-0">
                {(() => {
                  const name = formatFullName(selectedDriver.first_name, selectedDriver.last_name);
                  const color = getAvatarColor(name);
                  return (
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm ${color.bg} ${color.text}`}>
                      {getInitials(selectedDriver.first_name, selectedDriver.last_name)}
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-sm truncate">
                    {formatFullName(selectedDriver.first_name, selectedDriver.last_name)}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    Direct message
                  </p>
                </div>
              </div>

              {/* Chat panel */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatPanel
                  context="driver_dispatch"
                  driverId={selectedDriverId}
                  companyId={companyId}
                  userId={userId}
                  isInternal={true}
                  minimal={true}
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
