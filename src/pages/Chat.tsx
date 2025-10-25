import { useEffect, useMemo, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { useMembers } from '../hooks/useMembers';
import ChatMessages from '../components/chat/ChatMessages';
import ChatInput from '../components/chat/ChatInput';

function Chat() {
  const { messages, loading, error, sendMessage, fetchMessages, subscribeToMessages } = useChatStore();
  const { user } = useAuthStore();
  const { members } = useMembers();

  // Create a map of member IDs to names for efficient lookup
  const memberNames = useMemo(() => {
    const nameMap: Record<string, string> = {};
    members.forEach((member) => {
      nameMap[member.id] = member.name;
    });
    return nameMap;
  }, [members]);

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Memoize notification handler
  const handleNewMessage = useCallback((newMessage: any) => {
    // Check if current user is mentioned
    if (user && newMessage.mentions.includes(user.id)) {
      // Trigger notification if supported and permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        const senderName = memberNames[newMessage.sender_id] || 'Someone';
        new Notification(`${senderName} mentioned you`, {
          body: newMessage.message,
          icon: '/icon-192.png',
          tag: 'chat-mention',
        });
      }
    }
  }, [user, memberNames]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToMessages(handleNewMessage);

    return () => {
      unsubscribe();
    };
  }, [user, subscribeToMessages, handleNewMessage]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Please log in to view chat</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xl font-bold text-text-primary">Chat</h2>
        <p className="text-sm text-text-secondary">
          {members.length} members online
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-error/10 border border-error rounded-lg text-error text-sm animate-slide-down">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-secondary">Loading messages...</div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <ChatMessages
            messages={messages}
            currentUserId={user.id}
            memberNames={memberNames}
          />

          {/* Input */}
          <ChatInput onSend={sendMessage} members={members} />
        </>
      )}
    </div>
  );
}

export default Chat;
