# Time Sync Deployment Guide

## Quick Deployment Steps

### 1. Apply Database Migration

You need to create the `get_server_time()` function in your Supabase database.

**Option A: Using Supabase CLI** (Recommended)
```bash
# From your project root
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/008_add_server_time_function.sql`
5. Click **Run**

**Option C: Using psql**
```bash
psql -h your-project.supabase.co -U postgres -d postgres -f supabase/migrations/008_add_server_time_function.sql
```

### 2. Verify Database Function

Run this SQL query in your Supabase SQL Editor to verify:

```sql
-- Test the function
SELECT get_server_time();

-- Check permissions
SELECT has_function_privilege('authenticated', 'get_server_time()', 'EXECUTE');
```

Expected results:
- First query: Returns current timestamp
- Second query: Returns `true`

### 3. Deploy Code

```bash
# Commit changes
git add .
git commit -m "feat: implement hybrid time synchronization

- Add Supabase RPC function for server time
- Implement TimeService singleton with offset caching
- Update all time-dependent code to use synchronized time
- Add TimeSyncIndicator UI component
- Add offline resilience with localStorage caching"

# Push to repository
git push origin main
```

### 4. Verify Deployment

After deployment, open the app and check:

1. **Console logs**: Should see time sync initialization
   ```
   [TimeSync] Initializing time service...
   [TimeSync] Initialized - Offset: 42ms
   [TimeService] Sync successful - Offset: 38ms, Latency: 95ms
   ```

2. **UI Indicator**: 
   - Should appear briefly on first load
   - Should disappear once sync is successful
   - Should only reappear if sync becomes stale

3. **Functionality**:
   - Meal registration should work normally
   - Cutoff times should be enforced correctly
   - No TypeScript errors in console

### 5. Test Time Manipulation Protection

**Test Case 1: Device Time Forward**
1. Change device time 2 hours forward
2. Try to register a meal after cutoff
3. Should be blocked (server-side validation)

**Test Case 2: Device Time Backward**
1. Change device time 2 hours backward
2. Check displayed cutoff times
3. Should still show correct times (using server time)

**Test Case 3: Offline Mode**
1. Load app and wait for sync
2. Go offline (airplane mode)
3. Check time functions still work
4. Verify using cached offset

## Rollback Plan

If you need to rollback:

### 1. Revert Code
```bash
git revert HEAD
git push origin main
```

### 2. Remove Database Function (Optional)
```sql
DROP FUNCTION IF EXISTS get_server_time();
```

Note: The function is harmless and can be left in place even if code is reverted.

## Monitoring

### Check Sync Health

Add this to your browser console:

```javascript
// Get sync status
timeService.getSyncStatus()

// Get detailed metrics
timeService.getMetrics()

// Force sync
timeService.sync()

// Get current time
timeService.now()
```

### Common Issues

**Issue: "timeService is not defined"**
- Solution: Service may still be initializing. Wait 1-2 seconds and try again.

**Issue: Sync fails repeatedly**
- Check Supabase connection is working
- Verify migration was applied correctly
- Check browser console for error details

**Issue: Offset seems too large (>1000ms)**
- This is normal for high-latency connections
- Service compensates automatically
- If consistently >5000ms, check network connection

## Performance Impact

- **Initial load**: +1 RPC call (~100-200ms)
- **Runtime**: Zero additional network calls (uses cached offset)
- **Auto-sync**: 1 RPC call every 5 minutes (background)
- **Storage**: ~50 bytes in localStorage

## Security Considerations

✅ **Enhanced Security:**
- Client-side time manipulation no longer bypasses cutoff
- Server time is source of truth
- Server-side validation still enforced (defense in depth)

⚠️ **Important Notes:**
- RPC function is accessible to authenticated users only
- Function only returns timestamp (read-only, no mutations)
- Offset is stored in localStorage (not sensitive data)

## Next Steps

1. Apply database migration
2. Deploy code
3. Test functionality
4. Monitor sync logs for first 24 hours
5. Review metrics after 1 week

## Support Checklist

Before reporting issues:
- [ ] Database migration applied successfully
- [ ] Verified function exists: `SELECT get_server_time();`
- [ ] Checked browser console for errors
- [ ] Tested with device time changed
- [ ] Captured sync metrics: `timeService.getMetrics()`

## Questions?

Check [TIME_SYNC_IMPLEMENTATION.md](./TIME_SYNC_IMPLEMENTATION.md) for detailed documentation.
