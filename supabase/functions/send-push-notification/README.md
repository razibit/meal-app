# Send Push Notification Edge Function

This Edge Function sends Web Push notifications to users when they are mentioned in chat messages.

## Overview

The function is automatically triggered by a database trigger when a new chat message with mentions is inserted. It:

1. Receives mentioned user IDs, message content, and sender name
2. Queries the `push_subscriptions` table for active subscriptions
3. Sends Web Push notifications using the web-push library
4. Handles failed subscriptions by removing invalid ones

## Configuration

### Environment Variables

Set these secrets in your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set VAPID_PUBLIC_KEY=your_public_key
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
supabase secrets set VAPID_SUBJECT=mailto:your-email@example.com

# Or use the Supabase Dashboard
# Project Settings > Edge Functions > Secrets
```

### Generate VAPID Keys

Use the script in the project root:

```bash
npm install --save-dev web-push
node scripts/generate-vapid-keys.js
```

Or use the web-push CLI:

```bash
npx web-push generate-vapid-keys
```

## Deployment

Deploy the function using the Supabase CLI:

```bash
supabase functions deploy send-push-notification
```

## Database Trigger

The function is called automatically by a PostgreSQL trigger when a chat message with mentions is inserted. See `supabase/migrations/004_create_push_notification_trigger.sql`.

## Request Format

```typescript
{
  "chatId": "string",
  "mentionedUserIds": ["user-id-1", "user-id-2"],
  "message": "string",
  "senderName": "string"
}
```

## Response Format

### Success

```json
{
  "success": true,
  "message": "Sent 2 notifications, 0 failed",
  "results": [
    { "success": true, "memberId": "user-id-1" },
    { "success": true, "memberId": "user-id-2" }
  ]
}
```

### Error

```json
{
  "success": false,
  "error": "Error message"
}
```

## Notification Payload

The push notification sent to users contains:

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

## Error Handling

- **410 Gone / 404 Not Found**: Invalid subscriptions are automatically removed from the database
- **Missing VAPID keys**: Returns 500 error
- **No subscriptions**: Returns success with message "No active subscriptions found"
- **Network errors**: Logged but don't prevent other notifications from being sent

## Testing

### Manual Testing

You can test the function manually using curl:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mentionedUserIds": ["user-id"],
    "message": "Test message",
    "senderName": "Test User"
  }'
```

### Integration Testing

The function is automatically tested when:
1. A user sends a chat message with @mentions
2. The database trigger fires
3. Push notifications are sent to mentioned users

## Monitoring

Check function logs:

```bash
supabase functions logs send-push-notification
```

Or view logs in the Supabase Dashboard:
- Edge Functions > send-push-notification > Logs

## Dependencies

- `web-push@3.6.6`: Web Push protocol implementation
- `@supabase/supabase-js@2`: Supabase client for database operations

## Security

- Uses Supabase service role key for database access
- VAPID private key is stored securely in Supabase secrets
- Only processes messages with valid mentions array
- Automatically cleans up invalid subscriptions
