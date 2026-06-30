import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { Meal, MealDetails, Member, MealCount } from '../types';
import { MEAL_PERIODS, type MealPeriod, type PeriodCounts } from '../constants/meals';
import { getTodayDate } from '../utils/dateHelpers';
import {
  DatabaseError,
  NetworkError,
  handleError,
  showErrorToast,
} from '../utils/errorHandling';
import { retryDatabaseOperation } from '../utils/retryLogic';

type MealDetailsField = `${MealPeriod}_details`;

interface MemberInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
}

interface MealState {
  meals: Meal[];
  mealDetails: MealDetails | null;
  members: Member[];
  counts: PeriodCounts<MealCount>;
  loading: boolean;
  error: string | null;
  mealsChannel: RealtimeChannel | null;
  mealDetailsChannel: RealtimeChannel | null;

  fetchTodayMeals: () => Promise<void>;
  fetchMeals: (date: string, period?: MealPeriod) => Promise<void>;
  fetchMealDetails: (date: string) => Promise<void>;
  fetchMembers: () => Promise<void>;
  createMember: (input: MemberInput) => Promise<void>;
  updateMember: (memberId: string, input: MemberInput) => Promise<void>;
  deactivateMember: (memberId: string) => Promise<void>;
  deleteMemberIfUnused: (memberId: string) => Promise<void>;
  updateMealQuantity: (memberId: string, date: string, period: MealPeriod, quantity: number) => Promise<void>;
  updateMealDetails: (date: string, field: MealDetailsField, value: string, updatedBy: string) => Promise<void>;
  getMealCounts: (period?: MealPeriod, date?: string) => MealCount;
  getUserMealQuantity: (userId: string, period: MealPeriod, date: string) => number;
  updateCounts: (date?: string) => void;
  hasUserRegistered: (userId: string) => boolean;
  clearError: () => void;
  subscribeToMeals: (date: string) => void;
  subscribeToMealDetails: (date: string) => void;
  unsubscribeFromMeals: () => void;
  unsubscribeFromMealDetails: () => void;
}

const emptyMealCount = (): MealCount => ({
  total: 0,
  participants: [],
});

const emptyCounts = (): PeriodCounts<MealCount> => ({
  breakfast: emptyMealCount(),
  lunch: emptyMealCount(),
  dinner: emptyMealCount(),
});

const mealWriteQueues = new Map<string, Promise<void>>();

