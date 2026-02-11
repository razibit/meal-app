import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Deposit, DepositReportRow } from '../types';

interface DepositStore {
  deposits: Deposit[];
  depositReport: DepositReportRow[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchDeposits: (startDate: string, endDate: string) => Promise<void>;
  fetchDepositReport: (startDate: string, endDate: string) => Promise<void>;
  addDeposit: (depositorId: string, amount: number, details?: string) => Promise<void>;
  getMemberTotalDeposit: (memberId: string, startDate: string, endDate: string) => Promise<number>;
  clearError: () => void;
}

export const useDepositStore = create<DepositStore>((set) => ({
  deposits: [],
  depositReport: [],
  loading: false,
  error: null,

  fetchDeposits: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .gte('deposit_date', startDate)
        .lte('deposit_date', endDate)
        .order('deposit_date', { ascending: false });

      if (error) throw error;
      set({ deposits: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching deposits:', error);
      set({ error: 'Failed to fetch deposits', loading: false });
    }
  },

  fetchDepositReport: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc(
        'get_monthly_deposit_report_with_dates',
        {
          p_start_date: startDate,
          p_end_date: endDate,
        }
      );

      if (error) throw error;
      set({ depositReport: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching deposit report:', error);
      set({ error: 'Failed to fetch deposit report', loading: false });
    }
  },

  addDeposit: async (depositorId: string, amount: number, details?: string) => {
    set({ loading: true, error: null });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { error } = await supabase.from('deposits').insert({
        depositor_id: depositorId,
        added_by: userData.user.id,
        amount,
        details,
      });

      if (error) throw error;
      set({ loading: false });
    } catch (error) {
      console.error('Error adding deposit:', error);
      set({ error: 'Failed to add deposit', loading: false });
      throw error;
    }
  },

  getMemberTotalDeposit: async (memberId: string, startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase.rpc('get_member_total_deposit', {
        p_member_id: memberId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error fetching member total deposit:', error);
      return 0;
    }
  },

  clearError: () => set({ error: null }),
}));
