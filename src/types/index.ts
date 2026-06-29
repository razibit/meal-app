import { Session, User } from '@supabase/supabase-js';
import type { MealPeriod } from '../constants/meals';

export interface Member {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
  role: 'member' | 'admin';
  active?: boolean;
  meal_month_start_date?: string; // ISO date string (YYYY-MM-DD)
  meal_month_end_date?: string; // ISO date string (YYYY-MM-DD)
  created_at?: string;
  updated_at?: string;
}

export interface Meal {
  id: string;
  member_id: string;
  meal_date: string;
  period: MealPeriod;
  quantity: number;
  created_at: string;
  updated_at?: string;
}

export interface MealDetails {
  id?: number;
  meal_date: string;
  breakfast_details?: string;
  lunch_details?: string;
  dinner_details?: string;
  updated_by?: string;
  updated_by_name?: string;
  updated_at?: string;
}

export interface MealCount {
  total: number;
  participants: Array<{ id: string; name: string; quantity: number }>;
}

export interface MonthlyReportRow {
  member_id: string;
  member_name: string;
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
  monthly_total: number;
}

export interface DailyReportRow {
  meal_date: string;
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
}

export interface MemberMonthlyReport {
  dates: DailyReportRow[];
  totals: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
}

export interface GlobalReportRow {
  meal_date: string;
  member_id: string;
  member_name: string;
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
}

export interface MemberTotals {
  member_id: string;
  member_name: string;
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface Deposit {
  id: string;
  depositor_id: string;
  added_by: string;
  amount: number;
  details?: string;
  deposit_date: string;
  accounting_date: string;
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

export interface GroceryExpense {
  id: string;
  shopper_id: string;
  added_by: string;
  transaction_type: 'cash' | 'credit';
  details?: string;
  amount: number;
  expense_date: string;
  created_at: string;
  updated_at?: string;
}

export interface GroceryExpenseReportRow {
  expense_id: string;
  expense_date: string;
  added_by_id: string;
  added_by_name: string;
  shopper_id: string;
  shopper_name: string;
  transaction_type: 'cash' | 'credit';
  details?: string;
  amount: number;
}

export interface MealRateSnapshot {
  id?: string;
  meal_rate: number;
  total_expenses: number;
  total_meals: number;
  trigger_source: 'meals' | 'grocery_expenses' | 'manual';
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface OcrImportRow {
  id?: string;
  detected_name: string;
  matched_member_id?: string | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  confidence?: number | null;
  needs_review: boolean;
  notes?: string | null;
}

export interface OcrImportResult {
  import_id: string;
  rows: OcrImportRow[];
}

export type { Session, User };
