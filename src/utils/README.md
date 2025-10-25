# Utilities Documentation

## Error Handling (`errorHandling.ts`)

This module provides comprehensive error handling utilities for the Mess Meal Management System.

### Custom Error Types

- **CutoffError**: Thrown when meal actions are attempted after cutoff time
- **NetworkError**: Thrown when network operations fail
- **AuthenticationError**: Thrown when authentication fails
- **DatabaseError**: Thrown when database operations fail
- **ValidationError**: Thrown when validation fails

### Functions

#### `handleError(error: unknown): string`

Converts any error into a user-friendly message. Handles specific error types and Supabase/PostgreSQL errors.

**Example:**
```typescript
try {
  await someDatabaseOperation();
} catch (error) {
  const message = handleError(error);
  console.log(message); // "Failed to save changes. Please try again."
}
```

#### `showErrorToast(message: string, options?: ErrorToastOptions): void`

Displays an error toast notification to the user.

**Options:**
- `duration`: Auto-dismiss duration in ms (default: 5000)
- `position`: Toast position (default: 'top-right')
- `dismissible`: Whether user can dismiss (default: true)

**Example:**
```typescript
showErrorToast('Failed to save meal', {
  duration: 3000,
  position: 'top-right'
});
```

#### `showSuccessToast(message: string, options?: ErrorToastOptions): void`

Displays a success toast notification.

**Example:**
```typescript
showSuccessToast('Meal saved successfully!');
```

## Retry Logic (`retryLogic.ts`)

This module provides retry logic with exponential backoff for critical operations.

### Configuration

Default retry configuration:
- **maxRetries**: 3 attempts
- **baseDelay**: 1000ms (1 second)
- **maxDelay**: 10000ms (10 seconds)
- Exponential backoff with jitter

### Functions

#### `retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>`

Retries a function with exponential backoff.

**Example:**
```typescript
const result = await retryWithBackoff(
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  {
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error);
    }
  }
);
```

#### `retryDatabaseOperation<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>`

Wrapper for database operations with retry logic. Automatically retries on connection/timeout errors but not on validation errors.

**Example:**
```typescript
const data = await retryDatabaseOperation(async () => {
  const { data, error } = await supabase
    .from('meals')
    .select('*');
  
  if (error) throw new DatabaseError(error.message);
  return data;
});
```

#### `retryNetworkOperation<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>`

Wrapper for network operations with retry logic.

**Example:**
```typescript
const response = await retryNetworkOperation(async () => {
  const res = await fetch('/api/endpoint');
  if (!res.ok) throw new NetworkError(`HTTP ${res.status}`);
  return res.json();
});
```

#### `createRetryableFunction<TArgs, TReturn>(fn: (...args: TArgs) => Promise<TReturn>, options?: RetryOptions)`

Creates a retryable version of an async function.

**Example:**
```typescript
const fetchDataWithRetry = createRetryableFunction(
  async (id: string) => {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new DatabaseError(error.message);
    return data;
  },
  { maxRetries: 3, baseDelay: 1000 }
);

const meal = await fetchDataWithRetry('meal-id');
```

## Integration with Stores

All Zustand stores (`mealStore`, `chatStore`, `authStore`) have been updated to use these utilities:

1. **Error Handling**: All errors are processed through `handleError()` and displayed via `showErrorToast()`
2. **Retry Logic**: Critical database operations use `retryDatabaseOperation()` for automatic retry
3. **User Feedback**: Users see friendly error messages instead of technical errors

### Example from mealStore

```typescript
fetchTodayMeals: async () => {
  try {
    set({ loading: true, error: null });
    
    const data = await retryDatabaseOperation(async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('meal_date', today);

      if (error) throw new DatabaseError(error.message);
      return data;
    });

    set({ meals: data || [], loading: false });
    get().updateCounts();
  } catch (error) {
    const errorMessage = handleError(error);
    set({ error: errorMessage, loading: false });
    showErrorToast(errorMessage);
  }
}
```

## Best Practices

1. **Always wrap database operations** in `retryDatabaseOperation()` for automatic retry
2. **Use custom error types** (CutoffError, DatabaseError, etc.) for better error handling
3. **Show user feedback** via `showErrorToast()` for all user-facing errors
4. **Don't retry validation errors** - they won't succeed on retry
5. **Configure retry options** based on operation criticality
