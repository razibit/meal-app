import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { MealRateSnapshot } from '../types';

interface MealRateState {
  /** Latest computed meal rate (from DB history) */
  currentRate: MealRateSnapshot | null;
  /** Ordered newest→oldest */
  history: MealRateSnapshot[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchLatestRate: (startDate: string, endDate: string) => Promise<void>;
  fetchHistory: (startDate: string, endDate: string, limit?: number) => Promise<void>;
  /** Subscribe to realtime inserts on the history table */
  subscribeToRateChanges: (startDate: string, endDate: string) => void;
  unsubscribeFromRateChanges: () => void;
  clearError: () => void;
}

export const useMealRateStore = create<MealRateState>((set, get) => {
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  return {
    currentRate: null,
    history: [],
    loading: false,
    error: null,

    fetchLatestRate: async (startDate: string, endDate: string) => {
      try {
        const { data, error } = await supabase.rpc('get_latest_meal_rate', {
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (error) throw error;

        const rows = data as MealRateSnapshot[] | null;
        set({ currentRate: rows && rows.length > 0 ? rows[0] : null });
      } catch (err) {
        console.error('Error fetching latest meal rate:', err);
        set({ error: 'Failed to fetch latest meal rate' });
      }
    },

    fetchHistory: async (startDate: string, endDate: string, limit = 50) => {
      set({ loading: true, error: null });
      try {
        const { data, error } = await supabase.rpc('get_meal_rate_history', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_limit: limit,
        });

        if (error) throw error;

        const rows = (data || []) as MealRateSnapshot[];
        set({
          history: rows,
          currentRate: rows.length > 0 ? rows[0] : null,
          loading: false,
        });
      } catch (err) {
        console.error('Error fetching meal rate history:', err);
        set({ error: 'Failed to fetch meal rate history', loading: false });
      }
    },

    subscribeToRateChanges: (startDate: string, endDate: string) => {
      // Clean up any existing subscription
      get().unsubscribeFromRateChanges();

      realtimeChannel = supabase
        .channel('meal-rate-history-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'meal_rate_history',
          },
          (payload) => {
            const newRow = payload.new as MealRateSnapshot;
            // Only update if this row belongs to the current period
            if (
              newRow.period_start === startDate &&
              newRow.period_end === endDate
            ) {
              set((state) => ({
                currentRate: newRow,
                history: [newRow, ...state.history],
              }));
            }
          }
        )
        .subscribe();
    },

    unsubscribeFromRateChanges: () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    },

    clearError: () => set({ error: null }),
  };
});
