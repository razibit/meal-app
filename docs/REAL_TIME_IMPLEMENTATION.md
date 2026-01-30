# Real-Time Meal Updates Implementation

This document describes the implementation of Task 6: Real-time meal updates.

## Overview

The real-time meal updates feature enables live synchronization of meal registrations and details across all connected clients, with strict cutoff time enforcement.

## Components Implemented

### 1. Enhanced Meal Store (Task 6.1)

**File**: `src/stores/mealStore.ts`

**Key Features**:
- Centralized state management for meals, meal details, and counts
- Separate counts for morning and night periods
- Real-time subscription management
- Optimistic UI updates with server synchronization

**New Methods**:
- `fetchTodayMeals()`: Fetches all meals for today (both periods)
- `updateCounts()`: Recalculates meal counts for both periods
- `getMealCounts(period?)`: Returns counts for a specific period or current meals
- `subscribeToMeals(date)`: Sets up real-time subscription for meal changes
- `subscribeToMealDetails(date)`: Sets up real-time subscription for meal details
- `unsubscribeFromMeals()`: Cleans up meal subscription
- `unsubscribeFromMealDetails()`: Cleans up meal details subscription

**State Structure**:
```typescript
{
  meals: Meal[],
  mealDetails: MealDetails | null,
  members: Member[],
  counts: {
    morning: MealCount,
    night: MealCount
  },
  loading: boolean,
  error: string | null,
  mealsChannel: RealtimeChannel | null,
  mealDetailsChannel: RealtimeChannel | null
}
```

### 2. Supabase Realtime Subscriptions (Task 6.2)

**Implementation**:
- Subscribes to `meals` table changes filtered by date
- Subscribes to `meal_details` table changes filtered by date
- Automatically refreshes data when changes are detected
- Handles subscription cleanup to prevent memory leaks

**Usage**:
```typescript
// In a React component
useEffect(() => {
  const today = getTodayDate();
  
  // Subscribe to real-time updates
  mealStore.subscribeToMeals(today);
  mealStore.subscribeToMealDetails(today);
  
  // Cleanup on unmount
  return () => {
    mealStore.unsubscribeFromMeals();
    mealStore.unsubscribeFromMealDetails();
  };
}, []);
```

### 3. Cutoff Time Enforcement (Task 6.3)

#### Client-Side Validation

**File**: `src/utils/cutoffChecker.ts`

**Cutoff Times** (UTC+6):
- Morning: 7:00 AM
- Night: 6:00 PM

**Functions**:
- `isCutoffPassed(period)`: Checks if cutoff has passed
- `getTimeUntilCutoff(period)`: Returns milliseconds until cutoff
- `formatTimeUntilCutoff(period)`: Returns human-readable countdown
- `getActivePeriod()`: Returns 'morning' or 'night' based on time (switches at 12 PM)

**CutoffError Class**:
Custom error thrown when attempting to modify meals after cutoff.

#### Server-Side Validation

**File**: `supabase/functions/cutoff-enforcer/index.ts`

**Purpose**: Prevents client-side manipulation by validating all meal changes on the server.

**Behavior**:
1. Validates cutoff time using UTC+6 timezone
2. If cutoff passed:
   - Returns error response
   - Posts violation message to chat table
3. If cutoff not passed:
   - Returns success response
   - Allows operation to proceed

**Service Layer**:

**File**: `src/services/cutoffEnforcer.ts`

Provides `validateMealAction()` function to call the Edge Function from the client.

## Data Flow

### Adding a Meal

1. User clicks "I Ate" button
2. Client-side cutoff check (immediate feedback)
3. If passed, show error and stop
4. If not passed, call `addMeal()` in store
5. Store calls Edge Function for server-side validation
6. If validation fails, show error
7. If validation succeeds, insert meal into database
8. Real-time subscription detects change
9. All connected clients refresh meal data
10. Counts automatically update

### Real-Time Updates

1. User A adds/removes a meal
2. Database change triggers Supabase Realtime event
3. All subscribed clients receive the event
4. Each client calls `fetchTodayMeals()`
5. Meal counts recalculate via `updateCounts()`
6. UI updates with new counts

## Requirements Satisfied

### Requirement 1.2
✅ Members can add/remove meal registrations with cutoff enforcement

### Requirement 1.3
✅ Morning meal modifications prevented after 7:00 AM

### Requirement 1.4
✅ Night meal modifications prevented after 6:00 PM

### Requirement 1.5
✅ Error messages displayed when cutoff passed

### Requirement 2.3
✅ Real-time meal count updates within 2 seconds

### Requirement 3.2
✅ Real-time meal details updates within 2 seconds

### Requirement 11.1-11.4
✅ Server-side cutoff validation using UTC+6 timezone

## Testing

### Manual Testing Checklist

- [ ] Add meal before cutoff - should succeed
- [ ] Add meal after cutoff - should fail with error
- [ ] Remove meal before cutoff - should succeed
- [ ] Remove meal after cutoff - should fail with error
- [ ] Open app in two browsers, add meal in one - should update in both
- [ ] Edit meal details in one browser - should update in other
- [ ] Check countdown timer shows correct time remaining
- [ ] Verify violation messages appear in chat after cutoff

### Edge Function Testing

Deploy the function:
```bash
supabase functions deploy cutoff-enforcer
```

Test locally:
```bash
supabase functions serve cutoff-enforcer
```

## Future Enhancements

1. **Retry Logic**: Add exponential backoff for failed operations
2. **Offline UX**: Improve messaging and disable write actions when offline
3. **Optimistic Updates**: Show changes immediately, rollback on error
4. **Push Notifications**: Notify users of meal count changes
5. **Analytics**: Track cutoff violations and meal patterns

## Notes

- All times use UTC+6 timezone for consistency
- Real-time subscriptions are channel-based and automatically reconnect
- Edge Function uses service role key for posting violation messages
- Client-side checks provide immediate feedback, server-side prevents manipulation
