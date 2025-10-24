import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Member, Session } from '../types';

interface AuthState {
  user: Member | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch member profile
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (memberError) throw memberError;

        set({
          user: member,
          session: data.session,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, name: string, phone?: string) => {
    try {
      set({ loading: true, error: null });

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create member profile
        const { data: member, error: memberError } = await supabase
          .from('members')
          .insert({
            id: data.user.id,
            name,
            email,
            phone,
            rice_preference: 'boiled',
            role: 'member',
          })
          .select()
          .single();

        if (memberError) throw memberError;

        set({
          user: member,
          session: data.session,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      set({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  initialize: async () => {
    try {
      set({ loading: true, error: null });

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session?.user) {
        // Fetch member profile
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (memberError) {
          // If member doesn't exist, sign out
          await supabase.auth.signOut();
          set({ user: null, session: null, loading: false });
          return;
        }

        set({
          user: member,
          session,
          loading: false,
          error: null,
        });
      } else {
        set({ user: null, session: null, loading: false });
      }

      // Set up auth state change listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: member } = await supabase
            .from('members')
            .select('*')
            .eq('id', session.user.id)
            .single();

          set({ user: member, session });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          set({ session });
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth';
      set({ error: errorMessage, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
