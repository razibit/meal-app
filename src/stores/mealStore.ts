import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Meal, MealDetails, Member, MealCount } from '../types';
import { MealPeriod, isCutoffPassed } from '../utils/cutoffChecker';
import { getTodayDate } from '../utils/dateHelpers';
import { RealtimeChannel } from '@supabase/supabase-js';
import { validateMealAction } from '../services/cutoffEnforcer';
import { 
  CutoffError, 
  NetworkError,
  DatabaseError, 
  handleError, 
  showErrorToast 
} from '../utils/errorHandling';
import { retryDatabaseOperation } from '../utils/retryLogic';

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
  updateMealQuantity: (memberId: string, date: string, period: MealPeriod, quantity: number) => Promise<void>;
  updateAutoMeal: (memberId: string, period: MealPeriod, enabled: boolean) => Promise<void>;
  resetFutureMeals: (memberId: string, period: MealPeriod) => Promise<void>;
  updateMealDetails: (date: string, field: 'morning_details' | 'night_details' | 'notice', value: string, updatedBy: string) => Promise<void>;
  getMealCounts: (period?: MealPeriod) => MealCount;
  getUserMealQuantity: (userId: string) => number;
  getUserAutoMeal: (userId: string, period: MealPeriod) => boolean;
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
      
      const today = getTodayDate(); // Use synchronized server time
      
      // Fetch both morning and night meals for today with retry logic
      const data = await retryDatabaseOperation(async () => {
        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .eq('meal_date', today);

        if (error) throw new DatabaseError(error.message);
        return data;
      });

      set({ meals: data || [], loading: false });
      
      // Update counts after fetching meals
      get().updateCounts();
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
    }
  },

  fetchMeals: async (date: string, period: MealPeriod) => {
    try {
      set({ loading: true, error: null });

      const data = await retryDatabaseOperation(async () => {
        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .eq('meal_date', date)
          .eq('period', period);

        if (error) throw new DatabaseError(error.message);
        return data;
      });

      set({ meals: data || [], loading: false });
      
      // Update counts after fetching meals
      get().updateCounts();
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
    }
  },

  fetchMealDetails: async (date: string) => {
    try {
      const data = await retryDatabaseOperation(async () => {
        const { data, error } = await supabase
          .from('meal_details')
          .select(`
            *,
            members:updated_by (
              name
            )
          `)
          .eq('meal_date', date)
          .maybeSingle();

        if (error) {
          throw new DatabaseError(error.message);
        }

        // Transform the data to include updated_by_name
        if (data && data.members) {
          return {
            ...data,
            updated_by_name: data.members.name,
            members: undefined, // Remove the nested object
          };
        }

        return data;
      });

      set({ mealDetails: data || null });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage });
      showErrorToast(errorMessage);
    }
  },

  fetchMembers: async () => {
    try {
      const data = await retryDatabaseOperation(async () => {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('name');

        if (error) throw new DatabaseError(error.message);
        return data;
      });

      set({ members: data || [] });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage });
      showErrorToast(errorMessage);
    }
  },

  addMeal: async (memberId: string, date: string, period: MealPeriod) => {
    // Client-side cutoff check (pass date to check for future dates)
    if (isCutoffPassed(period, date)) {
      const error = new CutoffError(period);
      showErrorToast(handleError(error));
      throw error;
    }

    try {
      set({ loading: true, error: null });

      // Offline queueing removed: fail fast when offline
      if (!navigator.onLine) {
        const error = new NetworkError();
        const errorMessage = handleError(error);
        set({ error: errorMessage, loading: false });
        showErrorToast(errorMessage);
        throw error;
      }

      // Server-side cutoff validation with retry
      const validation = await retryDatabaseOperation(async () => {
        return await validateMealAction('add', memberId, date, period);
      });
      
      if (!validation.success) {
        throw new CutoffError(period);
      }

      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('meals')
          .insert({
            member_id: memberId,
            meal_date: date,
            period,
          });

        if (error) throw new DatabaseError(error.message);
      });

      // Refresh meals for the selected date and period
      await get().fetchMeals(date, period);
      
      set({ loading: false });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  removeMeal: async (memberId: string, date: string, period: MealPeriod) => {
    // Client-side cutoff check (pass date to check for future dates)
    if (isCutoffPassed(period, date)) {
      const error = new CutoffError(period);
      showErrorToast(handleError(error));
      throw error;
    }

    try {
      set({ loading: true, error: null });

      // Offline queueing removed: fail fast when offline
      if (!navigator.onLine) {
        const error = new NetworkError();
        const errorMessage = handleError(error);
        set({ error: errorMessage, loading: false });
        showErrorToast(errorMessage);
        throw error;
      }

      // Server-side cutoff validation with retry
      const validation = await retryDatabaseOperation(async () => {
        return await validateMealAction('remove', memberId, date, period);
      });
      
      if (!validation.success) {
        throw new CutoffError(period);
      }

      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('meals')
          .delete()
          .eq('member_id', memberId)
          .eq('meal_date', date)
          .eq('period', period);

        if (error) throw new DatabaseError(error.message);
      });

      // Refresh meals for the selected date and period
      await get().fetchMeals(date, period);
      
      set({ loading: false });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  updateMealQuantity: async (memberId: string, date: string, period: MealPeriod, quantity: number) => {
    // Client-side cutoff check
    if (isCutoffPassed(period, date)) {
      const error = new CutoffError(period);
      showErrorToast(handleError(error));
      throw error;
    }

    try {
      set({ loading: true, error: null });

      // Offline queueing removed: fail fast when offline
      if (!navigator.onLine) {
        const error = new NetworkError();
        const errorMessage = handleError(error);
        set({ error: errorMessage, loading: false });
        showErrorToast(errorMessage);
        throw error;
      }

      // Server-side cutoff validation
      const validation = await retryDatabaseOperation(async () => {
        return await validateMealAction('add', memberId, date, period);
      });
      
      if (!validation.success) {
        throw new CutoffError(period);
      }

      if (quantity === 0) {
        // Delete the meal if quantity is 0
        await retryDatabaseOperation(async () => {
          const { error } = await supabase
            .from('meals')
            .delete()
            .eq('member_id', memberId)
            .eq('meal_date', date)
            .eq('period', period);

          if (error) throw new DatabaseError(error.message);
        });
      } else {
        // Upsert the meal with the new quantity
        await retryDatabaseOperation(async () => {
          const { error } = await supabase
            .from('meals')
            .upsert({
              member_id: memberId,
              meal_date: date,
              period,
              quantity,
            }, {
              onConflict: 'member_id,meal_date,period'
            });

          if (error) throw new DatabaseError(error.message);
        });
      }

      // Refresh meals for the selected date and period
      await get().fetchMeals(date, period);
      
      set({ loading: false });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  updateAutoMeal: async (memberId: string, period: MealPeriod, enabled: boolean) => {
    try {
      set({ loading: true, error: null });

      const field = period === 'morning' ? 'auto_meal_morning' : 'auto_meal_night';

      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('members')
          .update({ [field]: enabled })
          .eq('id', memberId);

        if (error) throw new DatabaseError(error.message);
      });

      // If enabling auto meal, reset all future meals for this period
      if (enabled) {
        await get().resetFutureMeals(memberId, period);
      }

      // Refresh members to get updated auto meal settings
      await get().fetchMembers();
      
      set({ loading: false });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  resetFutureMeals: async (memberId: string, period: MealPeriod) => {
    try {
      const today = getTodayDate(); // Use synchronized server time

      // Delete all future meals for this member and period
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('meals')
          .delete()
          .eq('member_id', memberId)
          .eq('period', period)
          .gt('meal_date', today);

        if (error) throw new DatabaseError(error.message);
      });
    } catch (error) {
      const errorMessage = handleError(error);
      showErrorToast(errorMessage);
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
      // Offline queueing removed: fail fast when offline
      if (!navigator.onLine) {
        const error = new NetworkError();
        const errorMessage = handleError(error);
        set({ error: errorMessage });
        showErrorToast(errorMessage);
        throw error;
      }

      await retryDatabaseOperation(async () => {
        // Check if meal_details exists for this date
        const { data: existing, error: selectError } = await supabase
          .from('meal_details')
          .select('id')
          .eq('meal_date', date)
          .maybeSingle();

        // Handle unexpected errors (not "not found")
        if (selectError) {
          throw new DatabaseError(selectError.message);
        }

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('meal_details')
            .update({
              [field]: value,
              updated_by: updatedBy,
            })
            .eq('meal_date', date);

          if (error) {
            console.error('Update meal_details error:', error);
            throw new DatabaseError(error.message);
          }
        } else {
          // Insert new
          const { error } = await supabase
            .from('meal_details')
            .insert({
              meal_date: date,
              [field]: value,
              updated_by: updatedBy,
            })
            .select();

          if (error) {
            console.error('Insert meal_details error:', error);
            console.error('Insert payload:', { meal_date: date, [field]: value, updated_by: updatedBy });
            throw new DatabaseError(error.message);
          }
        }
      });

      // Refresh meal details
      await get().fetchMealDetails(date);
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  getMealCounts: (period?: MealPeriod) => {
    const { meals, members } = get();
    
    // Filter meals by period if specified
    const filteredMeals = period 
      ? meals.filter((meal) => meal.period === period)
      : meals;
    
    // Only include participants with meals > 0
    const participants: Array<{ id: string; name: string; rice_preference: string; quantity: number }> = [];
    let boiledRiceTotal = 0;
    let atopRiceTotal = 0;
    
    filteredMeals.forEach((meal) => {
      const member = members.find((m) => m.id === meal.member_id);
      if (member && meal.quantity > 0) {
        participants.push({
          id: member.id,
          name: member.name,
          rice_preference: member.rice_preference,
          quantity: meal.quantity,
        });
        
        // Add to totals based on rice preference
        if (member.rice_preference === 'boiled') {
          boiledRiceTotal += meal.quantity;
        } else {
          atopRiceTotal += meal.quantity;
        }
      }
    });

    return {
      boiledRice: boiledRiceTotal,
      atopRice: atopRiceTotal,
      total: boiledRiceTotal + atopRiceTotal,
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

  getUserMealQuantity: (userId: string) => {
    const { meals } = get();
    const userMeal = meals.find((meal) => meal.member_id === userId);
    return userMeal?.quantity ?? 0;
  },

  getUserAutoMeal: (userId: string, period: MealPeriod) => {
    const { members } = get();
    const member = members.find((m) => m.id === userId);
    if (!member) return true; // Default to true if member not found
    return period === 'morning' ? member.auto_meal_morning : member.auto_meal_night;
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
        async (payload) => {
          console.log('Meal details change detected:', payload);
          
          // Refetch meal details to get the member name
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            await get().fetchMealDetails(date);
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
