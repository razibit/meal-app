import { supabase } from './supabase';

interface TimeSyncCache {
  offset: number;
  timestamp: number;
}

interface TimeSyncMetrics {
  lastSyncTimestamp: number;
  offsetMs: number;
  syncSuccessRate: number;
  averageLatency: number;
  syncAttempts: number;
  syncSuccesses: number;
}

/**
 * TimeService - Singleton service for reliable time synchronization with server
 * 
 * Features:
 * - Syncs with Supabase server time on startup
 * - Compensates for network latency
 * - Caches offset in localStorage for offline resilience
 * - Auto-syncs periodically (every 5 minutes)
 * - Provides sync status and metrics
 */
export class TimeService {
  private static instance: TimeService;
  private offsetMs: number = 0;
  private lastSync: number = 0;
  private isSyncing: boolean = false;
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes
  private intervalId?: number;
  
  // Metrics tracking
  private metrics: TimeSyncMetrics = {
    lastSyncTimestamp: 0,
    offsetMs: 0,
    syncSuccessRate: 100,
    averageLatency: 0,
    syncAttempts: 0,
    syncSuccesses: 0,
  };
  
  private latencies: number[] = [];
  private readonly CACHE_KEY = 'timeSync_offset';
  private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_LATENCY_SAMPLES = 10;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TimeService {
    if (!TimeService.instance) {
      TimeService.instance = new TimeService();
    }
    return TimeService.instance;
  }

  /**
   * Initialize time service - call once on app startup
   */
  async initialize(): Promise<void> {
    // Load cached offset
    this.loadCachedOffset();
    
    // Perform initial sync
    await this.sync();
    
    // Set up auto-sync
    this.startAutoSync();
  }

  /**
   * Load cached offset from localStorage
   */
  private loadCachedOffset(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const data: TimeSyncCache = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        
        if (age < this.MAX_CACHE_AGE) {
          this.offsetMs = data.offset;
          this.lastSync = data.timestamp;
          console.log(`[TimeService] Loaded cached offset: ${this.offsetMs}ms (age: ${Math.round(age / 1000)}s)`);
        } else {
          console.log(`[TimeService] Cached offset expired (age: ${Math.round(age / 1000)}s)`);
          localStorage.removeItem(this.CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('[TimeService] Error loading cached offset:', error);
    }
  }

  /**
   * Save offset to localStorage
   */
  private cacheOffset(): void {
    try {
      const data: TimeSyncCache = {
        offset: this.offsetMs,
        timestamp: this.lastSync,
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[TimeService] Error caching offset:', error);
    }
  }

  /**
   * Sync with server time
   */
  async sync(): Promise<boolean> {
    if (this.isSyncing) {
      console.log('[TimeService] Sync already in progress, skipping');
      return false;
    }
    
    this.isSyncing = true;
    this.metrics.syncAttempts++;

    try {
      // Measure request time
      const clientRequestTime = Date.now();
      
      // Call server function
      const { data, error } = await supabase.rpc('get_server_time');
      
      const clientResponseTime = Date.now();
      const roundTripTime = clientResponseTime - clientRequestTime;
      const latency = roundTripTime / 2;

      if (error) {
        console.error('[TimeService] Sync error:', error);
        this.updateMetrics(false, 0);
        return false;
      }

      if (!data) {
        console.error('[TimeService] No data returned from server');
        this.updateMetrics(false, 0);
        return false;
      }

      // Calculate offset with latency compensation
      const serverTime = new Date(data).getTime();
      const estimatedServerTimeNow = serverTime + latency;
      this.offsetMs = estimatedServerTimeNow - clientResponseTime;
      this.lastSync = Date.now();
      
      // Update metrics
      this.updateMetrics(true, latency);
      
      // Cache for offline use
      this.cacheOffset();
      
      console.log(`[TimeService] Sync successful - Offset: ${this.offsetMs}ms, Latency: ${latency}ms`);
      return true;
      
    } catch (error) {
      console.error('[TimeService] Sync failed:', error);
      this.updateMetrics(false, 0);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Update metrics after sync attempt
   */
  private updateMetrics(success: boolean, latency: number): void {
    if (success) {
      this.metrics.syncSuccesses++;
      this.latencies.push(latency);
      
      // Keep only recent latency samples
      if (this.latencies.length > this.MAX_LATENCY_SAMPLES) {
        this.latencies.shift();
      }
      
      // Calculate average latency
      this.metrics.averageLatency = 
        this.latencies.reduce((sum, l) => sum + l, 0) / this.latencies.length;
    }
    
    this.metrics.syncSuccessRate = 
      (this.metrics.syncSuccesses / this.metrics.syncAttempts) * 100;
    this.metrics.lastSyncTimestamp = this.lastSync;
    this.metrics.offsetMs = this.offsetMs;
  }

  /**
   * Start automatic periodic sync
   */
  private startAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = window.setInterval(() => {
      console.log('[TimeService] Auto-sync triggered');
      this.sync();
    }, this.syncInterval);
  }

  /**
   * Stop automatic sync (cleanup)
   */
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Get current time synchronized with server
   */
  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  /**
   * Get current timestamp synchronized with server
   */
  nowTimestamp(): number {
    return Date.now() + this.offsetMs;
  }

  /**
   * Get current time offset in milliseconds
   */
  getOffset(): number {
    return this.offsetMs;
  }

  /**
   * Get age of last successful sync in milliseconds
   */
  getLastSyncAge(): number {
    return Date.now() - this.lastSync;
  }

  /**
   * Check if sync is stale (older than 1 hour)
   */
  isSyncStale(): boolean {
    return this.getLastSyncAge() > 60 * 60 * 1000; // 1 hour
  }

  /**
   * Check if currently syncing
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get sync metrics
   */
  getMetrics(): TimeSyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Get sync status for display
   */
  getSyncStatus(): {
    synced: boolean;
    stale: boolean;
    lastSync: Date | null;
    offset: number;
  } {
    return {
      synced: this.lastSync > 0,
      stale: this.isSyncStale(),
      lastSync: this.lastSync > 0 ? new Date(this.lastSync) : null,
      offset: this.offsetMs,
    };
  }
}

// Export singleton instance
export const timeService = TimeService.getInstance();
