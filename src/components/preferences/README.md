# Preferences Components

This directory contains the components for the Preferences tab, implementing task 9 from the implementation plan.

## Components

### ProfileSection
**File:** `ProfileSection.tsx`

Displays and allows editing of user profile information.

**Features:**
- Display user name, email, and phone number
- Inline editing for name and phone (email is read-only)
- Save button with loading state
- Success and error message display
- Optimistic UI updates

**Requirements:** 6.1

### MealMonthConfig
**File:** `MealMonthConfig.tsx`

Allows users to configure custom meal management month date ranges.

**Features:**
- Display current meal month period (custom or default 6th-to-5th)
- Date pickers for custom START and END dates
- Validation (end date must be after start date)
- Reset to default button when custom dates are set
- Success and error message display
- Info tooltip about default behavior
- Direct integration with monthly report

**Default Behavior:** 6th of one month to 5th of next month

**Database Fields:** `meal_month_start_date`, `meal_month_end_date` in `members` table

**Related Files:**
- `src/utils/mealMonthHelpers.ts` - Date range calculation utilities
- `src/pages/MonthlyReport.tsx` - Consumes configured date ranges

### ThemeToggle
**File:** `ThemeToggle.tsx`

Allows users to switch between eggplant and dark themes.

**Features:**
- Visual theme selector with preview colors
- Applies theme via CSS variables
- Persists theme preference to localStorage
- Smooth transition animations (respects prefers-reduced-motion)
- Active theme indicator

**Requirements:** 6.3, 6.4

### NotificationSettings
**File:** `NotificationSettings.tsx`

Manages browser push notification permissions and settings.

**Features:**
- Display current notification permission status
- Toggle to enable/disable notifications
- Request browser permission when enabling
- Show instructions if permission is blocked
- Test notification on successful enable
- Browser compatibility check

**Requirements:** 6.2

## Services

### notifications.ts
**File:** `../services/notifications.ts`

Service module for handling Web Push notifications.

**Functions:**
- `isNotificationSupported()` - Check browser support
- `getNotificationPermission()` - Get current permission status
- `requestNotificationPermission()` - Request user permission
- `showTestNotification()` - Display a test notification
- `subscribeToPush(userId)` - Subscribe to push notifications (ready for task 10)
- `unsubscribeFromPush(userId)` - Unsubscribe from push notifications

**Note:** Full push notification implementation with VAPID keys will be completed in task 10.

## Theme System

The theme system uses CSS variables defined in `src/index.css`:

### Eggplant Theme (Default)
- Primary: `#5B4B8A`
- Accent: `#E8B4F0`
- Background: White/Light purple tones
- Text: Dark colors

### Dark Theme
- Primary: `#7B6BAA`
- Accent: `#E8B4F0`
- Background: Dark grays
- Text: Light colors

Themes are applied by setting `data-theme` attribute on the document root element.

## Usage

```tsx
import { ProfileSection } from '../components/preferences/ProfileSection';
import { ThemeToggle } from '../components/preferences/ThemeToggle';
import { NotificationSettings } from '../components/preferences/NotificationSettings';

function Preferences() {
  return (
    <div className="space-y-6">
      <ProfileSection />
      <ThemeToggle />
      <NotificationSettings />
    </div>
  );
}
```

## Styling

All components use Tailwind CSS with custom utility classes:
- `.card` - Card container with border and shadow
- `.btn-primary` - Primary action button
- `.btn-secondary` - Secondary action button
- `.input` - Form input field

Colors reference CSS variables for theme support:
- `bg-primary`, `bg-secondary`, `bg-tertiary` - Background colors
- `text-primary`, `text-secondary`, `text-tertiary` - Text colors
- `border`, `border-light` - Border colors
- `primary`, `primary-light`, `primary-dark` - Primary colors

## Future Enhancements (Task 10)

When implementing task 10 (Push Notifications), the following will be added:
- VAPID key configuration
- Push subscription storage in database
- Edge Function for sending push notifications
- Service worker push event handling
- Notification click handling to open chat tab
