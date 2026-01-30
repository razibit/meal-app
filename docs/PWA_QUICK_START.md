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
   - The offline indicator disappears
   - You can save changes again

## Offline Indicator

Located at the bottom of the screen (above navigation on mobile):

| Color | Status | Meaning |
|-------|--------|---------|
| 🟡 Yellow | Offline | No internet connection |

## Tips

1. **Check the indicator**: If you see the offline indicator, you won’t be able to save changes

2. **Stable connection**: Ensure you have a stable internet connection for saving changes

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
- Reload the page
- Check browser console for errors

### Indicator stuck on screen
- Check internet connection
- Refresh the page

## Support

For more detailed information, see:
- [PWA Implementation Guide](./PWA_IMPLEMENTATION.md)
- [PWA Features Summary](../PWA_FEATURES_SUMMARY.md)
