import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Egg } from '../types';
import { handleError, showErrorToast } from '../utils/errorHandling';
import { getMealMonthDateRange } from '../utils/mealMonthHelpers';

interface EggState {
  eggs: Egg[];
  availableEggs: number;
  totalEggs: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchEggs: (date: string) => Promise<void>;
  fetchAvailableEggs: (date: string) => Promise<void>;
  fetchTotalEggs: () => Promise<void>;
  getUserEggQuantity: (userId: string, date: string) => number;
  updateEggQuantity: (memberId: string, date: string, quantity: number) => Promise<void>;
  updateTotalEggs: (totalEggs: number, notes?: string) => Promise<void>;
  clearError: () => void;
}

export const useEggStore = create<EggState>((set, get) => ({
  eggs: [],
  availableEggs: 0,
  totalEggs: 0,
  loading: false,
  error: null,

  fetchEggs: async (date: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('eggs')
        .select('*')
        .eq('egg_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ eggs: data || [], loading: false });
      
      // Also fetch available eggs
      await get().fetchAvailableEggs(date);
    } catch (err) {
      console.error('Error fetching eggs:', err);
      const errorMessage = handleError(err);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
    }
  },

  fetchAvailableEggs: async (_date: string) => {
    try {
      // Use the meal month period for cumulative available-eggs calculation
      const { startDate, endDate } = getMealMonthDateRange(null);
      const { data, error } = await supabase
        .rpc('get_available_eggs', {
          p_period_start: startDate,
          p_period_end: endDate,
        });

      if (error) throw error;

      set({ availableEggs: data || 0 });
    } catch (err) {
      console.error('Error fetching available eggs:', err);
    }
  },

  fetchTotalEggs: async () => {
    try {
      const { data, error } = await supabase
        .from('egg_inventory')
        .select('total_eggs')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      set({ totalEggs: data?.total_eggs || 0 });
    } catch (err) {
      console.error('Error fetching total eggs:', err);
    }
  },

  getUserEggQuantity: (userId: string, date: string) => {
    const { eggs } = get();
    const userEgg = eggs.find(
      (egg) => egg.member_id === userId && egg.egg_date === date
    );
    return userEgg ? userEgg.quantity : 0;
  },

  updateEggQuantity: async (memberId: string, date: string, quantity: number) => {
    set({ loading: true, error: null });

    try {
      if (quantity === 0) {
        // Delete the egg record if quantity is 0
        const { error: deleteError } = await supabase
          .from('eggs')
          .delete()
          .eq('member_id', memberId)
          .eq('egg_date', date);

        if (deleteError) throw deleteError;
      } else {
        // Upsert the egg record
        const { error: upsertError } = await supabase
          .from('eggs')
          .upsert(
            {
              member_id: memberId,
              egg_date: date,
              quantity: quantity,
            },
            {
              onConflict: 'member_id,egg_date',
            }
          );

        if (upsertError) throw upsertError;
      }

      // Refresh eggs data
      await get().fetchEggs(date);
      set({ loading: false });
    } catch (err) {
      console.error('Error updating egg quantity:', err);
      const errorMessage = handleError(err);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw err;
    }
  },

  updateTotalEggs: async (totalEggs: number, notes?: string) => {
    set({ loading: true, error: null });

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('egg_inventory')
        .insert({
          total_eggs: totalEggs,
          added_by: userData.user.id,
          notes: notes || null,
        });

      if (error) throw error;

      // Refresh total eggs
      await get().fetchTotalEggs();
      set({ loading: false });
    } catch (err) {
      console.error('Error updating total eggs:', err);
      const errorMessage = handleError(err);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
