import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Current values:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Missing Supabase environment variables. Please check your .env file and restart the dev server.');
}

// Create Supabase client with auth persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'mess-meal-auth',
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});
