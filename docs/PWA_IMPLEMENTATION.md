# PWA Implementation Guide

This document describes the Progressive Web App (PWA) features implemented in the Mess Meal Management application.

## Overview

The application is a fully functional PWA that can be installed on mobile and desktop devices, works offline, and provides a native app-like experience.

## Features Implemented

### 1. Web App Manifest ✅

**Location**: `vite.config.ts` (manifest configuration)

The web app manifest enables installation and defines the app's appearance:

- **App Name**: "Mess Meal Management"
- **Short Name**: "Mess Meals"
- **Display Mode**: Standalone (full-screen without browser UI)
- **Theme Color**: #5B4B8A (eggplant theme)
- **Background Color**: #5B4B8A
- **Orientation**: Portrait-primary
- **Icons**: 192x192 and 512x512 (maskable)

**Installation**:
- On Android: Chrome will show an "Add to Home Screen" prompt
- On iOS: Use Safari's "Add to Home Screen" option
- On Desktop: Chrome/Edge will show an install button in the address bar

### 2. Service Worker with Workbox ✅

**Location**: `src/sw.ts`

The service worker provides offline functionality and caching strategies:

#### Caching Strategies

1. **Precaching** (App Shell)
   - All build assets are precached automatically
   - Ensures instant loading on repeat visits
   - Managed by Workbox precaching

2. **Network-First** (API Calls)
   - Used for Supabase API requests
   - Tries network first, falls back to cache
   - Cache expires after 5 minutes
   - Max 50 cached entries

3. **Cache-First** (Static Assets)
   - Images: Cached for 30 days, max 60 entries
   - Fonts: Cached for 1 year, max 30 entries
   - CSS/JS: Cached for 30 days, max 60 entries

#### Push Notifications

The service worker handles push notifications:
- Receives push events from the server
- Displays notifications with custom title, body, and icon
- Handles notification clicks to open the app
- Navigates to the relevant page (e.g., /chat for mentions)

### 3. Offline Behavior

This app requires an internet connection to save changes. When offline, actions fail with a network error and the UI shows an offline indicator.

## Usage

### For Users

1. **Install the App**:
   - Visit the app in a browser
   - Look for the "Install" prompt or button
   - Click "Install" to add to home screen

2. **Use Offline**:
   - Open the installed app
   - Actions work even without internet
   - Changes sync automatically when online

3. **Receive Notifications**:
   - Enable notifications in Preferences
   - Get notified when mentioned in chat
   - Works even when app is closed

### For Developers

#### Generate Icons

Run the icon generator to create placeholder icons:

```bash
npm run generate-icons
```

This creates SVG placeholders. For production, convert to PNG:

```bash
# Using ImageMagick
convert public/icon-192.svg public/icon-192.png
convert public/icon-512.svg public/icon-512.png
convert public/badge-72.svg public/badge-72.png

# Or use an online converter
# https://cloudconvert.com/svg-to-png
```

#### Test Offline Functionality

1. **Chrome DevTools**:
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Offline" checkbox
   - Try adding meals, sending messages
   - Uncheck "Offline" to see sync

2. **Service Worker**:
   - Go to Application tab in DevTools
   - Click "Service Workers"
   - See registration status
   - Click "Update" to reload SW

3. **Cache Storage**:
   - Go to Application > Cache Storage
   - See cached assets
   - Clear cache to test fresh loads

#### Offline Behavior

When offline, write operations (meal changes, chat sending, updates) will fail with a network error. The UI displays an offline indicator while disconnected.

## Configuration

### Vite PWA Plugin

**Location**: `vite.config.ts`

```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'autoUpdate',
  includeAssets: [...],
  manifest: {...},
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    maximumFileSizeToCacheInBytes: 3000000
  },
  devOptions: {
    enabled: true,
    type: 'module'
  }
})
```

### Service Worker Registration

**Location**: `src/main.tsx`

The service worker is automatically registered by vite-plugin-pwa. No manual registration needed.

## Testing Checklist

- [ ] App installs on Android
- [ ] App installs on iOS
- [ ] App installs on Desktop (Chrome/Edge)
- [ ] App works offline
- [ ] Meal registrations queue when offline
- [ ] Chat messages queue when offline
- [ ] Queue syncs when back online
- [ ] Offline indicator shows correct status
- [ ] Push notifications work
- [ ] Notification clicks open correct page
- [ ] Cache updates on new deployment
- [ ] App shell loads instantly on repeat visits

## Performance Metrics

Target metrics for PWA:

- **First Contentful Paint**: < 2s on 3G
- **Time to Interactive**: < 3s on 3G
- **Bundle Size**: < 200KB gzipped
- **Lighthouse PWA Score**: 90+

Run Lighthouse audit:

```bash
# Build the app
npm run build

# Serve the build
npm run preview

# Open Chrome DevTools > Lighthouse
# Run PWA audit
```

## Troubleshooting

### Service Worker Not Updating

1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear cache in DevTools
3. Unregister SW in Application tab
4. Close all tabs and reopen

### Offline Actions Failing

1. Check internet connection
2. Reload the page after reconnecting
3. Check browser console for errors

### Icons Not Showing

1. Ensure PNG files exist in `public/` directory
2. Check file names match manifest
3. Clear browser cache
4. Reinstall the app

### Push Notifications Not Working

1. Check notification permissions
2. Verify VAPID keys are configured
3. Check service worker is active
4. Test with browser DevTools > Application > Push

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Partial support (no push notifications on iOS)
- **Samsung Internet**: Full support

## Security Considerations

1. **HTTPS Required**: PWA features only work over HTTPS
2. **VAPID Keys**: Keep private key secure (server-side only)
3. **Cache Expiration**: API cache expires after 5 minutes
4. **Validation**: Server validates all write actions

## Future Enhancements

- [ ] Background sync API for more reliable syncing
- [ ] Periodic background sync for fetching updates
- [ ] Share target API for sharing to the app
- [ ] Shortcuts API for quick actions
- [ ] Badge API for unread count on app icon
- [ ] File handling API for opening meal reports

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Web App Manifest](https://web.dev/add-manifest/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
