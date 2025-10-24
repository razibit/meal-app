# Real-Time Meal Updates Integration Guide

This guide shows how to integrate the real-time meal updates feature into your React components.

## Setup in Home Component

```typescript
import { useEffect } from 'react';
import { useMealStore } from '../stores/mealStore';
import { useAuthStore } from '../stores/authStore';
import { getTodayDate } from '../utils/dateHelpers';
import { getActivePeriod, isCutoffPassed, formatTimeUntilCutoff } from '../utils/cutoffChecker';

export function Home() {
  const { user } = useAuthStore();
  const {
    meals,
    mealDetails,
    counts,
    loading,
    error,
    fetchTodayMeals,
    fetchMealDetails,
    fetchMembers,
    subscribeToMeals,
    subscribeToMealDetails,
    unsubscribeFromMeals,
    unsubscribeFromMealDetails,
    addMeal,
    removeMeal,
    hasUserRegistered,
    clearError,
  } = useMealStore();

  const today = getTodayDate();
  const [activePeriod, setActivePeriod] = useState(getActivePeriod());

  // Initialize data and subscriptions
  useEffect(() => {
    // Fetch initial data
    fetchTodayMeals();
    fetchMealDetails(today);
    fetchMembers();

    // Subscribe to real-time updates
    subscribeToMeals(today);
    subscribeToMealDetails(today);

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeFromMeals();
      unsubscribeFromMealDetails();
    };
  }, []);

  // Handle meal registration
  const handleAddMeal = async () => {
    if (!user) return;

    try {
      await addMeal(user.id, today, activePeriod);
      // Success - UI will update automatically via real-time subscription
    } catch (error) {
      // Error is already set in store
      console.error('Failed to add meal:', error);
    }
  };

  const handleRemoveMeal = async () => {
    if (!user) return;

    try {
      await removeMeal(user.id, today, activePeriod);
      // Success - UI will update automatically via real-time subscription
    } catch (error) {
      console.error('Failed to remove meal:', error);
    }
  };

  const isRegistered = user ? hasUserRegistered(user.id) : false;
  const cutoffPassed = isCutoffPassed(activePeriod);
  const timeRemaining = formatTimeUntilCutoff(activePeriod);

  return (
    <div>
      {/* Period Toggle */}
      <div>
        <button onClick={() => setActivePeriod('morning')}>Morning</button>
        <button onClick={() => setActivePeriod('night')}>Night</button>
      </div>

      {/* Cutoff Timer */}
      <div>{timeRemaining}</div>

      {/* Meal Counts */}
      <div>
        <p>Boiled Rice: {counts[activePeriod].boiledRice}</p>
        <p>Atop Rice: {counts[activePeriod].atopRice}</p>
        <p>Total: {counts[activePeriod].total}</p>
      </div>

      {/* Registration Button */}
      <button
        onClick={isRegistered ? handleRemoveMeal : handleAddMeal}
        disabled={cutoffPassed || loading}
      >
        {isRegistered ? 'Remove Meal' : 'I Ate'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      {/* Meal Details */}
      <div>
        {activePeriod === 'morning' 
          ? mealDetails?.morning_details 
          : mealDetails?.night_details}
      </div>
    </div>
  );
}
```

## Displaying Participants

```typescript
import { useMealStore } from '../stores/mealStore';

export function ParticipantsList({ period }: { period: 'morning' | 'night' }) {
  const { counts } = useMealStore();
  const participants = counts[period].participants;

  return (
    <div>
      <h3>Participants ({participants.length})</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.id}>
            {p.name} - {p.rice_preference === 'boiled' ? 'Boiled' : 'Atop'} Rice
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Updating Meal Details

```typescript
import { useState } from 'react';
import { useMealStore } from '../stores/mealStore';
import { useAuthStore } from '../stores/authStore';
import { getTodayDate } from '../utils/dateHelpers';

export function MealDetailsEditor({ period }: { period: 'morning' | 'night' }) {
  const { user } = useAuthStore();
  const { mealDetails, updateMealDetails } = useMealStore();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');

  const today = getTodayDate();
  const field = period === 'morning' ? 'morning_details' : 'night_details';
  const currentValue = mealDetails?.[field] || '';

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateMealDetails(today, field, value, user.id);
      setIsEditing(false);
      // UI will update automatically via real-time subscription
    } catch (error) {
      console.error('Failed to update meal details:', error);
    }
  };

  return (
    <div>
      {isEditing ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
          />
        </div>
      ) : (
        <div onClick={() => {
          setValue(currentValue);
          setIsEditing(true);
        }}>
          {currentValue || 'Click to add menu details'}
        </div>
      )}
    </div>
  );
}
```

## Handling Cutoff Errors

```typescript
import { CutoffError } from '../utils/cutoffChecker';

try {
  await addMeal(userId, date, period);
} catch (error) {
  if (error instanceof CutoffError) {
    // Show user-friendly cutoff message
    showToast(error.message, 'error');
  } else {
    // Handle other errors
    showToast('Failed to add meal', 'error');
  }
}
```

## Auto-Switching Period

```typescript
import { useEffect, useState } from 'react';
import { getActivePeriod } from '../utils/cutoffChecker';

export function useActivePeriod() {
  const [period, setPeriod] = useState(getActivePeriod());

  useEffect(() => {
    // Update period every minute
    const interval = setInterval(() => {
      setPeriod(getActivePeriod());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return [period, setPeriod] as const;
}
```

## Countdown Timer

```typescript
import { useEffect, useState } from 'react';
import { formatTimeUntilCutoff, MealPeriod } from '../utils/cutoffChecker';

export function CutoffTimer({ period }: { period: MealPeriod }) {
  const [timeRemaining, setTimeRemaining] = useState(formatTimeUntilCutoff(period));

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeUntilCutoff(period));
    }, 1000);

    return () => clearInterval(interval);
  }, [period]);

  return <div className="countdown">{timeRemaining}</div>;
}
```

## Best Practices

1. **Always cleanup subscriptions**: Use `useEffect` cleanup to unsubscribe
2. **Handle errors gracefully**: Display user-friendly error messages
3. **Show loading states**: Disable buttons while operations are in progress
4. **Optimistic updates**: The store handles this automatically
5. **Check cutoff before actions**: Disable buttons when cutoff has passed
6. **Use TypeScript**: Leverage type safety for meal periods and actions

## Common Pitfalls

1. **Forgetting to unsubscribe**: Causes memory leaks
2. **Not checking user authentication**: Always verify user exists before operations
3. **Ignoring cutoff checks**: Always check cutoff before enabling actions
4. **Not handling errors**: Always wrap async operations in try-catch
5. **Multiple subscriptions**: Ensure you unsubscribe before subscribing again
