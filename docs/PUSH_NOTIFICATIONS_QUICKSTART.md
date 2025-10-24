# Push Notifications Quick Start Guide

This guide will help you set up push notifications in 5 minutes.

## Prerequisites

- Supabase project set up
- Node.js and npm installed
- Supabase CLI installed

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Generate VAPID Keys

```bash
npm run generate-vapid
```

This will output something like:

```
=== VAPID Keys Generated ===

Add these to your .env file:

VITE_VAPID_PUBLIC_KEY=BKxT...

Add this to your Supabase Edge Function secrets:

VAPID_PUBLIC_KEY=BKxT...
VAPID_PRIVATE_KEY=abc123...

============================
```

## Step 3: Configure Frontend

Add to your `.env` file:

```env
VITE_VAPID_PUBLIC_KEY=your_public_key_from_step_2
```

## Step 4: Configure Backend

Set Supabase secrets:

```bash
supabase secrets set VAPID_PUBLIC_KEY=your_public_key
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
supabase secrets set VAPID_SUBJECT=mailto:your-email@example.com
```

## Step 5: Deploy Edge Function

```bash
supabase functions deploy send-push-notification
```

## Step 6: Run Database Migration

```bash
supabase db push
```

Or run manually in Supabase SQL Editor:

```sql
-- Copy and paste contents of:
-- supabase/migrations/004_create_push_notification_trigger.sql
```

## Step 7: Build and Test

```bash
# Build the app
npm run build

# Or run in development
npm run dev
```

## Testing

1. Open the app in your browser
2. Go to Preferences tab
3. Enable notifications
4. Grant browser permission
5. Open another browser window/tab
6. Log in as a different user
7. Send a message mentioning the first user
8. First user should receive a notification!

## Troubleshooting

### "VAPID keys not configured" error

- Make sure you added `VITE_VAPID_PUBLIC_KEY` to `.env`
- Restart your dev server after adding the key

### "Notification permission denied"

- Check browser settings
- Try in an incognito window
- Some browsers block notifications on localhost (use ngrok or deploy)

### No notifications received

- Check browser console for errors
- Verify Edge Function is deployed: `supabase functions list`
- Check Edge Function logs: `supabase functions logs send-push-notification`
- Ensure database trigger is created (check in Supabase SQL Editor)

### Service Worker not loading

- Clear browser cache
- Unregister old service workers in DevTools > Application > Service Workers
- Rebuild the app: `npm run build`

## Next Steps

- Read the full documentation: `docs/PUSH_NOTIFICATIONS.md`
- Customize notification appearance
- Add notification preferences
- Monitor notification delivery

## Support

If you encounter issues:

1. Check the full documentation in `docs/PUSH_NOTIFICATIONS.md`
2. Review Edge Function README: `supabase/functions/send-push-notification/README.md`
3. Check deployment guide: `supabase/functions/send-push-notification/DEPLOYMENT.md`
