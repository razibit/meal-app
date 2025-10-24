import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentUserId: string;
  memberNames: Record<string, string>;
}

function ChatMessages({ messages, currentUserId, memberNames }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessageWithMentions = (message: string, mentions: string[]) => {
    if (!mentions || mentions.length === 0) {
      return <span>{message}</span>;
    }

    // Split message by @ mentions and highlight them
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(message)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {message.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Check if this mention is for current user
      const mentionedName = match[1];
      const isCurrentUser = mentions.some((mentionId) => {
        const name = memberNames[mentionId];
        return name && name.toLowerCase() === mentionedName.toLowerCase();
      }) && mentions.includes(currentUserId);

      // Add highlighted mention
      parts.push(
        <span
          key={`mention-${match.index}`}
          className={`font-semibold ${
            isCurrentUser
              ? 'text-accent bg-accent/20 px-1 rounded'
              : 'text-primary'
          }`}
        >
          @{mentionedName}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{message.substring(lastIndex)}</span>
      );
    }

    return <>{parts}</>;
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-2 space-y-3"
    >
      {messages.map((message) => {
        const senderName = memberNames[message.sender_id] || 'Unknown';
        const isOwnMessage = message.sender_id === currentUserId;

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 ${
                message.is_violation
                  ? 'bg-error/10 border border-error text-error'
                  : isOwnMessage
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-primary'
              }`}
            >
              {!isOwnMessage && (
                <div className="text-xs font-semibold mb-1 opacity-80">
                  {senderName}
                </div>
              )}
              <div className="text-sm break-words">
                {renderMessageWithMentions(message.message, message.mentions)}
              </div>
              <div
                className={`text-xs mt-1 ${
                  message.is_violation
                    ? 'opacity-70'
                    : isOwnMessage
                    ? 'text-white/70'
                    : 'text-text-tertiary'
                }`}
              >
                {formatTime(message.created_at)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatMessages;
