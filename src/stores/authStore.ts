import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Member, Session } from '../types';
import { 
  AuthenticationError, 
  DatabaseError, 
  handleError, 
  showErrorToast 
} from '../utils/errorHandling';
import { retryDatabaseOperation } from '../utils/retryLogic';

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

      if (error) throw new AuthenticationError(error.message);

      if (data.user) {
        // Fetch member profile with retry
        const member = await retryDatabaseOperation(async () => {
          const { data: member, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (memberError) throw new DatabaseError(memberError.message);
          return member;
        });

        set({
          user: member,
          session: data.session,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  signUp: async (email: string, password: string, name: string, phone?: string) => {
    try {
      set({ loading: true, error: null });

      // Sign up the user with metadata (trigger will create member profile)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            rice_preference: 'boiled',
            role: 'member',
          },
        },
      });

      if (error) throw new AuthenticationError(error.message);

      if (data.user && data.session) {
        // Fetch the member profile created by the trigger
        const member = await retryDatabaseOperation(async () => {
          const { data: member, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (memberError) throw new DatabaseError(memberError.message);
          return member;
        });

        set({
          user: member,
          session: data.session,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) throw new AuthenticationError(error.message);

      set({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  initialize: async () => {
    try {
      set({ loading: true, error: null });

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw new AuthenticationError(sessionError.message);

      if (session?.user) {
        // Fetch member profile with retry
        const member = await retryDatabaseOperation(async () => {
          const { data: member, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (memberError) {
            // If member doesn't exist, this is a critical error
            throw new DatabaseError(memberError.message);
          }
          return member;
        }).catch(async () => {
          // If member doesn't exist after retries, sign out
          await supabase.auth.signOut();
          return null;
        });

        if (member) {
          set({
            user: member,
            session,
            loading: false,
            error: null,
          });
        } else {
          set({ user: null, session: null, loading: false });
        }
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
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      // Don't show toast on initialization errors to avoid annoying users on page load
    }
  },

  clearError: () => set({ error: null }),
}));
