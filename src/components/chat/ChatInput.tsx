import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import MentionAutocomplete from './MentionAutocomplete';
import type { Member } from '../../types';

interface ChatInputProps {
  onSend: (message: string, mentions: string[]) => Promise<void>;
  members: Member[];
}

function ChatInput({ onSend, members }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Get cursor position
    const cursorPosition = e.target.selectionStart;

    // Check if @ was just typed
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Check if there's a space after @ (which would end the mention)
      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setShowAutocomplete(true);
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setSelectedMemberIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleMemberSelect = (member: Member) => {
    if (mentionStartIndex === -1) return;

    // Replace the @query with @membername
    const beforeMention = message.substring(0, mentionStartIndex);
    const afterMention = message.substring(
      mentionStartIndex + mentionQuery.length + 1
    );
    const newMessage = `${beforeMention}@${member.name}${afterMention}`;

    setMessage(newMessage);
    setShowAutocomplete(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    // Focus back on textarea
    textareaRef.current?.focus();
  };

  const parseMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      // Find member by name
      const member = members.find(
        (m) => m.name.toLowerCase() === mentionedName.toLowerCase()
      );
      if (member && !mentions.includes(member.id)) {
        mentions.push(member.id);
      }
    }

    return mentions;
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      const mentions = parseMentions(message);
      await onSend(message.trim(), mentions);
      setMessage('');
      setShowAutocomplete(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete) {
      const filteredMembers = members.filter((member) =>
        member.name.toLowerCase().includes(mentionQuery.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMemberIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMemberIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filteredMembers[selectedMemberIndex]) {
          handleMemberSelect(filteredMembers[selectedMemberIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    } else {
      // Send message on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative border-t border-border p-4">
      {showAutocomplete && (
        <MentionAutocomplete
          query={mentionQuery}
          members={members}
          onSelect={handleMemberSelect}
          position={{ top: 60, left: 16 }}
          selectedIndex={selectedMemberIndex}
        />
      )}
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... Use @ to mention someone"
          className="flex-1 resize-none rounded-lg border border-border bg-bg-primary px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          rows={2}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default ChatInput;
