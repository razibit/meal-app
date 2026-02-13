import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { GroceryExpense, GroceryExpenseReportRow } from '../types';

interface GroceryExpenseStore {
  expenses: GroceryExpense[];
  expenseReport: GroceryExpenseReportRow[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchExpenses: (startDate: string, endDate: string) => Promise<void>;
  fetchExpenseReport: (startDate: string, endDate: string) => Promise<void>;
  addExpense: (shopperId: string, transactionType: 'cash' | 'credit', amount: number, details?: string) => Promise<void>;
  getTotalCashExpenses: (startDate: string, endDate: string) => Promise<number>;
  getTotalDeposits: (startDate: string, endDate: string) => Promise<number>;
  getBalance: (startDate: string, endDate: string) => Promise<number>;
  clearError: () => void;
}

export const useGroceryExpenseStore = create<GroceryExpenseStore>((set) => ({
  expenses: [],
  expenseReport: [],
  loading: false,
  error: null,

  fetchExpenses: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('grocery_expenses')
        .select('*')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      set({ expenses: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching grocery expenses:', error);
      set({ error: 'Failed to fetch grocery expenses', loading: false });
    }
  },

  fetchExpenseReport: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc(
        'get_grocery_expense_report_with_dates',
        {
          p_start_date: startDate,
          p_end_date: endDate,
        }
      );

      if (error) throw error;
      set({ expenseReport: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching grocery expense report:', error);
      set({ error: 'Failed to fetch grocery expense report', loading: false });
    }
  },

  addExpense: async (shopperId: string, transactionType: 'cash' | 'credit', amount: number, details?: string) => {
    set({ loading: true, error: null });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { error } = await supabase.from('grocery_expenses').insert({
        shopper_id: shopperId,
        added_by: userData.user.id,
        transaction_type: transactionType,
        details,
        amount,
      });

      if (error) throw error;
      set({ loading: false });
    } catch (error) {
      console.error('Error adding grocery expense:', error);
      set({ error: 'Failed to add grocery expense', loading: false });
      throw error;
    }
  },

  getTotalCashExpenses: async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase.rpc('get_total_cash_grocery_expenses', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error fetching total cash expenses:', error);
      return 0;
    }
  },

  getTotalDeposits: async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase.rpc('get_total_deposits', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error fetching total deposits:', error);
      return 0;
    }
  },

  getBalance: async (startDate: string, endDate: string) => {
    try {
      const [depositsResult, expensesResult] = await Promise.all([
        supabase.rpc('get_total_deposits', {
          p_start_date: startDate,
          p_end_date: endDate,
        }),
        supabase.rpc('get_total_cash_grocery_expenses', {
          p_start_date: startDate,
          p_end_date: endDate,
        }),
      ]);

      if (depositsResult.error) throw depositsResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const totalDeposits = depositsResult.data || 0;
      const totalCashExpenses = expensesResult.data || 0;

      return totalDeposits - totalCashExpenses;
    } catch (error) {
      console.error('Error calculating balance:', error);
      return 0;
    }
  },

  clearError: () => set({ error: null }),
}));
