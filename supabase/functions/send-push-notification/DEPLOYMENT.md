# Deployment Guide for Push Notifications

There are two approaches to trigger push notifications when users are mentioned in chat:

## Approach 1: Database Trigger (Recommended)

This approach uses a PostgreSQL trigger to automatically call the Edge Function when a chat message is inserted.

### Prerequisites

- Supabase project with `pg_net` extension enabled
- VAPID keys configured in Supabase secrets

### Setup

1. **Enable pg_net extension** (if not already enabled):

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

2. **Set configuration parameters**:

You need to set these at the database level or in your Supabase project settings:

```sql
-- Set in your Supabase SQL Editor
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';
```

3. **Run the migration**:

```bash
supabase db push
```

Or apply the migration file `004_create_push_notification_trigger.sql` manually.

### Advantages

- Automatic: No client-side code needed
- Reliable: Runs on the server, not affected by client disconnections
- Consistent: All mentions trigger notifications regardless of client implementation

### Disadvantages

- Requires `pg_net` extension
- Slightly more complex setup
- Harder to debug

## Approach 2: Client-Side Call (Alternative)

If `pg_net` is not available or you prefer client-side control, you can call the Edge Function directly from the chat store.

### Setup

1. **Update the chat store** to call the Edge Function after inserting a message:

```typescript
// In src/stores/chatStore.ts
sendMessage: async (message: string, mentions: string[]) => {
  try {
    set({ error: null });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get sender name
    const { data: member } = await supabase
      .from('members')
      .select('name')
      .eq('id', user.id)
      .single();

    // Insert chat message
    const { data, error } = await supabase
      .from('chats')
      .insert({
        sender_id: user.id,
        message,
        mentions,
        is_violation: false,
      })
      .select()
      .single();

    if (error) throw error;

    // If there are mentions, trigger push notifications
    if (mentions.length > 0) {
      // Call Edge Function (fire and forget - don't wait for response)
      supabase.functions
        .invoke('send-push-notification', {
          body: {
            chatId: data.id,
            mentionedUserIds: mentions,
            message,
            senderName: member?.name || 'Someone',
          },
        })
        .catch((err) => {
          console.error('Failed to send push notifications:', err);
          // Don't throw - notification failure shouldn't block message sending
        });
    }

    // ... rest of the code
  } catch (error) {
    // ... error handling
  }
},
```

### Advantages

- Simpler setup: No database trigger needed
- Easier to debug: Can see errors in browser console
- More control: Can add conditional logic

### Disadvantages

- Client-dependent: If client disconnects, notifications might not be sent
- Requires client-side code changes
- Potential for inconsistency if multiple clients

## Recommended Approach

**Use Approach 1 (Database Trigger)** for production deployments as it's more reliable and automatic.

**Use Approach 2 (Client-Side Call)** for:
- Development/testing
- Projects where `pg_net` is not available
- When you need more control over notification logic

## Testing Both Approaches

### Test Database Trigger

1. Insert a chat message with mentions directly in SQL:

```sql
INSERT INTO chats (sender_id, message, mentions)
VALUES (
  'user-id',
  'Hello @john',
  ARRAY['mentioned-user-id']::uuid[]
);
```

2. Check Edge Function logs:

```bash
supabase functions logs send-push-notification
```

### Test Client-Side Call

1. Send a message with mentions through the UI
2. Check browser console for any errors
3. Check Edge Function logs

## Troubleshooting

### Database Trigger Not Firing

- Check if `pg_net` extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- Verify configuration parameters are set: `SHOW app.supabase_url;`
- Check PostgreSQL logs for trigger errors

### Edge Function Not Receiving Requests

- Verify VAPID keys are set: `supabase secrets list`
- Check function deployment: `supabase functions list`
- Review function logs: `supabase functions logs send-push-notification`

### Notifications Not Appearing

- Check browser notification permissions
- Verify push subscription exists in database
- Test with a simple notification first
- Check service worker is registered and active
