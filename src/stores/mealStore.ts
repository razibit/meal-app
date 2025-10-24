import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Meal, MealDetails, Member, MealCount } from '../types';
import { MealPeriod, isCutoffPassed, CutoffError } from '../utils/cutoffChecker';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getTodayDate } from '../utils/dateHelpers';
import { validateMealAction } from '../services/cutoffEnforcer';

interface MealState {
  meals: Meal[];
  mealDetails: MealDetails | null;
  members: Member[];
  counts: { morning: MealCount; night: MealCount };
  loading: boolean;
  error: string | null;
  mealsChannel: RealtimeChannel | null;
  mealDetailsChannel: RealtimeChannel | null;
  
  // Actions
  fetchTodayMeals: () => Promise<void>;
  fetchMeals: (date: string, period: MealPeriod) => Promise<void>;
  fetchMealDetails: (date: string) => Promise<void>;
  fetchMembers: () => Promise<void>;
  addMeal: (memberId: string, date: string, period: MealPeriod) => Promise<void>;
  removeMeal: (memberId: string, date: string, period: MealPeriod) => Promise<void>;
  updateMealDetails: (date: string, field: 'morning_details' | 'night_details' | 'notice', value: string, updatedBy: string) => Promise<void>;
  getMealCounts: (period?: MealPeriod) => MealCount;
  updateCounts: () => void;
  hasUserRegistered: (userId: string) => boolean;
  clearError: () => void;
  subscribeToMeals: (date: string) => void;
  subscribeToMealDetails: (date: string) => void;
  unsubscribeFromMeals: () => void;
  unsubscribeFromMealDetails: () => void;
}

export const useMealStore = create<MealState>((set, get) => ({
  meals: [],
  mealDetails: null,
  members: [],
  counts: {
    morning: { boiledRice: 0, atopRice: 0, total: 0, participants: [] },
    night: { boiledRice: 0, atopRice: 0, total: 0, participants: [] },
  },
  loading: false,
  error: null,
  mealsChannel: null,
  mealDetailsChannel: null,

  fetchTodayMeals: async () => {
    try {
      set({ loading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch both morning and night meals for today
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('meal_date', today);

      if (error) throw error;

      set({ meals: data || [], loading: false });
      
      // Update counts after fetching meals
      get().updateCounts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch today\'s meals';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchMeals: async (date: string, period: MealPeriod) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('meal_date', date)
        .eq('period', period);

      if (error) throw error;

      set({ meals: data || [], loading: false });
      
      // Update counts after fetching meals
      get().updateCounts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch meals';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchMealDetails: async (date: string) => {
    try {
      const { data, error } = await supabase
        .from('meal_details')
        .select('*')
        .eq('meal_date', date)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is okay
        throw error;
      }

      set({ mealDetails: data || null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch meal details';
      set({ error: errorMessage });
    }
  },

  fetchMembers: async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;

      set({ members: data || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch members';
      set({ error: errorMessage });
    }
  },

  addMeal: async (memberId: string, date: string, period: MealPeriod) => {
    // Client-side cutoff check
    if (isCutoffPassed(period)) {
      throw new CutoffError(period);
    }

    try {
      set({ loading: true, error: null });

      // Server-side cutoff validation
      const validation = await validateMealAction('add', memberId, date, period);
      
      if (!validation.success) {
        throw new Error(validation.error || 'Cutoff time has passed');
      }

      const { error } = await supabase
        .from('meals')
        .insert({
          member_id: memberId,
          meal_date: date,
          period,
        });

      if (error) throw error;

      // Refresh today's meals to get both periods
      await get().fetchTodayMeals();
      
      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add meal';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  removeMeal: async (memberId: string, date: string, period: MealPeriod) => {
    // Client-side cutoff check
    if (isCutoffPassed(period)) {
      throw new CutoffError(period);
    }

    try {
      set({ loading: true, error: null });

      // Server-side cutoff validation
      const validation = await validateMealAction('remove', memberId, date, period);
      
      if (!validation.success) {
        throw new Error(validation.error || 'Cutoff time has passed');
      }

      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('member_id', memberId)
        .eq('meal_date', date)
        .eq('period', period);

      if (error) throw error;

      // Refresh today's meals to get both periods
      await get().fetchTodayMeals();
      
      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove meal';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateMealDetails: async (
    date: string,
    field: 'morning_details' | 'night_details' | 'notice',
    value: string,
    updatedBy: string
  ) => {
    try {
      // Check if meal_details exists for this date
      const { data: existing } = await supabase
        .from('meal_details')
        .select('id')
        .eq('meal_date', date)
        .single();

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

      // Refresh meal details
      await get().fetchMealDetails(date);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update meal details';
      set({ error: errorMessage });
      throw error;
    }
  },

  getMealCounts: (period?: MealPeriod) => {
    const { meals, members } = get();
    
    // Filter meals by period if specified
    const filteredMeals = period 
      ? meals.filter((meal) => meal.period === period)
      : meals;
    
    const participants: Array<{ id: string; name: string; rice_preference: string }> = [];
    
    filteredMeals.forEach((meal) => {
      const member = members.find((m) => m.id === meal.member_id);
      if (member) {
        participants.push({
          id: member.id,
          name: member.name,
          rice_preference: member.rice_preference,
        });
      }
    });

    const boiledRice = participants.filter((p) => p.rice_preference === 'boiled').length;
    const atopRice = participants.filter((p) => p.rice_preference === 'atop').length;

    return {
      boiledRice,
      atopRice,
      total: boiledRice + atopRice,
      participants,
    };
  },

  updateCounts: () => {
    const morningCount = get().getMealCounts('morning');
    const nightCount = get().getMealCounts('night');
    
    set({
      counts: {
        morning: morningCount,
        night: nightCount,
      },
    });
  },

  hasUserRegistered: (userId: string) => {
    const { meals } = get();
    return meals.some((meal) => meal.member_id === userId);
  },

  clearError: () => set({ error: null }),

  subscribeToMeals: (date: string) => {
    // Unsubscribe from existing channel if any
    get().unsubscribeFromMeals();

    const channel = supabase
      .channel(`meals-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `meal_date=eq.${date}`,
        },
        (payload) => {
          console.log('Meals change detected:', payload);
          
          // Refresh meals when any change is detected
          get().fetchTodayMeals();
        }
      )
      .subscribe((status) => {
        console.log('Meals subscription status:', status);
      });

    set({ mealsChannel: channel });
  },

  subscribeToMealDetails: (date: string) => {
    // Unsubscribe from existing channel if any
    get().unsubscribeFromMealDetails();

    const channel = supabase
      .channel(`meal-details-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_details',
          filter: `meal_date=eq.${date}`,
        },
        (payload) => {
          console.log('Meal details change detected:', payload);
          
          // Update meal details in state
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            set({ mealDetails: payload.new as MealDetails });
          } else if (payload.eventType === 'DELETE') {
            set({ mealDetails: null });
          }
        }
      )
      .subscribe((status) => {
        console.log('Meal details subscription status:', status);
      });

    set({ mealDetailsChannel: channel });
  },

  unsubscribeFromMeals: () => {
    const { mealsChannel } = get();
    if (mealsChannel) {
      supabase.removeChannel(mealsChannel);
      set({ mealsChannel: null });
    }
  },

  unsubscribeFromMealDetails: () => {
    const { mealDetailsChannel } = get();
    if (mealDetailsChannel) {
      supabase.removeChannel(mealDetailsChannel);
      set({ mealDetailsChannel: null });
    }
  },
}));
