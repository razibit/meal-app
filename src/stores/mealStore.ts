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
  getMealCounts: (period?: MealPeriod, date?: string) => MealCount;
  getUserMealQuantity: (userId: string, period: MealPeriod, date: string) => number;
  getUserAutoMeal: (userId: string, period: MealPeriod) => boolean;
  getUserAutoMealQuantity: (userId: string, period: MealPeriod) => number;
  updateCounts: (date?: string) => void;
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
      get().updateCounts(today);
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
      get().updateCounts(date);
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

      // Update Auto Meal quantity if Auto Meal is enabled for this period
      const { members } = get();
      const member = members.find(m => m.id === memberId);
      if (member) {
        const autoMealEnabled = period === 'morning' ? member.auto_meal_morning : member.auto_meal_night;
        
        if (autoMealEnabled) {
          const quantityField = period === 'morning' ? 'auto_meal_morning_quantity' : 'auto_meal_night_quantity';
          
          await retryDatabaseOperation(async () => {
            const { error } = await supabase
              .from('members')
              .update({ [quantityField]: quantity })
              .eq('id', memberId);

            if (error) throw new DatabaseError(error.message);
          });
        }
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

      // Refresh meals and members to get updated auto meal quantity
      await get().fetchMeals(date, period);
      await get().fetchMembers();
      
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
      // This removes any explicit meal records so Auto Meal logic applies
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
      const cutoffPassed = isCutoffPassed(period, today);

      // If cutoff hasn't passed, also delete today's meal so Auto Meal applies
      // If cutoff has passed, keep today's meal as-is (only delete future)
      const dateFilter = cutoffPassed ? 'gt' : 'gte';

      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('meals')
          .delete()
          .eq('member_id', memberId)
          .eq('period', period)
          [dateFilter]('meal_date', today);

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

  getMealCounts: (period?: MealPeriod, date?: string) => {
    const { meals, members } = get();
    const targetDate = date || getTodayDate();
    const todayDate = getTodayDate();
    
    // Filter meals by period if specified
    const filteredMeals = period 
      ? meals.filter((meal) => meal.period === period)
      : meals;
    
    // Only include participants with meals > 0
    const participants: Array<{ id: string; name: string; rice_preference: string; quantity: number }> = [];
    let boiledRiceTotal = 0;
    let atopRiceTotal = 0;
    
    // Track which members have explicit meal records
    const membersWithMeals = new Set<string>();
    
    filteredMeals.forEach((meal) => {
      const member = members.find((m) => m.id === meal.member_id);
      if (member && meal.quantity > 0) {
        membersWithMeals.add(member.id);
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
    
    // Add members with Auto Meal enabled who don't have explicit meals
    if (period) {
      const autoMealField = period === 'morning' ? 'auto_meal_morning' : 'auto_meal_night';
      const autoMealQuantityField = period === 'morning' ? 'auto_meal_morning_quantity' : 'auto_meal_night_quantity';
      
      members.forEach((member) => {
        // Skip if member already has an explicit meal
        if (membersWithMeals.has(member.id)) return;
        
        // Check if Auto Meal is enabled for this period
        if (!member[autoMealField]) return;
        
        // For current date, check if cutoff has passed
        if (targetDate === todayDate) {
          const cutoffPassed = isCutoffPassed(period, targetDate);
          // If cutoff passed, Auto Meal doesn't apply to today
          if (cutoffPassed) return;
        }
        
        // For past dates, Auto Meal shouldn't apply (they should have explicit records)
        if (targetDate < todayDate) return;
        
        // Get the stored Auto Meal quantity
        const autoMealQuantity = member[autoMealQuantityField];
        
        // Add member with Auto Meal quantity
        participants.push({
          id: member.id,
          name: member.name,
          rice_preference: member.rice_preference,
          quantity: autoMealQuantity,
        });
        
        // Add to totals
        if (member.rice_preference === 'boiled') {
          boiledRiceTotal += autoMealQuantity;
        } else {
          atopRiceTotal += autoMealQuantity;
        }
      });
    }

    return {
      boiledRice: boiledRiceTotal,
      atopRice: atopRiceTotal,
      total: boiledRiceTotal + atopRiceTotal,
      participants,
    };
  },

  updateCounts: (date?: string) => {
    const targetDate = date || getTodayDate();
    const morningCount = get().getMealCounts('morning', targetDate);
    const nightCount = get().getMealCounts('night', targetDate);
    
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

  getUserMealQuantity: (userId: string, period: MealPeriod, date: string) => {
    const { meals, members } = get();
    const todayDate = getTodayDate();
    
    // Check if user has an explicit meal
    const userMeal = meals.find((meal) => meal.member_id === userId);
    if (userMeal) {
      return userMeal.quantity;
    }
    
    // No explicit meal - check Auto Meal
    const member = members.find((m) => m.id === userId);
    if (!member) return 0;
    
    const autoMealEnabled = period === 'morning' ? member.auto_meal_morning : member.auto_meal_night;
    const autoMealQuantity = period === 'morning' ? member.auto_meal_morning_quantity : member.auto_meal_night_quantity;
    
    // If Auto Meal is disabled, return 0
    if (!autoMealEnabled) return 0;
    
    // For current date, check if cutoff has passed
    if (date === todayDate) {
      const cutoffPassed = isCutoffPassed(period, date);
      // If cutoff passed, Auto Meal doesn't apply to today
      if (cutoffPassed) return 0;
    }
    
    // For past dates, Auto Meal shouldn't apply (should have explicit records)
    if (date < todayDate) return 0;
    
    // Auto Meal applies - return stored quantity
    return autoMealQuantity;
  },

  getUserAutoMeal: (userId: string, period: MealPeriod) => {
    const { members } = get();
    const member = members.find((m) => m.id === userId);
    if (!member) return true; // Default to true if member not found
    return period === 'morning' ? member.auto_meal_morning : member.auto_meal_night;
  },

  getUserAutoMealQuantity: (userId: string, period: MealPeriod) => {
    const { members } = get();
    const member = members.find((m) => m.id === userId);
    if (!member) return 1; // Default to 1 if member not found
    return period === 'morning' ? member.auto_meal_morning_quantity : member.auto_meal_night_quantity;
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
