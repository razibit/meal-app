# Time Synchronization Implementation

## Overview

The meal app now uses a reliable **hybrid time synchronization approach** that ensures all time-based operations use a single, trustworthy source: the Supabase PostgreSQL server time. This prevents users from manipulating device time to bypass cutoff restrictions or cause data inconsistencies.

## Architecture

### Components

1. **Supabase RPC Function** (`get_server_time`)
   - Location: `supabase/migrations/008_add_server_time_function.sql`
   - Returns PostgreSQL server timestamp
   - Accessible to authenticated users

2. **TimeService Singleton** (`src/services/timeService.ts`)
   - Synchronizes with server on startup
   - Calculates and caches time offset
   - Provides synchronized time via `timeService.now()`
   - Auto-syncs every 5 minutes
   - Persists offset in localStorage for offline resilience

3. **Updated Time Utilities**
   - `dateHelpers.ts`: Uses `timeService.now()` instead of `new Date()`
   - `cutoffChecker.ts`: Inherits synchronized time from dateHelpers
   - All time-dependent components now use synchronized time

4. **UI Indicator** (`TimeSyncIndicator.tsx`)
   - Shows sync status when stale or pending
   - Displays offset and last sync time
   - Auto-hides when sync is healthy

## How It Works

### 1. Initialization (app startup)

```typescript
// main.tsx
timeService.initialize()
  .then(() => console.log('Time synced'))
  .catch(() => console.error('Sync failed'));
```

### 2. Time Synchronization Flow

```
1. Client records request time: t0 = Date.now()
2. Call Supabase RPC: get_server_time()
3. Client records response time: t1 = Date.now()
4. Calculate latency: latency = (t1 - t0) / 2
5. Calculate offset: offset = serverTime - t0 - latency
6. Cache offset in localStorage
7. All subsequent time calls: Date.now() + offset
```

### 3. Latency Compensation

The service measures round-trip time and compensates for network latency:

- **Network latency**: Typically 50-200ms
- **Accuracy**: ±50ms (sufficient for meal cutoffs)
- **Re-sync frequency**: Every 5 minutes
- **Offline resilience**: Uses cached offset (valid for 24 hours)

### 4. Usage in Code

**Before:**
```typescript
const now = new Date();
const today = new Date().toISOString().split('T')[0];
```

**After:**
```typescript
const now = timeService.now();
const today = getTodayDate(); // Uses timeService internally
```

## Benefits

### 🎯 Security
- **Prevents time manipulation**: Users cannot bypass cutoff times by changing device clock
- **Server-side validation**: Critical operations still validated server-side (defense in depth)
- **Single source of truth**: All clients sync to same server time

### ⚡ Performance
- **Fast**: No network calls after initial sync (uses cached offset)
- **Low latency**: Offset calculation happens once every 5 minutes
- **Offline support**: Works with cached offset when network unavailable

### 🔄 Reliability
- **Auto-recovery**: Automatically retries failed syncs
- **Graceful degradation**: Falls back to cached offset if sync fails
- **Metrics tracking**: Monitors sync success rate and latency
- **Visual feedback**: UI indicator shows sync status

## Key Files Modified

### New Files
- `supabase/migrations/008_add_server_time_function.sql` - Server time RPC
- `src/services/timeService.ts` - Time synchronization service
- `src/components/layout/TimeSyncIndicator.tsx` - UI indicator

### Updated Files
- `src/main.tsx` - Initialize timeService on startup
- `src/utils/dateHelpers.ts` - Use timeService.now()
- `src/stores/mealStore.ts` - Use getTodayDate() helper
- `src/pages/MonthlyReport.tsx` - Use timeService.now()
- `src/components/preferences/ProfileSection.tsx` - Use timeService.now()
- `src/components/layout/Layout.tsx` - Add TimeSyncIndicator

## Configuration

### Environment Variables (Optional)
No additional configuration required. The service uses existing Supabase connection.

### Sync Intervals
```typescript
// In timeService.ts
private syncInterval: number = 5 * 60 * 1000; // 5 minutes
private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
```

## Monitoring

### Metrics Available
```typescript
const metrics = timeService.getMetrics();
// Returns:
// {
//   lastSyncTimestamp: number,
//   offsetMs: number,
//   syncSuccessRate: number,
//   averageLatency: number,
//   syncAttempts: number,
//   syncSuccesses: number
// }
```

### Sync Status
```typescript
const status = timeService.getSyncStatus();
// Returns:
// {
//   synced: boolean,
//   stale: boolean,
//   lastSync: Date | null,
//   offset: number
// }
```

### Console Logging
The service logs all sync operations:
```
[TimeService] Initialized - Offset: 42ms
[TimeService] Sync successful - Offset: 38ms, Latency: 95ms
[TimeService] Auto-sync triggered
```

## Testing

### Test Time Manipulation
1. Change device time forward/backward
2. Try to register meal after cutoff
3. Verify server-side enforcement still works
4. Check that displayed times remain accurate

### Test Offline Behavior
1. Go offline after initial sync
2. Verify app continues working with cached offset
3. Go back online
4. Verify sync resumes automatically

### Test Sync Recovery
1. Block network during sync
2. Verify error handling
3. Unblock network
4. Verify automatic recovery on next sync cycle

## Troubleshooting

### Sync Fails on Startup
- **Check Supabase connection**: Verify `supabase` client is configured
- **Check migration**: Ensure migration 008 has been applied
- **Check RLS**: Verify authenticated users can execute `get_server_time()`

### Time Offset Seems Wrong
- **Check server timezone**: Ensure PostgreSQL is using correct timezone
- **Clear cache**: Remove `timeSync_offset` from localStorage and reload
- **Check network**: High latency can affect accuracy

### Sync Indicator Always Shows
- **Check localStorage**: Verify offset is being cached
- **Check sync frequency**: Wait for initial sync to complete
- **Check console**: Look for sync errors in browser console

## Migration Steps

To deploy this implementation:

1. **Apply Database Migration**
   ```bash
   # Push migration to Supabase
   supabase db push
   # Or apply manually in Supabase dashboard
   ```

2. **Deploy Code**
   ```bash
   git add .
   git commit -m "Implement hybrid time synchronization"
   git push
   ```

3. **Verify**
   - Check console for sync logs
   - Verify TimeSyncIndicator appears briefly then disappears
   - Test meal registration with device time changed

## Future Enhancements

### Potential Improvements
- [ ] Add admin dashboard for monitoring sync health across users
- [ ] Implement WebSocket-based time sync for sub-second accuracy
- [ ] Add telemetry to track sync performance in production
- [ ] Create health check endpoint for monitoring systems

### Not Recommended
- ❌ More frequent syncs (increases server load unnecessarily)
- ❌ Client-side time validation only (always validate server-side)
- ❌ Removing offline support (cache is essential for UX)

## References

- [PostgreSQL Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [Network Time Protocol (NTP)](https://en.wikipedia.org/wiki/Network_Time_Protocol)
- [Lamport Timestamps](https://en.wikipedia.org/wiki/Lamport_timestamp) (for distributed systems)

## Support

For issues or questions about time synchronization:
1. Check console logs for sync errors
2. Review this documentation
3. Inspect TimeService metrics
4. Open an issue with sync status and metrics
