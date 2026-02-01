import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Egg } from '../types';
import { handleError, showErrorToast } from '../utils/errorHandling';

interface EggState {
  eggs: Egg[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchEggs: (date: string) => Promise<void>;
  getUserEggQuantity: (userId: string, date: string) => number;
  updateEggQuantity: (memberId: string, date: string, quantity: number) => Promise<void>;
  clearError: () => void;
}

export const useEggStore = create<EggState>((set, get) => ({
  eggs: [],
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
    } catch (err) {
      console.error('Error fetching eggs:', err);
      const errorMessage = handleError(err);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
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

  clearError: () => set({ error: null }),
}));
