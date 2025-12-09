'use client';

import { useState } from 'react';
import { MessageSquare, User, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatPanel } from '@/components/messaging/unified';
import type { ConversationListItem } from '@/lib/communication-types';
import type { Driver } from '@/data/drivers';

interface DriverMessagesTabProps {
  drivers: Driver[];
  conversations: ConversationListItem[];
  companyId: string;
  userId: string;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'No messages yet';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function DriverMessagesTab({
  drivers,
  conversations,
  companyId,
  userId,
}: DriverMessagesTabProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Find the selected driver
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  // Create a map of driver IDs to conversations for quick lookup
  const driverConversationMap = new Map<string, ConversationListItem>();
  conversations.forEach((conv) => {
    // Prefer driver_id if available, fall back to driver_name for legacy data
    if (conv.context?.driver_id) {
      driverConversationMap.set(conv.context.driver_id, conv);
    } else if (conv.context?.driver_name) {
      driverConversationMap.set(conv.context.driver_name, conv);
    }
  });

  // Filter to only active drivers with login enabled
  const messageableDrivers = drivers.filter(
    (d) => d.status === 'active' && d.has_login
  );

  if (messageableDrivers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Drivers with Portal Access</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Driver messaging is available for drivers who have portal access enabled.
            Enable portal access for a driver to start messaging.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Driver list */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Driver Messages</CardTitle>
          <p className="text-sm text-muted-foreground">
            Direct messaging with your drivers
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {messageableDrivers.map((driver) => {
              const fullName = `${driver.first_name} ${driver.last_name}`;
              // Look up by driver.id first, then fall back to fullName for legacy data
              const conversation = driverConversationMap.get(driver.id) ?? driverConversationMap.get(fullName);
              const isSelected = selectedDriverId === driver.id;

              return (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriverId(driver.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                    isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {fullName}
                        </span>
                        {conversation && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(conversation.last_message_at)}
                          </span>
                        )}
                      </div>
                      {conversation?.last_message_preview ? (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conversation.last_message_preview}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          No messages yet
                        </p>
                      )}
                    </div>
                    {conversation?.unread_count && conversation.unread_count > 0 ? (
                      <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center text-xs">
                        {conversation.unread_count}
                      </Badge>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Chat panel */}
      <Card className="lg:col-span-2">
        {selectedDriverId && selectedDriver ? (
          <div className="h-[600px] flex flex-col">
            <CardHeader className="border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {selectedDriver.first_name} {selectedDriver.last_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Direct message
                  </p>
                </div>
              </div>
            </CardHeader>
            <div className="flex-1 min-h-0">
              <ChatPanel
                context="driver_dispatch"
                driverId={selectedDriverId}
                companyId={companyId}
                userId={userId}
                isInternal={true}
                height={500}
              />
            </div>
          </div>
        ) : (
          <CardContent className="h-[600px] flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select a Driver</h3>
              <p className="text-sm text-muted-foreground">
                Choose a driver from the list to start messaging
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
