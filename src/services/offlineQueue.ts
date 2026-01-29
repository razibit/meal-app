/**
 * Offline Queue Service
 * 
 * Queues meal changes and chat messages when offline,
 * then processes them when connection is restored.
 */

import { supabase } from './supabase';
import type { MealPeriod } from '../utils/cutoffChecker';

export interface QueuedAction {
  id: string;
  type: 'add_meal' | 'remove_meal' | 'send_message' | 'update_meal_details' | 'update_meal_quantity';
  payload: any;
  timestamp: number;
  retries: number;
}

export type QueueStatus = 'idle' | 'processing' | 'error';

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private storageKey = 'offline-queue';
  private isProcessing = false;
  private maxRetries = 3;
  private listeners: Set<(status: QueueStatus, queueLength: number) => void> = new Set();

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  /**
   * Set up listener for online/offline events
   */
  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('Connection restored, processing offline queue...');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost, actions will be queued');
    });
  }

  /**
   * Add an action to the queue
   */
  add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) {
    const queuedAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(queuedAction);
    this.saveQueue();
    this.notifyListeners('idle', this.queue.length);

    console.log('Action queued:', queuedAction);

    // Try to process immediately if online
    if (navigator.onLine && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process all queued actions
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    if (!navigator.onLine) {
      console.log('Cannot process queue: offline');
      return;
    }

    this.isProcessing = true;
    this.notifyListeners('processing', this.queue.length);

    console.log(`Processing ${this.queue.length} queued actions...`);

    while (this.queue.length > 0) {
      const action = this.queue[0];

      try {
        await this.executeAction(action);
        
        // Success - remove from queue
        this.queue.shift();
        this.saveQueue();
        this.notifyListeners('processing', this.queue.length);
        
        console.log('Action processed successfully:', action.id);
      } catch (error) {
        console.error('Failed to process queued action:', error);

        // Increment retry count
        action.retries++;

        if (action.retries >= this.maxRetries) {
          // Max retries reached - remove from queue
          console.error(`Action ${action.id} failed after ${this.maxRetries} retries, removing from queue`);
          this.queue.shift();
          this.saveQueue();
          this.notifyListeners('error', this.queue.length);
        } else {
          // Keep in queue for retry
          this.saveQueue();
          this.notifyListeners('error', this.queue.length);
          break; // Stop processing, will retry later
        }
      }
    }

    this.isProcessing = false;
    
    if (this.queue.length === 0) {
      console.log('Queue processing complete');
      this.notifyListeners('idle', 0);
    }
  }

  /**
   * Execute a single queued action
   */
  private async executeAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'add_meal':
        await this.executeMealAction('add', action.payload);
        break;

      case 'remove_meal':
        await this.executeMealAction('remove', action.payload);
        break;

      case 'send_message':
        await this.executeSendMessage(action.payload);
        break;

      case 'update_meal_details':
        await this.executeUpdateMealDetails(action.payload);
        break;

      case 'update_meal_quantity':
        await this.executeUpdateMealQuantity(action.payload);
        break;

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Execute meal add/remove action
   */
  private async executeMealAction(
    actionType: 'add' | 'remove',
    payload: { memberId: string; date: string; period: MealPeriod }
  ) {
    const { memberId, date, period } = payload;

    if (actionType === 'add') {
      const { error } = await supabase
        .from('meals')
        .insert({
          member_id: memberId,
          meal_date: date,
          period,
        });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('member_id', memberId)
        .eq('meal_date', date)
        .eq('period', period);

      if (error) throw error;
    }
  }

  /**
   * Execute send message action
   */
  private async executeSendMessage(payload: {
    senderId: string;
    message: string;
    mentions: string[];
  }) {
    const { senderId, message, mentions } = payload;

    const { error } = await supabase
      .from('chats')
      .insert({
        sender_id: senderId,
        message,
        mentions,
        is_violation: false,
      });

    if (error) throw error;
  }

  /**
   * Execute update meal details action
   */
  private async executeUpdateMealDetails(payload: {
    date: string;
    field: 'morning_details' | 'night_details' | 'notice';
    value: string;
    updatedBy: string;
  }) {
    const { date, field, value, updatedBy } = payload;

    // Check if meal_details exists for this date
    const { data: existing } = await supabase
      .from('meal_details')
      .select('id')
      .eq('meal_date', date)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('meal_details')
        .update({
          [field]: value,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('meal_date', date);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('meal_details')
        .insert({
          meal_date: date,
          [field]: value,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    }
  }

  /**
   * Execute update meal quantity action
   */
  private async executeUpdateMealQuantity(payload: {
    memberId: string;
    date: string;
    period: MealPeriod;
    quantity: number;
  }) {
    const { memberId, date, period, quantity } = payload;

    if (quantity === 0) {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('member_id', memberId)
        .eq('meal_date', date)
        .eq('period', period);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('meals')
      .upsert({
        member_id: memberId,
        meal_date: date,
        period,
        quantity,
      }, {
        onConflict: 'member_id,meal_date,period',
      });

    if (error) throw error;
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`Loaded ${this.queue.length} queued actions from storage`);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    if (this.isProcessing) return 'processing';
    if (this.queue.length > 0) return 'error';
    return 'idle';
  }

  /**
   * Clear the entire queue
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners('idle', 0);
    console.log('Queue cleared');
  }

  /**
   * Subscribe to queue status changes
   */
  subscribe(listener: (status: QueueStatus, queueLength: number) => void) {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    listener(this.getStatus(), this.queue.length);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: QueueStatus, queueLength: number) {
    this.listeners.forEach((listener) => {
      try {
        listener(status, queueLength);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();
