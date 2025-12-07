# MoveBoss Communication System

## Overview

The MoveBoss Communication System provides a comprehensive, permission-aware messaging infrastructure for carriers, dispatchers, drivers, partners, and AI agents. This document covers the architecture, implementation, and usage of the system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Permission Model](#permission-model)
4. [API Reference](#api-reference)
5. [AI Agent Tools](#ai-agent-tools)
6. [Message Routing](#message-routing)
7. [UI Components](#ui-components)
8. [Full Lifecycle Example](#full-lifecycle-example)

---

## Architecture Overview

### Core Concepts

1. **Conversations**: Contextual threads tied to specific entities (loads, trips, company relationships)
2. **Participants**: Users/drivers with specific read/write permissions
3. **Messages**: Individual communications within conversations
4. **Settings**: Per-load and per-partner communication preferences

### Conversation Types

| Type | Description | Visibility |
|------|-------------|------------|
| `load_internal` | Internal team discussion about a load | Carrier only |
| `load_shared` | Carrier ↔ Partner communication about a load | Carrier + Partner (driver based on visibility) |
| `trip_internal` | Internal team discussion about a trip | Carrier only |
| `company_to_company` | General carrier ↔ partner communication | Carrier + Partner |
| `general` | General company chat | Company only |

### Technology Stack

- **Database**: Supabase PostgreSQL with RLS
- **Web API**: Next.js 16 API Routes
- **Web UI**: React 19 with Shadcn/UI
- **Mobile**: React Native with Expo
- **Real-time**: Supabase Realtime

---

## Database Schema

### Core Tables

```sql
-- conversations: Communication threads
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  type conversation_type NOT NULL,
  owner_company_id UUID NOT NULL,
  load_id UUID,
  trip_id UUID,
  carrier_company_id UUID,
  partner_company_id UUID,
  title TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0
);

-- conversation_participants: Permission source of truth
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID,
  driver_id UUID,
  company_id UUID,
  role conversation_participant_role NOT NULL,
  can_read BOOLEAN DEFAULT TRUE,
  can_write BOOLEAN DEFAULT TRUE,
  is_driver BOOLEAN DEFAULT FALSE,
  unread_count INTEGER DEFAULT 0
);

-- messages: Individual messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_user_id UUID,
  sender_driver_id UUID,
  message_type message_type DEFAULT 'text',
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- load_communication_settings: Per-load driver visibility
CREATE TABLE load_communication_settings (
  id UUID PRIMARY KEY,
  load_id UUID UNIQUE NOT NULL,
  driver_visibility driver_visibility_level DEFAULT 'none',
  driver_id UUID,
  allow_partner_direct_to_driver BOOLEAN DEFAULT FALSE
);

-- partner_communication_settings: Default partner policies
CREATE TABLE partner_communication_settings (
  id UUID PRIMARY KEY,
  carrier_company_id UUID NOT NULL,
  partner_company_id UUID NOT NULL,
  default_driver_visibility driver_visibility_level DEFAULT 'none',
  lock_driver_visibility BOOLEAN DEFAULT FALSE,
  allow_driver_partner_direct_messages BOOLEAN DEFAULT FALSE
);
```

---

## Permission Model

### Driver Visibility Levels

| Level | Can Read Shared | Can Write Shared | Behavior |
|-------|----------------|------------------|----------|
| `none` | No | No | Driver doesn't see shared conversation |
| `read_only` | Yes | No | Driver sees but replies route to internal |
| `full` | Yes | Yes | Driver can fully participate in shared |

### RLS Policy Examples

```sql
-- Users can only see conversations they participate in
CREATE POLICY conversations_select_participant ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
        AND cp.can_read = TRUE
    )
  );

-- Users can only send messages if they have write access
CREATE POLICY messages_insert_participant ON messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT cp.conversation_id FROM conversation_participants cp
      WHERE cp.user_id = auth.uid() AND cp.can_write = TRUE
    )
  );
```

---

## API Reference

### Conversations

#### GET /api/messaging/conversations
List conversations for the authenticated user.

Query Parameters:
- `type`: Filter by conversation type
- `load_id`: Filter by load
- `trip_id`: Filter by trip
- `include_archived`: Include archived conversations

#### POST /api/messaging/conversations
Create or get a conversation.

Body:
```json
{
  "type": "load_internal",
  "load_id": "uuid",
  "partner_company_id": "uuid"
}
```

### Messages

#### GET /api/messaging/messages
Get messages for a conversation.

Query Parameters:
- `conversation_id`: Required
- `limit`: Max messages (default 50)
- `before`: Cursor for pagination

#### POST /api/messaging/messages
Send a message.

Body:
```json
{
  "conversation_id": "uuid",
  "body": "Message content",
  "message_type": "text",
  "attachments": [],
  "reply_to_message_id": "uuid"
}
```

### Settings

#### GET /api/messaging/settings
Get communication settings.

Query Parameters:
- `load_id`: For load settings
- `carrier_company_id` + `partner_company_id`: For partner settings

#### PATCH /api/messaging/settings
Update settings.

Body:
```json
{
  "setting_type": "driver_visibility",
  "load_id": "uuid",
  "driver_visibility": "read_only"
}
```

---

## AI Agent Tools

### Available Tools

| Tool | Description |
|------|-------------|
| `send_message` | Send a message to a conversation |
| `get_conversation_for_load` | Get load conversation history |
| `get_conversation_for_trip` | Get trip conversation history |
| `get_company_thread` | Get company-to-company conversation |
| `summarize_conversation` | Summarize a conversation |
| `classify_message_context` | Classify incoming message context |
| `create_balance_verification_request` | Create balance request |
| `check_driver_visibility` | Check driver visibility settings |

### AI API Endpoint

```
POST /api/ai/messaging
{
  "tool": "send_message",
  "params": {
    "context_type": "load_shared",
    "load_id": "uuid",
    "partner_company_id": "uuid",
    "message": "Message content"
  }
}
```

---

## Message Routing

### Routing Rules

1. **Driver (full visibility)** → Shared conversation: Direct send
2. **Driver (read-only)** → Shared conversation: Redirect to internal
3. **Driver (none)** → Shared conversation: Block
4. **Dispatcher/Owner** → Any: Direct send based on conversation type
5. **Partner** → Internal: Block (never allowed)
6. **Partner** → Shared: Direct send

### Implementation

```typescript
// Route a driver's message
const routeInfo = await getDriverMessageTarget(driverId, conversationId);

if (routeInfo.isRouted) {
  // Message was redirected to internal conversation
  // Notify driver of the routing
}

// Send to appropriate conversation
await sendMessage(routeInfo.targetConversationId, ...);
```

---

## UI Components

### Mobile (React Native)

```tsx
// Conversation list
import { ConversationList } from '@/components/messaging';

<ConversationList
  conversations={conversations}
  loading={loading}
  error={error}
  onRefresh={refetch}
/>

// Load chat tabs (internal/shared)
import { LoadChatTabs } from '@/components/messaging';

<LoadChatTabs loadId={loadId} />

// Chat view
import { ChatView } from '@/components/messaging';

<ChatView
  conversationId={id}
  messages={messages}
  canWrite={canWrite}
  isReadOnly={isReadOnly}
  onSendMessage={sendMessage}
/>
```

### Web (Next.js)

```tsx
// Load conversation panel
import { LoadConversationPanel } from '@/components/messaging';

<LoadConversationPanel
  loadId={loadId}
  loadNumber={loadNumber}
  companyId={companyId}
  userId={userId}
  partnerCompanyId={partnerCompanyId}
  driverId={driverId}
/>

// Partner settings
import { PartnerCommunicationSettings } from '@/components/messaging';

<PartnerCommunicationSettings
  carrierCompanyId={carrierId}
  partnerCompanyId={partnerId}
  partnerCompanyName={partnerName}
/>
```

---

## Full Lifecycle Example

This example demonstrates a complete communication flow involving all participants.

### Scenario: Load Assignment and Delivery Coordination

#### Step 1: Load Created and Assigned

```
1. Dispatcher creates Load #LD-001234
2. Load assigned to Partner "ABC Moving"
3. Driver "John Smith" assigned to the load
4. System auto-creates:
   - Internal conversation for carrier team
   - Shared conversation with ABC Moving
```

**Database State:**
```sql
-- Two conversations created
INSERT INTO conversations (type, load_id, owner_company_id, partner_company_id)
VALUES
  ('load_internal', 'load-123', 'carrier-456', NULL),
  ('load_shared', 'load-123', 'carrier-456', 'partner-789');

-- Participants added based on settings
INSERT INTO conversation_participants (conversation_id, driver_id, can_read, can_write)
VALUES ('internal-conv-id', 'driver-john', true, true);
-- Driver not added to shared (visibility = 'none')
```

#### Step 2: Partner Sends Message

```
Partner Rep: "Please confirm pickup time for tomorrow"
→ Sent to: load_shared conversation
→ Visible to: Dispatcher, Owner, NOT Driver (visibility = none)
```

**API Call:**
```json
POST /api/messaging/messages
{
  "conversation_id": "shared-conv-id",
  "body": "Please confirm pickup time for tomorrow"
}
```

#### Step 3: Dispatcher Responds and Updates Visibility

```
1. Dispatcher sees partner message
2. Dispatcher changes driver visibility to "read_only"
3. Dispatcher responds: "Pickup confirmed for 9 AM"
```

**API Calls:**
```json
// Update visibility
PATCH /api/messaging/settings
{
  "setting_type": "driver_visibility",
  "load_id": "load-123",
  "driver_visibility": "read_only"
}

// Send response
POST /api/messaging/messages
{
  "conversation_id": "shared-conv-id",
  "body": "Pickup confirmed for 9 AM"
}
```

**Result:**
- Driver "John" can now SEE the shared conversation
- Driver "John" CANNOT reply directly to shared

#### Step 4: Driver Tries to Reply

```
Driver sees the conversation and wants to respond.
Driver types: "I'll be there at 8:45 AM"
→ System routes to internal conversation (read-only on shared)
→ Driver notified: "Your message was sent to the team chat"
```

**Mobile Hook Logic:**
```typescript
const { sendMessage, wasRouted, routeReason } = useConversationMessages(sharedConvId);

// When driver sends
const result = await sendMessage("I'll be there at 8:45 AM");
// wasRouted = true
// routeReason = "Message sent to internal team chat..."
```

#### Step 5: AI Agent Assists

```
Driver asks AI: "What balance do I need to collect?"

AI Agent:
1. Checks driver visibility for load → "read_only"
2. Retrieves load details
3. Finds balance_due = $2,500
4. Responds in internal conversation
```

**AI Tool Call:**
```json
{
  "tool": "get_conversation_for_load",
  "params": {
    "load_id": "load-123",
    "conversation_type": "internal"
  }
}
// AI reads context, then responds

{
  "tool": "send_message",
  "params": {
    "context_type": "load_internal",
    "load_id": "load-123",
    "message": "The balance to collect at delivery is $2,500. Payment accepted via cashier's check or money order."
  }
}
```

#### Step 6: Dispatcher Updates Visibility to Full

```
Dispatcher decides driver should communicate directly with partner.
Changes visibility to "full"
```

**Result:**
- Driver can now reply directly in shared conversation
- Partner can see driver's messages

#### Step 7: Driver Sends Delivery Update

```
Driver: "Arrived at delivery, starting unload"
→ Sent directly to shared conversation
→ Partner receives notification
```

#### Step 8: Partner Responds

```
Partner: "Great! Customer is waiting. Please get signature on BOL."
```

#### Step 9: AI Creates Balance Verification

```
Dispatcher asks AI: "Send balance verification to driver for this delivery"

AI Agent:
1. Creates balance verification request
2. Sends to internal conversation
3. Driver receives notification
```

**AI Tool Call:**
```json
{
  "tool": "create_balance_verification_request",
  "params": {
    "load_id": "load-123",
    "amount": 2500.00,
    "stop_type": "delivery",
    "instructions": "Collect via cashier's check or money order. Personal checks not accepted."
  }
}
```

#### Step 10: Delivery Complete

```
Driver: "Delivery complete. Collected $2,500 via money order."
→ Shared conversation (partner sees)
→ Load status updated
→ Partner notified
```

### Summary of Message Flow

```
Timeline:
─────────────────────────────────────────────────────────────────
Partner → [Shared] "Confirm pickup"     | Driver: ❌ No access
─────────────────────────────────────────────────────────────────
Dispatch → [Shared] "9 AM confirmed"    | Driver: 👁️ Can see
─────────────────────────────────────────────────────────────────
Driver  → [Internal] "8:45 AM arrival"  | Routed (read-only)
─────────────────────────────────────────────────────────────────
AI      → [Internal] "Balance: $2,500"  | Driver: ✅ Can see
─────────────────────────────────────────────────────────────────
Dispatch → Changes visibility to full   | Driver: 💬 Full access
─────────────────────────────────────────────────────────────────
Driver  → [Shared] "Arrived"            | Partner: ✅ Can see
Partner → [Shared] "Get signature"      | Driver: ✅ Can see
─────────────────────────────────────────────────────────────────
AI      → [Internal] Balance Request    | Driver: ✅ Can see
─────────────────────────────────────────────────────────────────
Driver  → [Shared] "Complete, $2,500"   | Partner: ✅ Can see
─────────────────────────────────────────────────────────────────
```

---

## Implementation Phases

### Phase 1: Messaging + Permissions (No AI)
1. Database schema and migrations ✅
2. RLS policies ✅
3. API endpoints ✅
4. Message routing logic ✅
5. Mobile driver UI ✅
6. Web dispatcher UI ✅

### Phase 2: AI Integration
1. AI tool definitions ✅
2. AI system prompt ✅
3. AI API endpoint ✅
4. Context-aware responses
5. Proactive notifications

---

## Future Enhancements

1. **Voice Messages**: Add voice recording and transcription
2. **Read Receipts**: Track message delivery and read status
3. **Message Reactions**: Allow emoji reactions to messages
4. **File Attachments**: Support document uploads within chat
5. **Search**: Full-text search across conversations
6. **Translation**: Auto-translate messages for cross-language communication
7. **Templates**: Pre-defined message templates for common scenarios

---

## Security Considerations

1. All permission checks happen at the database level via RLS
2. API routes verify user identity before any operation
3. AI tools respect all permission rules
4. Partner companies never see internal conversations
5. Driver visibility is enforced consistently across all platforms
6. Audit logging tracks all permission changes

---

## Support

For questions or issues with the communication system:
- GitHub Issues: https://github.com/moveboss/moveboss-pro/issues
- Documentation: This file and inline code comments
