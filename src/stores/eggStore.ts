import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Egg, EggInventory } from '../types';
import { handleError, showErrorToast } from '../utils/errorHandling';
import { getTodayDate } from '../utils/dateHelpers';

interface EggInventoryWithMember extends EggInventory {
  member_name?: string;
}

interface EggState {
  eggs: Egg[];
  availableEggs: number;
  totalEggs: number;
  totalAddedThisPeriod: number;
  inventoryHistory: EggInventoryWithMember[];
  eggPrice: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchEggs: (date: string) => Promise<void>;
  fetchAvailableEggs: (date: string) => Promise<void>;
  fetchTotalEggs: () => Promise<void>;
  fetchTotalAddedThisPeriod: (asOfDate: string) => Promise<void>;
  fetchInventoryHistory: () => Promise<void>;
  fetchEggPrice: () => Promise<void>;
  updateEggPrice: (price: number) => Promise<void>;
  getUserEggQuantity: (userId: string, date: string) => number;
  updateEggQuantity: (memberId: string, date: string, quantity: number) => Promise<void>;
  updateTotalEggs: (totalEggs: number, notes?: string) => Promise<void>;
  clearError: () => void;
}

export const useEggStore = create<EggState>((set, get) => ({
  eggs: [],
  availableEggs: 0,
  totalEggs: 0,
  totalAddedThisPeriod: 0,
  inventoryHistory: [],
  eggPrice: 0,
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
      const { data, error } = await supabase
        .rpc('get_available_eggs', {
          p_as_of_date: _date,
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

  fetchTotalAddedThisPeriod: async (asOfDate: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_total_eggs_added', { p_as_of_date: asOfDate });

      if (error) throw error;

      set({ totalAddedThisPeriod: data || 0 });
    } catch (err) {
      console.error('Error fetching total eggs added this period:', err);
    }
  },

  fetchInventoryHistory: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('egg_inventory')
        .select(`
          id,
          total_eggs,
          added_by,
          notes,
          created_at,
          updated_at,
          members:added_by (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include member_name
      const historyWithNames = (data || []).map((item: any) => ({
        id: item.id,
        total_eggs: item.total_eggs,
        added_by: item.added_by,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        member_name: item.members?.name || 'Unknown',
      }));

      set({ inventoryHistory: historyWithNames, loading: false });
    } catch (err) {
      console.error('Error fetching inventory history:', err);
      const errorMessage = handleError(err);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
    }
  },

  fetchEggPrice: async () => {
    try {
      const { data, error } = await supabase
        .from('egg_price_config')
        .select('price_per_egg')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      set({ eggPrice: data?.price_per_egg ?? 0 });
    } catch (err) {
      console.error('Error fetching egg price:', err);
    }
  },

  updateEggPrice: async (price: number) => {
    set({ loading: true, error: null });

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('egg_price_config')
        .insert({
          price_per_egg: price,
          updated_by: userData.user.id,
        });

      if (error) throw error;

      set({ eggPrice: price, loading: false });
    } catch (err) {
      console.error('Error updating egg price:', err);
      const errorMessage = handleError(err);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw err;
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

      // Refresh total added this period for the Preferences card
      await get().fetchTotalAddedThisPeriod(getTodayDate());

      // Refresh available eggs shown in header (use today's date)
      await get().fetchAvailableEggs(getTodayDate());
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
