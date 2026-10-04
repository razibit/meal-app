# Time Synchronization Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Application Code                      │  │
│  │                                                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────────┐  │  │
│  │  │ dateHelpers│  │cutoffChecker│  │   mealStore    │  │  │
│  │  │    .ts     │  │    .ts      │  │     .ts         │  │  │
│  │  └──────┬─────┘  └──────┬──────┘  └────────┬────────┘  │  │
│  │         │                │                   │           │  │
│  │         │   getCurrentTimeInTimezone()      │           │  │
│  │         │   getTodayDate()                  │           │  │
│  │         │                │                   │           │  │
│  │         └────────────────┴───────────────────┘           │  │
│  │                          │                               │  │
│  │                          ▼                               │  │
│  │                 ┌─────────────────┐                     │  │
│  │                 │   TimeService   │                     │  │
│  │                 │   (Singleton)   │                     │  │
│  │                 └────────┬────────┘                     │  │
│  │                          │                               │  │
│  │         ┌────────────────┼────────────────┐             │  │
│  │         │                │                │             │  │
│  │         ▼                ▼                ▼             │  │
│  │  ┌───────────┐  ┌──────────────┐  ┌──────────┐        │  │
│  │  │   now()   │  │   sync()     │  │ Metrics  │        │  │
│  │  │           │  │              │  │ Tracking │        │  │
│  │  │ Returns:  │  │ Syncs with   │  │          │        │  │
│  │  │ Date.now()│  │ server and   │  │ - Offset │        │  │
│  │  │ + offset  │  │ calculates   │  │ - Latency│        │  │
│  │  │           │  │ offset       │  │ - Success│        │  │
│  │  └───────────┘  └──────┬───────┘  └──────────┘        │  │
│  │                         │                               │  │
│  └─────────────────────────┼───────────────────────────────┘  │
│                            │                                   │
│  ┌─────────────────────────┼───────────────────────────────┐  │
│  │        localStorage      │                               │  │
│  │  ┌───────────────────────▼──────────────┐               │  │
│  │  │  timeSync_offset                     │               │  │
│  │  │  {                                   │               │  │
│  │  │    offset: 42,      // milliseconds  │               │  │
│  │  │    timestamp: 1234  // when cached   │               │  │
│  │  │  }                                   │               │  │
│  │  └──────────────────────────────────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                   │
└────────────────────────────┼───────────────────────────────────┘
                             │
                             │ RPC Call: get_server_time()
                             │ Frequency: Startup + Every 5 min
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                PostgreSQL Database                       │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │   FUNCTION get_server_time()                      │ │  │
│  │  │   RETURNS timestamptz                             │ │  │
│  │  │                                                    │ │  │
│  │  │   BEGIN                                            │ │  │
│  │  │     RETURN now();  ← PostgreSQL system time       │ │  │
│  │  │   END;                                             │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  Security: Accessible only to authenticated users       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Time Synchronization Sequence

```
┌────────┐                    ┌──────────┐                 ┌──────────┐
│ Client │                    │TimeService│                 │ Supabase │
└───┬────┘                    └────┬─────┘                 └────┬─────┘
    │                              │                            │
    │ 1. App Starts               │                            │
    │────────────────────────────>│                            │
    │                              │                            │
    │                              │ 2. Load cached offset      │
    │                              │    from localStorage       │
    │                              │◄───────────                │
    │                              │                            │
    │                              │ 3. Record t0 = Date.now()  │
    │                              │──────────┐                 │
    │                              │          │                 │
    │                              │◄─────────┘                 │
    │                              │                            │
    │                              │ 4. Call get_server_time()  │
    │                              │───────────────────────────>│
    │                              │                            │
    │                              │                            │ 5. Execute
    │                              │                            │    now()
    │                              │                            │────┐
    │                              │                            │    │
    │                              │                            │◄───┘
    │                              │                            │
    │                              │ 6. Return server timestamp │
    │                              │◄───────────────────────────│
    │                              │                            │
    │                              │ 7. Record t1 = Date.now()  │
    │                              │──────────┐                 │
    │                              │          │                 │
    │                              │◄─────────┘                 │
    │                              │                            │
    │                              │ 8. Calculate:              │
    │                              │    latency = (t1-t0)/2     │
    │                              │    offset = server - t0    │
    │                              │              - latency      │
    │                              │──────────┐                 │
    │                              │          │                 │
    │                              │◄─────────┘                 │
    │                              │                            │
    │                              │ 9. Cache offset            │
    │                              │    in localStorage         │
    │                              │───────────>                │
    │                              │                            │
    │ 10. Sync complete           │                            │
    │◄─────────────────────────────│                            │
    │                              │                            │
    │ 11. Get synced time         │                            │
    │────────────────────────────>│                            │
    │                              │                            │
    │                              │ 12. Return Date.now()      │
    │                              │     + offset               │
    │◄─────────────────────────────│                            │
    │                              │                            │
    │                              │                            │
    │ ... 5 minutes later ...     │                            │
    │                              │                            │
    │                              │ 13. Auto-sync triggered    │
    │                              │ (Repeat steps 3-9)         │
    │                              │                            │
    │                              │                            │
```

