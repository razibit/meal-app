# Push Notifications Implementation Checklist

Use this checklist to verify the push notification system is properly set up.

## ✅ Code Implementation

- [x] **Notifications Service** (`src/services/notifications.ts`)
  - [x] VAPID key conversion utilities
  - [x] subscribeToPush() function
  - [x] unsubscribeFromPush() function
  - [x] Browser permission handling

- [x] **Service Worker** (`src/sw.ts`)
  - [x] Push event handler
  - [x] Notification click handler
  - [x] Workbox caching strategies
  - [x] Precaching configuration

- [x] **Edge Function** (`supabase/functions/send-push-notification/`)
  - [x] Function implementation
  - [x] Web Push integration
  - [x] Subscription management
  - [x] Error handling

- [x] **Database Migration** (`supabase/migrations/004_create_push_notification_trigger.sql`)
  - [x] Trigger function
  - [x] Trigger on chats table
  - [x] pg_net integration

- [x] **Build Configuration**
  - [x] vite.config.ts updated for injectManifest
  - [x] package.json dependencies added
  - [x] npm scripts added

## 📋 Setup Tasks

### Development Setup

- [ ] Run `npm install` to install dependencies
- [ ] Run `npm run generate-vapid` to generate VAPID keys
- [ ] Add `VITE_VAPID_PUBLIC_KEY` to `.env` file
- [ ] Test in development: `npm run dev`

### Supabase Setup

- [ ] Set VAPID secrets in Supabase:
  ```bash
  supabase secrets set VAPID_PUBLIC_KEY=...
  supabase secrets set VAPID_PRIVATE_KEY=...
  supabase secrets set VAPID_SUBJECT=mailto:...
  ```
- [ ] Deploy Edge Function:
  ```bash
  supabase functions deploy send-push-notification
  ```
- [ ] Run database migration:
  ```bash
  supabase db push
  ```
- [ ] Verify trigger exists in database

### Production Deployment

- [ ] Build application: `npm run build`
- [ ] Deploy to hosting (Render, Vercel, etc.)
- [ ] Verify service worker is registered
- [ ] Test push notifications end-to-end

## 🧪 Testing Checklist

### Browser Permissions

- [ ] Open app in browser
- [ ] Navigate to Preferences tab
- [ ] Click "Enable Notifications"
- [ ] Browser shows permission prompt
- [ ] Grant permission
- [ ] Verify subscription saved to database

### Push Notifications

- [ ] Open app in two browser windows
- [ ] Log in as different users
- [ ] Send message with @mention from window 1
- [ ] Verify notification appears in window 2
- [ ] Click notification
- [ ] Verify app opens to chat tab

### Edge Function

- [ ] Check function is deployed: `supabase functions list`
- [ ] View function logs: `supabase functions logs send-push-notification`
- [ ] Test function manually with curl
- [ ] Verify notifications are sent

### Database Trigger

- [ ] Insert chat message with mentions in SQL
- [ ] Verify trigger fires
- [ ] Check Edge Function logs
- [ ] Verify notifications sent

## 📚 Documentation

- [x] Quick Start Guide (`docs/PUSH_NOTIFICATIONS_QUICKSTART.md`)
- [x] Complete Implementation Guide (`docs/PUSH_NOTIFICATIONS.md`)
- [x] Edge Function README (`supabase/functions/send-push-notification/README.md`)
- [x] Deployment Guide (`supabase/functions/send-push-notification/DEPLOYMENT.md`)
- [x] VAPID Key Generation Guide (`scripts/README.md`)
- [x] Implementation Summary (`PUSH_NOTIFICATIONS_SUMMARY.md`)

## 🔍 Verification Commands

```bash
# Check if dependencies are installed
npm list workbox-precaching workbox-routing workbox-strategies

# Verify VAPID keys are set
supabase secrets list

# Check Edge Function deployment
supabase functions list

# View Edge Function logs
supabase functions logs send-push-notification

# Check database trigger
# Run in Supabase SQL Editor:
SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_mentioned_users';

# Check service worker registration (in browser console)
navigator.serviceWorker.getRegistration().then(reg => console.log(reg));

# Check push subscription (in browser console)
navigator.serviceWorker.ready.then(reg => 
  reg.pushManager.getSubscription().then(sub => console.log(sub))
);
```

## ⚠️ Common Issues

### Issue: "VAPID keys not configured"
**Solution:** Add VITE_VAPID_PUBLIC_KEY to .env and restart dev server

### Issue: Notifications not appearing
**Solution:** Check browser permissions, verify subscription exists, check Edge Function logs

### Issue: Service worker not loading
**Solution:** Clear cache, unregister old service workers, rebuild app

### Issue: Database trigger not firing
**Solution:** Verify pg_net extension is enabled, check configuration parameters

## 📊 Success Criteria

- [x] All code files created and error-free
- [ ] Dependencies installed successfully
- [ ] VAPID keys generated and configured
- [ ] Edge Function deployed and running
- [ ] Database trigger created and functional
- [ ] Service worker registered and active
- [ ] Push notifications working end-to-end
- [ ] Documentation complete and accurate

## 🎉 Next Steps

Once all checklist items are complete:

1. Test with real users
2. Monitor Edge Function logs for errors
3. Track notification delivery rates
4. Consider adding notification preferences
5. Implement notification history
6. Add rich notification features (action buttons, images)

## 📞 Support Resources

- Quick Start: `docs/PUSH_NOTIFICATIONS_QUICKSTART.md`
- Full Guide: `docs/PUSH_NOTIFICATIONS.md`
- Edge Function Docs: `supabase/functions/send-push-notification/README.md`
- Deployment Options: `supabase/functions/send-push-notification/DEPLOYMENT.md`
