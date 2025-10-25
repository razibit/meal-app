import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { ChatMessage } from '../types';
import { offlineQueue } from '../services/offlineQueue';
import { 
  AuthenticationError, 
  DatabaseError, 
  handleError, 
  showErrorToast 
} from '../utils/errorHandling';
import { retryDatabaseOperation } from '../utils/retryLogic';

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (message: string, mentions: string[]) => Promise<void>;
  fetchMessages: (limit?: number) => Promise<void>;
  subscribeToMessages: (callback: (message: ChatMessage) => void) => () => void;
  addMessage: (message: ChatMessage) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  error: null,

  sendMessage: async (message: string, mentions: string[]) => {
    try {
      set({ error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const error = new AuthenticationError();
        showErrorToast(handleError(error));
        throw error;
      }

      // Check if offline
      if (!navigator.onLine) {
        // Queue the action for later
        offlineQueue.add({
          type: 'send_message',
          payload: { senderId: user.id, message, mentions },
        });
        
        return;
      }

      const data = await retryDatabaseOperation(async () => {
        const { data, error } = await supabase
          .from('chats')
          .insert({
            sender_id: user.id,
            message,
            mentions,
            is_violation: false,
          })
          .select('*, members!chats_sender_id_fkey(name)')
          .single();

        if (error) throw new DatabaseError(error.message);
        return data;
      });

      // Transform the data to match ChatMessage interface
      const chatMessage: ChatMessage = {
        id: data.id,
        sender_id: data.sender_id,
        message: data.message,
        mentions: data.mentions,
        is_violation: data.is_violation,
        created_at: data.created_at,
      };

      // Optimistically add message to local state
      set((state) => ({
        messages: [...state.messages, chatMessage],
      }));
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage });
      showErrorToast(errorMessage);
      throw error;
    }
  },

  fetchMessages: async (limit = 50) => {
    try {
      set({ loading: true, error: null });

      const data = await retryDatabaseOperation(async () => {
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(limit);

        if (error) throw new DatabaseError(error.message);
        return data;
      });

      set({
        messages: data || [],
        loading: false,
      });
    } catch (error) {
      const errorMessage = handleError(error);
      set({ error: errorMessage, loading: false });
      showErrorToast(errorMessage);
    }
  },

  subscribeToMessages: (callback: (message: ChatMessage) => void) => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Add message to store
          set((state) => {
            // Check if message already exists (avoid duplicates from optimistic updates)
            const exists = state.messages.some((msg) => msg.id === newMessage.id);
            if (exists) return state;

            return {
              messages: [...state.messages, newMessage],
            };
          });

          // Call the callback for additional handling (e.g., notifications)
          callback(newMessage);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  },

  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  clearError: () => set({ error: null }),
}));