## Latency Compensation

```
Timeline of a sync operation:

t0: Client sends request ────────┐
                                 │
                                 │  Network latency
                                 │  (typically 50-200ms)
                                 │
Server processes request ────────┤  Server execution
(timestamp = T)                  │  (negligible ~1ms)
                                 │
                                 │  Network latency
                                 │  (typically 50-200ms)
t1: Client receives response ────┘

Calculation:
- Round-trip time (RTT) = t1 - t0
- Estimated latency = RTT / 2
- Offset = T - t0 - latency

Example:
- t0 = 1000ms (local)
- Server time T = 1150ms
- t1 = 1200ms (local)
- RTT = 200ms
- Latency = 100ms
- Offset = 1150 - 1000 - 100 = 50ms

All future time calls:
synced_time = Date.now() + 50ms
```

## Cache Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Cache Lifecycle                          │
└─────────────────────────────────────────────────────────────┘

 App Start
    │
    ▼
┌────────────────┐
│ Check cache    │  ← Read timeSync_offset from localStorage
└───────┬────────┘
        │
        ├─────────────┐
        │             │
   Cache exists   No cache
   & valid        or expired
        │             │
        ▼             ▼
   ┌────────┐    ┌────────┐
   │Use     │    │Start   │
   │cached  │    │with 0  │
   │offset  │    │offset  │
   └────┬───┘    └────┬───┘
        │             │
        └──────┬──────┘
               │
               ▼
        ┌──────────────┐
        │ Sync with    │  ← Initial sync on startup
        │ server       │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ Update cache │  ← Store new offset
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ Auto-sync    │  ← Every 5 minutes
        │ every 5 min  │
        └──────┬───────┘
               │
               ▼
        (repeat forever)

Cache data structure:
{
  offset: number,      // milliseconds
  timestamp: number    // when cached (Date.now())
}

Cache validity: 24 hours
```

## Usage in Application Code

```
Before Time Sync:                After Time Sync:
─────────────────                ────────────────

❌ const now = new Date();       ✅ const now = timeService.now();

❌ const today =                 ✅ const today = getTodayDate();
   new Date()
   .toISOString()
   .split('T')[0];

❌ const cutoff =                ✅ const cutoff =
   new Date();                      getCurrentTimeInTimezone();
   cutoff.setHours(7);              cutoff.setHours(7);

❌ Device time                   ✅ Server time
   (can be manipulated)              (single source of truth)
```

## Error Handling & Resilience

```
                    ┌──────────────────────┐
                    │   Sync Attempt       │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Network Available?  │
                    └──┬──────────────┬────┘
                       │              │
                  ✅ Yes          ❌ No
                       │              │
            ┌──────────▼──────┐       │
            │ Call Supabase   │       │
            │ get_server_time │       │
            └──┬──────────────┘       │
               │                      │
    ┌──────────▼──────────┐           │
    │   Success?          │           │
    └──┬──────────────┬───┘           │
       │              │               │
  ✅ Yes          ❌ Failed          │
       │              │               │
       │              └───────┬───────┘
       │                      │
       ▼                      ▼
┌──────────────┐     ┌────────────────┐
│ Update offset│     │ Use cached     │
│ Cache result │     │ offset         │
│ Success      │     │ Log warning    │
└──────────────┘     └────────────────┘
       │                      │
       └──────────┬───────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Continue using │
         │ timeService    │
         └────────────────┘

Graceful degradation:
1. Fresh sync (best case)
2. Recent cached offset (<1 hour)
3. Stale cached offset (<24 hours)
4. No cache (worst case, offset = 0)
```
