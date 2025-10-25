import { Session, User } from '@supabase/supabase-js';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  rice_preference: 'boiled' | 'atop';
  role: 'member' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface Meal {
  id: string;
  member_id: string;
  meal_date: string;
  period: 'morning' | 'night';
  created_at: string;
  updated_at?: string;
}

export interface MealDetails {
  id?: number;
  meal_date: string;
  morning_details?: string;
  night_details?: string;
  notice?: string;
  updated_by?: string;
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
  participants: Array<{ id: string; name: string; rice_preference: string }>;
}

export interface MonthlyReportRow {
  member_id: string;
  member_name: string;
  morning_count: number;
  night_count: number;
  monthly_total: number;
}

export type { Session, User };