export const useMealStore = create<MealState>((set, get) => ({
  meals: [],
  mealDetails: null,
  members: [],
  counts: emptyCounts(),
  loading: false,
  error: null,
  mealsChannel: null,
  mealDetailsChannel: null,

  fetchTodayMeals: async () => {
    await get().fetchMeals(getTodayDate());
  },

  fetchMeals: async (date: string, period?: MealPeriod) => {
    try {
      set({ loading: true, error: null });

      const data = await retryDatabaseOperation(async () => {
        let query = supabase.from('meals').select('*').eq('meal_date', date);
        if (period) {
          query = query.eq('period', period);
        }

        const { data, error } = await query;
        if (error) throw new DatabaseError(error.message);
        return data;
      });

      set({ meals: data || [], loading: false });
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

        if (error) throw new DatabaseError(error.message);

        if (data && data.members) {
          return {
            ...data,
            updated_by_name: data.members.name,
            members: undefined,
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
          .order('active', { ascending: false })
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

  createMember: async (input: MemberInput) => {
    try {
      set({ loading: true, error: null });
      await retryDatabaseOperation(async () => {
        const { error } = await supabase.from('members').insert({
          name: input.name.trim(),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          role: 'member',
          active: input.active ?? true,
        });

        if (error) throw new DatabaseError(error.message);
      });

      await get().fetchMembers();
      set({ loading: false });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  updateMember: async (memberId: string, input: MemberInput) => {
    try {
      set({ loading: true, error: null });
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('members')
          .update({
            name: input.name.trim(),
            email: input.email?.trim() || null,
            phone: input.phone?.trim() || null,
            active: input.active ?? true,
          })
          .eq('id', memberId);

        if (error) throw new DatabaseError(error.message);
      });

      await get().fetchMembers();
      get().updateCounts();
      set({ loading: false });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  deactivateMember: async (memberId: string) => {
    const member = get().members.find((item) => item.id === memberId);
    if (!member) return;
    await get().updateMember(memberId, {
      name: member.name,
      email: member.email,
      phone: member.phone,
      active: false,
    });
  },

  deleteMemberIfUnused: async (memberId: string) => {
    try {
      set({ loading: true, error: null });

      const usage = await retryDatabaseOperation(async () => {
        const { count: mealCount, error: mealsError } = await supabase
          .from('meals').select('id', { count: 'exact', head: true }).eq('member_id', memberId);

        if (mealsError) throw new DatabaseError(mealsError.message);
        return mealCount || 0;
      });

      if (usage > 0) {
        await get().deactivateMember(memberId);
        set({ loading: false });
        return;
      }

      await retryDatabaseOperation(async () => {
        const { error } = await supabase.from('members').delete().eq('id', memberId);
        if (error) throw new DatabaseError(error.message);
      });

      await get().fetchMembers();
      set({ loading: false });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  updateMealQuantity: async (memberId: string, date: string, period: MealPeriod, quantity: number) => {
    const nextQuantity = Math.max(0, quantity);
    const key = `${memberId}:${date}:${period}`;
    const previousMeals = get().meals;
    const existing = previousMeals.find((meal) => meal.member_id === memberId && meal.meal_date === date && meal.period === period);
    const optimistic = previousMeals.filter((meal) => !(meal.member_id === memberId && meal.meal_date === date && meal.period === period));
    if (nextQuantity > 0) {
      optimistic.push(existing ? { ...existing, quantity: nextQuantity } : { id: key, member_id: memberId, meal_date: date, period, quantity: nextQuantity, created_at: new Date().toISOString() });
    }
    set({ meals: optimistic, error: null });
    get().updateCounts(date);
    window.dispatchEvent(new CustomEvent('meal:changed'));

    const write = async () => {
    try {
      if (!navigator.onLine) {
        const error = new NetworkError();
        const errorMessage = handleError(error);
        set({ error: errorMessage });
        showErrorToast(errorMessage);
        throw error;
      }

      if (nextQuantity === 0) {
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
        await retryDatabaseOperation(async () => {
          const { error } = await supabase
            .from('meals')
            .upsert(
              {
                member_id: memberId,
                meal_date: date,
                period,
                quantity: nextQuantity,
              },
              { onConflict: 'member_id,meal_date,period' }
            );

          if (error) throw new DatabaseError(error.message);
        });
      }

    } catch (error) {
      const errorMessage = handleError(error);
      set({ meals: previousMeals, error: errorMessage });
      get().updateCounts(date);
      showErrorToast(errorMessage);
      throw error;
    }
    };
    const queued = (mealWriteQueues.get(key) || Promise.resolve()).catch(() => undefined).then(write);
    mealWriteQueues.set(key, queued);
    try { await queued; } finally { if (mealWriteQueues.get(key) === queued) mealWriteQueues.delete(key); }
  },

  updateMealDetails: async (date: string, field: MealDetailsField, value: string, updatedBy: string) => {
    try {
      if (!navigator.onLine) {
        const error = new NetworkError();
        const errorMessage = handleError(error);
        set({ error: errorMessage });
        showErrorToast(errorMessage);
        throw error;
      }

      await retryDatabaseOperation(async () => {
        const { data: existing, error: selectError } = await supabase
          .from('meal_details')
          .select('id')
          .eq('meal_date', date)
          .maybeSingle();

        if (selectError) throw new DatabaseError(selectError.message);

        if (existing) {
          const { error } = await supabase
            .from('meal_details')
            .update({ [field]: value, updated_by: updatedBy })
            .eq('meal_date', date);

          if (error) throw new DatabaseError(error.message);
        } else {
          const { error } = await supabase
            .from('meal_details')
            .insert({ meal_date: date, [field]: value, updated_by: updatedBy });

          if (error) throw new DatabaseError(error.message);
        }
      });

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
    const activeMembers = members.filter((member) => member.active !== false);
    const filteredMeals = meals.filter((meal) => {
      if (meal.meal_date !== targetDate) return false;
      return period ? meal.period === period : true;
    });

    const participants: MealCount['participants'] = [];
    let total = 0;

    filteredMeals.forEach((meal) => {
      const member = activeMembers.find((item) => item.id === meal.member_id);
      if (!member || meal.quantity <= 0) return;

      participants.push({
        id: member.id,
        name: member.name,
        quantity: meal.quantity,
      });
      total += meal.quantity;
    });

    return {
      total,
      participants,
    };
  },

  updateCounts: (date?: string) => {
    const targetDate = date || getTodayDate();
    const nextCounts = MEAL_PERIODS.reduce((acc, period) => {
      acc[period] = get().getMealCounts(period, targetDate);
      return acc;
    }, emptyCounts());

    set({ counts: nextCounts });
  },

  getUserMealQuantity: (userId: string, period: MealPeriod, date: string) => {
    const userMeal = get().meals.find(
      (meal) => meal.member_id === userId && meal.period === period && meal.meal_date === date
    );
    return userMeal?.quantity || 0;
  },

  hasUserRegistered: (userId: string) => {
    return get().meals.some((meal) => meal.member_id === userId);
  },

  clearError: () => set({ error: null }),

  subscribeToMeals: (date: string) => {
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
        () => {
          get().fetchMeals(date);
        }
      )
      .subscribe();

    set({ mealsChannel: channel });
  },

  subscribeToMealDetails: (date: string) => {
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
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            await get().fetchMealDetails(date);
          } else if (payload.eventType === 'DELETE') {
            set({ mealDetails: null });
          }
        }
      )
      .subscribe();

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
