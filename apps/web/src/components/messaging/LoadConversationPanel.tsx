'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Send, Lock, Eye, MessageSquare, Users, Globe, AlertCircle, Loader2 } from 'lucide-react';
import type {
  ConversationType,
  DriverVisibilityLevel,
  MessageWithSender,
  ConversationWithDetails,
  DRIVER_VISIBILITY_OPTIONS,
} from '@/lib/communication-types';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

interface LoadConversationPanelProps {
  loadId: string;
  loadNumber: string;
  companyId: string;
  userId: string;
  partnerCompanyId?: string;
  partnerCompanyName?: string;
  driverId?: string;
  driverName?: string;
}

export function LoadConversationPanel({
  loadId,
  loadNumber,
  companyId,
  userId,
  partnerCompanyId,
  partnerCompanyName,
  driverId,
  driverName,
}: LoadConversationPanelProps) {
  const [activeTab, setActiveTab] = useState<'internal' | 'shared'>('internal');
  const [internalConversation, setInternalConversation] = useState<ConversationWithDetails | null>(null);
  const [sharedConversation, setSharedConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [driverVisibility, setDriverVisibility] = useState<DriverVisibilityLevel>('none');
  const [isVisibilityLocked, setIsVisibilityLocked] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch internal conversation
      const internalRes = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'load_internal',
          load_id: loadId,
        }),
      });

      if (internalRes.ok) {
        const { conversation } = await internalRes.json();
        setInternalConversation(conversation);
      }

      // Fetch shared conversation if partner exists
      if (partnerCompanyId) {
        const sharedRes = await fetch('/api/messaging/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'load_shared',
            load_id: loadId,
            partner_company_id: partnerCompanyId,
          }),
        });

        if (sharedRes.ok) {
          const { conversation } = await sharedRes.json();
          setSharedConversation(conversation);
        }
      }

      // Fetch driver visibility settings
      const settingsRes = await fetch(`/api/messaging/settings?load_id=${loadId}`);
      if (settingsRes.ok) {
        const { settings, permissions } = await settingsRes.json();
        setDriverVisibility(settings?.driver_visibility ?? 'none');
        setIsVisibilityLocked(permissions?.is_visibility_locked ?? false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [loadId, partnerCompanyId]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    const conversationId = activeTab === 'internal' ? internalConversation?.id : sharedConversation?.id;
    if (!conversationId) return;

    try {
      const res = await fetch(`/api/messaging/messages?conversation_id=${conversationId}`);
      if (res.ok) {
        const { messages } = await res.json();
        setMessages(messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [activeTab, internalConversation?.id, sharedConversation?.id]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when tab changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    const conversationId = activeTab === 'internal' ? internalConversation?.id : sharedConversation?.id;
    if (!conversationId || !messageInput.trim() || isSending) return;

    try {
      setIsSending(true);
      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          body: messageInput.trim(),
        }),
      });

      if (res.ok) {
        setMessageInput('');
        fetchMessages();
      } else {
        const { error } = await res.json();
        throw new Error(error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Update driver visibility
  const handleVisibilityChange = async (value: DriverVisibilityLevel) => {
    if (isVisibilityLocked || isUpdatingVisibility) return;

    try {
      setIsUpdatingVisibility(true);
      const res = await fetch('/api/messaging/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_type: 'driver_visibility',
          load_id: loadId,
          driver_visibility: value,
          driver_id: driverId,
        }),
      });

      if (res.ok) {
        setDriverVisibility(value);
      } else {
        const { error } = await res.json();
        throw new Error(error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const activeConversation = activeTab === 'internal' ? internalConversation : sharedConversation;

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-500" />
            <span className="font-semibold">Messages - {loadNumber}</span>
          </div>

          {/* Driver visibility control */}
          {driverId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Driver visibility:</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select
                        value={driverVisibility}
                        onValueChange={handleVisibilityChange}
                        disabled={isVisibilityLocked || isUpdatingVisibility}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="flex items-center gap-2">
                              <Lock className="h-4 w-4" /> Hidden
                            </span>
                          </SelectItem>
                          <SelectItem value="read_only">
                            <span className="flex items-center gap-2">
                              <Eye className="h-4 w-4" /> Read-only
                            </span>
                          </SelectItem>
                          <SelectItem value="full">
                            <span className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" /> Full access
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  {isVisibilityLocked && (
                    <TooltipContent>
                      <p>Visibility is locked by partner settings</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {isVisibilityLocked && <Lock className="h-4 w-4 text-amber-500" />}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'internal' | 'shared')}>
        <TabsList className="w-full justify-start rounded-none border-b">
          <TabsTrigger value="internal" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Internal
            {internalConversation?.message_count ? (
              <Badge variant="secondary" className="ml-1">
                {internalConversation.message_count}
              </Badge>
            ) : null}
          </TabsTrigger>
          {partnerCompanyId && (
            <TabsTrigger value="shared" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Shared with {partnerCompanyName ?? 'Partner'}
              {sharedConversation?.message_count ? (
                <Badge variant="secondary" className="ml-1">
                  {sharedConversation.message_count}
                </Badge>
              ) : null}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="m-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Messages area */}
        <TabsContent value={activeTab} className="flex-1 mt-0">
          <ScrollArea className="h-[400px] p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isOwn = message.sender_user_id === userId;
                  const showDateHeader = shouldShowDateHeader(message, messages[index - 1]);

                  return (
                    <React.Fragment key={message.id}>
                      {showDateHeader && <DateHeader date={message.created_at} />}
                      <MessageBubble message={message} isOwn={isOwn} />
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Input area */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending || !activeConversation}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || !messageInput.trim() || !activeConversation}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// Helper components
function shouldShowDateHeader(
  current: MessageWithSender,
  previous: MessageWithSender | undefined
): boolean {
  if (!previous) return true;
  const currentDate = new Date(current.created_at).toDateString();
  const previousDate = new Date(previous.created_at).toDateString();
  return currentDate !== previousDate;
}

function DateHeader({ date }: { date: string }) {
  const dateObj = new Date(date);
  let label: string;

  if (isToday(dateObj)) {
    label = 'Today';
  } else if (isYesterday(dateObj)) {
    label = 'Yesterday';
  } else {
    label = format(dateObj, 'MMMM d, yyyy');
  }

  return (
    <div className="flex justify-center my-4">
      <span className="px-3 py-1 text-xs bg-gray-100 rounded-full text-gray-500">
        {label}
      </span>
    </div>
  );
}

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const senderName =
    message.sender_profile?.full_name ||
    (message.sender_driver
      ? `${message.sender_driver.first_name} ${message.sender_driver.last_name}`
      : 'Unknown');

  const isAI = message.message_type === 'ai_response';
  const isSystem = message.message_type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-gray-500 italic">{message.body}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isOwn
            ? 'bg-blue-500 text-white'
            : isAI
              ? 'bg-green-50 border border-green-200'
              : 'bg-gray-100'
        )}
      >
        {!isOwn && (
          <p
            className={cn(
              'text-xs font-medium mb-1',
              isAI ? 'text-green-600' : 'text-gray-600'
            )}
          >
            {isAI ? 'AI Assistant' : senderName}
          </p>
        )}
        <p className={cn('text-sm', isOwn ? 'text-white' : 'text-gray-900')}>
          {message.body}
        </p>
        <p
          className={cn(
            'text-xs mt-1',
            isOwn ? 'text-blue-100' : 'text-gray-400'
          )}
        >
          {format(new Date(message.created_at), 'h:mm a')}
          {message.is_edited && ' (edited)'}
        </p>
      </div>
    </div>
  );
}
