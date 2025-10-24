# Push Notifications Implementation Guide

This document describes the complete push notification system for the Mess Meal Management application.

## Overview

The push notification system allows users to receive real-time notifications when they are mentioned in chat messages. The system consists of three main components:

1. **Frontend Service** (`src/services/notifications.ts`): Handles browser permissions and push subscriptions
2. **Service Worker** (`src/sw.ts`): Receives and displays push notifications
3. **Edge Function** (`supabase/functions/send-push-notification`): Sends notifications to subscribed users

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Flow                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. User enables notifications in Preferences tab           │
│     - requestNotificationPermission()                        │
│     - subscribeToPush(userId)                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Push subscription saved to database                     │
│     - push_subscriptions table                               │
│     - Contains: endpoint, p256dh, auth keys                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. User sends chat message with @mention                   │
│     - Message inserted into chats table                      │
│     - mentions array contains mentioned user IDs             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Database trigger fires                                   │
│     - notify_mentioned_users() function                      │
│     - Calls send-push-notification Edge Function            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Edge Function sends push notifications                  │
│     - Queries push_subscriptions for mentioned users         │
│     - Sends Web Push using VAPID keys                        │
│     - Removes invalid subscriptions                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Service Worker receives push event                      │
│     - Displays notification with title, body, icon           │
│     - Handles notification click to open chat                │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- `vite-plugin-pwa`: PWA support
- `workbox-*`: Service worker utilities
- `web-push`: VAPID key generation (dev dependency)

### 2. Generate VAPID Keys

VAPID keys are required for Web Push authentication.

```bash
# Install web-push if not already installed
npm install --save-dev web-push

# Generate keys
node scripts/generate-vapid-keys.js
```

Or use the CLI directly:

```bash
npx web-push generate-vapid-keys
```

### 3. Configure Environment Variables

#### Frontend (.env)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

#### Backend (Supabase Secrets)

```bash
# Set secrets using Supabase CLI
supabase secrets set VAPID_PUBLIC_KEY=your_public_key
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
supabase secrets set VAPID_SUBJECT=mailto:your-email@example.com
```

Or use the Supabase Dashboard:
- Project Settings > Edge Functions > Secrets

### 4. Deploy Edge Function

```bash
# Deploy the send-push-notification function
supabase functions deploy send-push-notification
```

### 5. Run Database Migrations

```bash
# Apply all migrations including the push notification trigger
supabase db push
```

Or run the migration manually:

```sql
-- Run the contents of supabase/migrations/004_create_push_notification_trigger.sql
```

### 6. Build and Deploy Frontend

```bash
# Build the application
npm run build

# The service worker will be automatically generated
# Deploy the dist folder to your hosting provider (e.g., Render)
```

## Usage

### Enabling Notifications (User)

1. Navigate to the Preferences tab
2. Toggle "Enable Notifications"
3. Grant browser permission when prompted
4. Notifications are now enabled

### Sending Notifications (Developer)

Notifications are sent automatically when:
1. A user sends a chat message
2. The message contains @mentions
3. Mentioned users have active push subscriptions

No additional code is required - the database trigger handles everything.

### Testing Notifications

#### Test Browser Permissions

```typescript
import { requestNotificationPermission, showTestNotification } from './services/notifications';

// Request permission
const granted = await requestNotificationPermission();

if (granted) {
  // Show test notification
  await showTestNotification();
}
```

#### Test Push Subscription

```typescript
import { subscribeToPush } from './services/notifications';

// Subscribe to push notifications
const success = await subscribeToPush(userId);
console.log('Subscription successful:', success);
```

#### Test Edge Function

```bash
# Send a test notification using curl
curl -X POST https://your-project.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mentionedUserIds": ["user-id"],
    "message": "Test message @user",
    "senderName": "Test User"
  }'
```

#### Test End-to-End

1. Open the app in two browser windows (or devices)
2. Log in as different users in each window
3. In window 1, send a message mentioning the user in window 2
4. Window 2 should receive a push notification

## Notification Payload

The notification sent to users contains:

```json
{
  "title": "John Doe mentioned you",
  "body": "Message content (truncated to 100 chars)",
  "icon": "/icon-192.png",
  "badge": "/badge-72.png",
  "url": "/chat",
  "tag": "chat-mention"
}
```

## Service Worker Events

### Push Event

Triggered when a push notification is received:

```typescript
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url }
  });
});
```

### Notification Click

Triggered when user clicks a notification:

```typescript
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  // Opens the chat tab or focuses existing window
  clients.openWindow(event.notification.data.url);
});
```

## Browser Support

Push notifications are supported in:

- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Opera 37+
- ✅ Safari 16+ (macOS 13+, iOS 16.4+)
- ❌ Internet Explorer (not supported)

The app gracefully handles unsupported browsers by:
1. Detecting support with `isNotificationSupported()`
2. Showing appropriate UI messages
3. Disabling notification features

## Troubleshooting

### Notifications Not Appearing

**Check browser permissions:**
```javascript
console.log(Notification.permission); // Should be "granted"
```

**Check service worker registration:**
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
});
```

**Check push subscription:**
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub);
  });
});
```

### Edge Function Errors

**Check function logs:**
```bash
supabase functions logs send-push-notification
```

**Verify VAPID keys:**
```bash
supabase secrets list
```

**Test function directly:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"mentionedUserIds":["user-id"],"message":"Test","senderName":"Test"}'
```

### Database Trigger Not Firing

**Check if pg_net is enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

**Check configuration:**
```sql
SHOW app.supabase_url;
SHOW app.supabase_service_role_key;
```

**Check trigger exists:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_mentioned_users';
```

### Service Worker Not Updating

**Force update:**
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.update());
});
```

**Clear cache and reload:**
1. Open DevTools
2. Application > Service Workers
3. Click "Unregister"
4. Clear cache
5. Reload page

## Security Considerations

### VAPID Keys

- ✅ Public key: Safe to include in frontend code
- ❌ Private key: NEVER commit to version control
- ✅ Store private key in Supabase secrets
- ✅ Generate separate keys for each environment

### Push Subscriptions

- Subscriptions are tied to specific users via `member_id`
- Only authenticated users can create subscriptions
- Invalid subscriptions are automatically removed
- Subscriptions are deleted when users unsubscribe

### Edge Function

- Uses service role key for database access
- Validates input before processing
- Handles errors gracefully
- Logs all operations for monitoring

## Performance

### Bundle Size

The service worker and notification code adds approximately:
- Service Worker: ~15KB (gzipped)
- Workbox libraries: ~20KB (gzipped)
- Total impact: ~35KB (gzipped)

### Network Usage

- Push subscriptions: ~500 bytes per subscription
- Push notifications: ~1KB per notification
- Minimal impact on bandwidth

### Battery Impact

- Push notifications use native browser APIs
- Minimal battery drain
- Notifications are batched when possible

## Future Enhancements

Potential improvements for the notification system:

1. **Notification Preferences**
   - Allow users to customize notification types
   - Mute notifications for specific time periods
   - Configure notification sounds

2. **Rich Notifications**
   - Add action buttons (Reply, Mark as Read)
   - Include sender avatar images
   - Show message preview with formatting

3. **Notification History**
   - Store notification history in database
   - Allow users to view past notifications
   - Mark notifications as read/unread

4. **Advanced Targeting**
   - Send notifications for other events (meal changes, etc.)
   - Group notifications by type
   - Priority levels for different notification types

5. **Analytics**
   - Track notification delivery rates
   - Monitor click-through rates
   - Identify and fix failed subscriptions

## References

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
