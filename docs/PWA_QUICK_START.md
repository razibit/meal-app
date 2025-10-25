# PWA Quick Start Guide

## Installation

### On Android (Chrome/Edge/Samsung Internet)

1. Open the app in your browser
2. Tap the menu (⋮) in the top-right
3. Select "Install app" or "Add to Home screen"
4. Confirm installation
5. App icon appears on home screen

### On iOS (Safari)

1. Open the app in Safari
2. Tap the Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"
5. App icon appears on home screen

### On Desktop (Chrome/Edge)

1. Open the app in your browser
2. Look for the install icon (⊕) in the address bar
3. Click "Install"
4. App opens in its own window
5. App appears in your applications

## Using Offline

### What Works Offline?

✅ **Viewing cached data**:
- Previously loaded meals
- Previously loaded chat messages
- Previously loaded member list

✅ **Making changes** (queued for sync):
- Adding meals
- Removing meals
- Sending chat messages
- Updating meal details/notice

❌ **What doesn't work offline**:
- Loading new data
- Real-time updates
- Push notifications

### How It Works

1. **When you go offline**:
   - Yellow indicator appears at bottom
   - "You are offline" message
   - Actions are queued automatically

2. **Making changes offline**:
   - Tap "I Ate" or send a message
   - Action is saved to queue
   - Indicator shows "X actions pending"

3. **When you come back online**:
   - Indicator turns blue (syncing)
   - Queue processes automatically
   - Indicator turns green (synced)
   - Then disappears

4. **If sync fails**:
   - Indicator turns red
   - "Sync failed" message
   - Tap "Retry" button to try again

## Offline Indicator

Located at the bottom of the screen (above navigation on mobile):

| Color | Status | Meaning |
|-------|--------|---------|
| 🟡 Yellow | Offline | No internet connection |
| 🔵 Blue (spinning) | Syncing | Processing queued actions |
| 🔴 Red | Error | Sync failed, tap Retry |
| 🟢 Green | Success | All changes synced |

## Tips

1. **Check the indicator**: Always look at the indicator to know your sync status

2. **Don't close the app**: Keep the app open while syncing to ensure all changes are saved

3. **Retry on error**: If you see a red indicator, tap "Retry" to try syncing again

4. **Stable connection**: Ensure you have a stable internet connection for syncing

5. **Clear queue**: If you have persistent issues, you may need to clear the queue (contact support)

## Troubleshooting

### App won't install
- Make sure you're using a supported browser (Chrome, Edge, Firefox, Safari)
- Check that you're on HTTPS (not HTTP)
- Try clearing browser cache and reloading

### Offline mode not working
- Check that service worker is registered (DevTools > Application > Service Workers)
- Try uninstalling and reinstalling the app
- Clear browser cache

### Changes not syncing
- Check internet connection
- Look for red indicator and tap "Retry"
- Close and reopen the app
- Check browser console for errors

### Indicator stuck on "Syncing"
- Wait a few moments (may take time with slow connection)
- Check internet connection
- Refresh the page
- Clear queue (contact support if needed)

## Advanced

### For Developers

**Check queue status**:
```javascript
// Open browser console
offlineQueue.getQueueLength() // Number of pending actions
offlineQueue.getStatus() // 'idle', 'processing', or 'error'
```

**Manually process queue**:
```javascript
offlineQueue.processQueue()
```

**Clear queue** (use with caution):
```javascript
offlineQueue.clearQueue()
```

**Subscribe to changes**:
```javascript
const unsubscribe = offlineQueue.subscribe((status, length) => {
  console.log(`Status: ${status}, Pending: ${length}`);
});

// Later, unsubscribe
unsubscribe();
```

## Support

For more detailed information, see:
- [PWA Implementation Guide](./PWA_IMPLEMENTATION.md)
- [PWA Features Summary](../PWA_FEATURES_SUMMARY.md)
