# Push Notifications Setup Guide

This guide covers setting up push notifications for the MoveBoss mobile app using Expo Push Notifications with Firebase Cloud Messaging (Android) and Apple Push Notification service (iOS).

## Overview

The app uses **Expo Push Notifications** which acts as a unified gateway:
- For Android: Routes through Firebase Cloud Messaging (FCM)
- For iOS: Routes through Apple Push Notification service (APNs)

Expo handles the complexity of managing both services, so you only need to send notifications to Expo's push API.

## Prerequisites

- [Expo account](https://expo.dev) (free)
- [Firebase account](https://console.firebase.google.com) (free tier available)
- [Apple Developer account](https://developer.apple.com) ($99/year - required for iOS)
- EAS CLI installed: `npm install -g eas-cli`

---

## Part 1: Firebase Cloud Messaging (Android)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name it "MoveBoss" (or your preferred name)
4. Disable Google Analytics (optional, not needed for push)
5. Click "Create project"

### Step 2: Add Android App to Firebase

1. In Firebase Console, click the Android icon to add an app
2. Enter the package name: `com.moveboss.driver`
3. Enter app nickname: "MoveBoss Driver"
4. Skip the SHA-1 for now (not needed for push notifications)
5. Click "Register app"

### Step 3: Download google-services.json

1. Download the `google-services.json` file
2. Place it in: `apps/mobile/google-services.json`
3. Verify it's referenced in `app.json`:
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```

### Step 4: Get FCM Server Key for Expo

1. In Firebase Console, go to Project Settings (gear icon)
2. Navigate to "Cloud Messaging" tab
3. Under "Cloud Messaging API (Legacy)", enable it if needed
4. Copy the "Server key"

### Step 5: Configure Expo with FCM

```bash
# Login to Expo
eas login

# Set FCM server key
eas credentials -p android
# Select "Add new Google Service Account"
# Or upload the google-services.json via EAS
```

Alternatively, upload via Expo dashboard:
1. Go to [expo.dev](https://expo.dev)
2. Select your project
3. Go to Credentials > Android
4. Upload your FCM Server Key

---

## Part 2: Apple Push Notification service (iOS)

### Step 1: Create App ID in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to Certificates, Identifiers & Profiles
3. Click "Identifiers" > "+" to create new
4. Select "App IDs" > Continue
5. Select "App" > Continue
6. Enter:
   - Description: "MoveBoss Driver"
   - Bundle ID: `com.moveboss.driver` (Explicit)
7. Enable "Push Notifications" capability
8. Click "Continue" > "Register"

### Step 2: Create APNs Key (Recommended Method)

Apple allows only 2 keys per account, but they work for all apps.

1. Go to "Keys" in Apple Developer Portal
2. Click "+" to create new key
3. Enter key name: "MoveBoss Push Key"
4. Enable "Apple Push Notifications service (APNs)"
5. Click "Continue" > "Register"
6. **Download the key file** (.p8) - you can only download once!
7. Note down:
   - Key ID (shown on the page)
   - Team ID (from Membership page)

### Step 3: Configure Expo with APNs

```bash
# Login to Expo
eas login

# Configure iOS credentials
eas credentials -p ios
# Select "Add new APNs Key"
# Upload your .p8 file
# Enter Key ID and Team ID
```

Or via Expo dashboard:
1. Go to [expo.dev](https://expo.dev)
2. Select your project
3. Go to Credentials > iOS
4. Upload APNs Key (.p8 file)
5. Enter Key ID and Team ID

---

## Part 3: Environment Variables

Add these to your deployment environment (Vercel, etc.):

```env
# Required for server-side push notifications
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The `push-notifications.ts` library uses the Supabase service role key to:
- Fetch push tokens from the database
- Log sent notifications

---

## Part 4: Database Setup

Run the push tokens migration:

```sql
-- Already created in: supabase/migrations/20251128023_push_tokens.sql

-- Push tokens table stores device tokens for each user
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Notification log for tracking sent notifications
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Part 5: Building the App

### Development Build (Recommended for Testing)

```bash
cd apps/mobile

# Create development build for iOS
eas build --profile development --platform ios

# Create development build for Android
eas build --profile development --platform android
```

### Production Build

```bash
# Build for both platforms
eas build --platform all

# Or individually
eas build --platform ios
eas build --platform android
```

---

## Part 6: Testing Push Notifications

### Test from Expo Dashboard

1. Go to [expo.dev/notifications](https://expo.dev/notifications)
2. Enter a push token (from app logs or database)
3. Enter title and body
4. Click "Send"

### Test from Code

```typescript
// In the mobile app, use the test helper:
import { scheduleLocalNotification } from '../hooks/usePushNotifications';

// Schedule a local notification for testing
await scheduleLocalNotification(
  'Test Notification',
  'This is a test message',
  { type: 'general' },
  5 // seconds
);
```

### Test Server-Side

```bash
# Using curl to test the API
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "action": "message",
    "driverId": "driver-uuid-here",
    "title": "Test",
    "message": "Hello from the server!"
  }'
```

---

## Part 7: Troubleshooting

### Common Issues

**"Push notifications require a physical device"**
- Notifications don't work in simulators
- Use a physical device for testing

**"Permission not granted"**
- User denied notification permission
- App must request permission again or user enables in Settings

**Notifications not received on Android**
- Verify `google-services.json` is in the correct location
- Ensure FCM server key is configured in Expo
- Check if the device is connected to internet

**Notifications not received on iOS**
- Verify APNs key is uploaded to Expo
- Ensure push capability is enabled in App ID
- Check if app is built with correct provisioning profile

### Debug Mode

Add logging to track notification flow:

```typescript
// In usePushNotifications.ts
console.log('Push token:', expoPushToken);
console.log('Notification received:', notification);
```

Check the Expo push receipt status:
```bash
curl -X POST https://exp.host/--/api/v2/push/getReceipts \
  -H "Content-Type: application/json" \
  -d '{"ids": ["ticket-id-from-send-response"]}'
```

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Dashboard │────▶│  Notification   │────▶│   Expo Push     │
│   (Next.js)     │     │  API Route      │     │   API           │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                           ┌─────────────┴─────────────┐
                                           │                           │
                                           ▼                           ▼
                                    ┌─────────────┐             ┌─────────────┐
                                    │    FCM      │             │    APNs     │
                                    │  (Android)  │             │   (iOS)     │
                                    └──────┬──────┘             └──────┬──────┘
                                           │                           │
                                           ▼                           ▼
                                    ┌─────────────┐             ┌─────────────┐
                                    │   Android   │             │    iOS      │
                                    │    Device   │             │   Device    │
                                    └─────────────┘             └─────────────┘
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `apps/mobile/hooks/usePushNotifications.ts` | Mobile hook for registration and handling |
| `apps/mobile/providers/NotificationProvider.tsx` | App-wide notification context |
| `apps/web/src/lib/push-notifications.ts` | Server-side notification sender |
| `apps/web/src/app/api/notifications/send/route.ts` | API endpoint for sending notifications |
| `apps/web/src/hooks/useNotifications.ts` | Dashboard hook for sending notifications |
| `supabase/migrations/20251128023_push_tokens.sql` | Database tables |

---

## Next Steps

1. Complete Firebase/APNs setup using this guide
2. Build development builds with EAS
3. Test notifications on physical devices
4. Integrate notification triggers into trip/load workflows
