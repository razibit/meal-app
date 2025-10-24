# Chat Components

This directory contains all components related to the chat functionality with mentions support.

## Components

### ChatMessages.tsx
Displays the list of chat messages with the following features:
- Auto-scrolls to bottom on new messages
- Highlights mentions for the current user with accent color background
- Displays violation messages in red color
- Shows sender name and timestamp for each message
- Responsive message bubbles (own messages on right, others on left)

### ChatInput.tsx
Text input component for sending messages with mention support:
- Detects @ symbol and triggers autocomplete
- Parses mentions from message text
- Sends messages with mentions array
- Clears input after successful send
- Supports Enter to send, Shift+Enter for new line
- Keyboard navigation for autocomplete (up/down arrows, Enter to select)

### MentionAutocomplete.tsx
Dropdown component for selecting members to mention:
- Filters members by typed characters after @
- Keyboard navigation support (up/down arrows)
- Click or Enter to select a member
- Positioned above the input field
- Auto-scrolls selected item into view

## Store

### chatStore.ts (src/stores/)
Zustand store managing chat state:
- `messages`: Array of chat messages
- `loading`: Loading state for fetching messages
- `error`: Error message if any operation fails
- `sendMessage(message, mentions)`: Sends a new message with mentions
- `fetchMessages(limit)`: Fetches recent messages (default 50)
- `subscribeToMessages(callback)`: Sets up real-time subscription for new messages
- `addMessage(message)`: Adds a message to local state
- `clearError()`: Clears error state

## Hook

### useMembers.ts (src/hooks/)
Custom hook for fetching and managing members list:
- Fetches all members on mount
- Returns members array, loading state, error, and refetch function
- Used by Chat page to populate mention autocomplete

## Usage

The Chat page (`src/pages/Chat.tsx`) integrates all these components:

```tsx
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { useMembers } from '../hooks/useMembers';
import ChatMessages from '../components/chat/ChatMessages';
import ChatInput from '../components/chat/ChatInput';

function Chat() {
  const { messages, sendMessage, fetchMessages, subscribeToMessages } = useChatStore();
  const { user } = useAuthStore();
  const { members } = useMembers();

  // Fetch messages and set up real-time subscription
  // Display ChatMessages and ChatInput components
}
```

## Real-time Features

- Messages are synced in real-time using Supabase Realtime subscriptions
- When a user is mentioned, they receive a browser notification (if permitted)
- Optimistic updates for sent messages (appear immediately, then confirmed by server)
- Duplicate prevention for messages received via subscription

## Requirements Covered

- **5.1**: Real-time chat with message list
- **5.2**: @ mention detection and autocomplete
- **5.3**: Parse mentions and send with message
- **5.4**: Browser push notifications for mentions
- **5.5**: Real-time message updates
- **4.1, 4.2**: Violation messages displayed in red
