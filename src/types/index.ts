import { Session, User } from '@supabase/supabase-js';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  rice_preference: 'boiled' | 'atop';
  role: 'member' | 'admin';
  auto_meal_morning: boolean;
  auto_meal_night: boolean;
  auto_meal_morning_quantity: number;
  auto_meal_night_quantity: number;
  meal_month_start_date?: string; // ISO date string (YYYY-MM-DD)
  meal_month_end_date?: string; // ISO date string (YYYY-MM-DD)
  created_at?: string;
  updated_at?: string;
}

export interface Meal {
  id: string;
  member_id: string;
  meal_date: string;
  period: 'morning' | 'night';
  quantity: number;
  created_at: string;
  updated_at?: string;
}

export interface MealDetails {
  id?: number;
  meal_date: string;
  morning_details?: string;
  night_details?: string;
  updated_by?: string;
  updated_by_name?: string;
  updated_at?: string;
}

export interface Egg {
  id: string;
  member_id: string;
  egg_date: string;
  quantity: number;
  created_at: string;
  updated_at?: string;
}

export interface EggInventory {
  id: string;
  total_eggs: number;
  added_by: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  mentions: string[];
  is_violation: boolean;
  created_at: string;
}

export interface MealCount {
  boiledRice: number;
  atopRice: number;
  total: number;
  participants: Array<{ id: string; name: string; rice_preference: string; quantity: number }>;
}

export interface MonthlyReportRow {
  member_id: string;
  member_name: string;
  morning_count: number;
  night_count: number;
  monthly_total: number;
}

export interface DailyReportRow {
  meal_date: string;
  morning_count: number;
  night_count: number;
  egg_count: number;
}

export interface MemberMonthlyReport {
  dates: DailyReportRow[];
  totals: {
    morning: number;
    night: number;
    eggs: number;
  };
}

export interface GlobalReportRow {
  meal_date: string;
  member_id: string;
  member_name: string;
  morning_count: number;
  night_count: number;
  egg_count: number;
}

export interface MemberTotals {
  member_id: string;
  member_name: string;
  morning: number;
  night: number;
  eggs: number;
}

export interface Deposit {
  id: string;
  depositor_id: string;
  added_by: string;
  amount: number;
  details?: string;
  deposit_date: string;
  created_at: string;
  updated_at?: string;
}

export interface DepositReportRow {
  depositor_id: string;
  depositor_name: string;
  deposit_date: string;
  added_by_name: string;
  amount: number;
  details?: string;
  total_amount: number;
}

export type { Session, User };
