# Design Document

## Overview

The Mess Meal Management System is a progressive web application built with a modern, lightweight tech stack optimized for fast loading and real-time updates. The architecture follows a client-server model with Supabase providing backend services (database, authentication, real-time subscriptions) and a React-based frontend hosted on Render.

### Technology Stack

- **Frontend**: React 18 + Vite, Tailwind CSS, Zustand (state management)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Hosting**: Render (frontend static site)
- **Notifications**: Web Push API with VAPID
- **PWA**: Workbox service worker, Web App Manifest

### Design Principles

1. **Mobile-first responsive design** - Optimized for 320px to 1920px+ screens
2. **Lightweight bundle** - Target <200KB gzipped initial load
3. **Optimistic UI updates** - Immediate feedback, sync in background
4. **Offline-first where possible** - Queue actions, sync when online
5. **Real-time by default** - Supabase Realtime for live updates

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │   React    │  │  Service   │  │   IndexedDB/        │   │
│  │    App     │  │   Worker   │  │   LocalStorage      │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / WebSocket
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │ PostgreSQL │  │    Auth    │  │   Realtime          │   │
│  │     +      │  │            │  │   (WebSocket)       │   │
│  │    RLS     │  │            │  │                     │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
│  ┌────────────┐  ┌────────────┐                            │
│  │    Edge    │  │  Storage   │                            │
│  │ Functions  │  │            │                            │
│  └────────────┘  └────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```


### Component Architecture

```
src/
├── components/
│   ├── layout/
│   │   ├── BottomNav.tsx          # 3-tab navigation
│   │   ├── Header.tsx             # Date display, people icon
│   │   └── Layout.tsx             # Main app shell
│   ├── home/
│   │   ├── MealToggle.tsx         # Morning/Night toggle
│   │   ├── MealCounts.tsx         # Rice type counts
│   │   ├── MealDetails.tsx        # Editable menu
│   │   ├── NoticeBoard.tsx        # Editable notice
│   │   └── MembersList.tsx        # Modal with all members
│   ├── chat/
│   │   ├── ChatMessages.tsx       # Message list
│   │   ├── ChatInput.tsx          # Input with mentions
│   │   └── MentionAutocomplete.tsx
│   └── preferences/
│       ├── ProfileSection.tsx
│       ├── ThemeToggle.tsx
│       └── NotificationSettings.tsx
├── hooks/
│   ├── useMeals.ts               # Meal data & mutations
│   ├── useChat.ts                # Chat realtime
│   ├── useMembers.ts             # Members list
│   └── useRealtimeSubscription.ts
├── stores/
│   ├── authStore.ts              # Zustand: auth state
│   ├── mealStore.ts              # Zustand: meal state
│   └── chatStore.ts              # Zustand: chat state
├── services/
│   ├── supabase.ts               # Supabase client
│   ├── notifications.ts          # Web Push setup
│   
└── utils/
    ├── cutoffChecker.ts          # Client-side cutoff logic
    ├── dateHelpers.ts            # Timezone handling
    └── validators.ts             # Input validation
```

## Components and Interfaces

### 1. Bottom Navigation Component

**Purpose**: Provides tab-based navigation between Home, Chat, and Preferences

**Interface**:
```typescript
interface BottomNavProps {
  activeTab: 'home' | 'chat' | 'preferences';
  onTabChange: (tab: string) => void;
}
```

**Behavior**:
- Renders 3 icon buttons with labels
- Highlights active tab with accent color
- Uses React Router for navigation without full page reload
- Sticky positioned at bottom on mobile, sidebar on desktop


### 2. Home Tab Components

#### MealToggle Component

**Purpose**: Switches between Morning and Night meal views

**Interface**:
```typescript
interface MealToggleProps {
  activePeriod: 'morning' | 'night';
  onPeriodChange: (period: 'morning' | 'night') => void;
  cutoffPassed: { morning: boolean; night: boolean };
}
```

**Behavior**:
- Segmented control UI (iOS-style toggle)
- Shows countdown timer until cutoff
- Disables period if cutoff passed (visual indicator)
- Auto-switches based on time of day (morning until 12 PM)

#### MealCounts Component

**Purpose**: Displays meal registration counts and participant lists

**Interface**:
```typescript
interface MealCount {
  boiledRice: number;
  atopRice: number;
  total: number;
  participants: string[]; // member IDs
}

interface MealCountsProps {
  morningCount: MealCount;
  nightCount: MealCount;
  activePeriod: 'morning' | 'night';
  onCountClick: () => void;
}
```

**Behavior**:
- Shows "Boiled Rice: X People | Atop Rice: Y People"
- Displays total count prominently
- Clicking opens modal with participant names
- Updates in real-time via Supabase subscription

#### MealDetails Component

**Purpose**: Editable menu description for each meal period

**Interface**:
```typescript
interface MealDetailsProps {
  date: string;
  morningDetails: string;
  nightDetails: string;
  activePeriod: 'morning' | 'night';
  onUpdate: (period: string, details: string) => Promise<void>;
}
```

**Behavior**:
- Inline editable text area
- Optimistic update (shows change immediately)
- Shows "Edited by [Name] at [Time]" below
- Auto-saves on blur with 500ms debounce


#### NoticeBoard Component

**Purpose**: Shared editable announcement area

**Interface**:
```typescript
interface NoticeBoardProps {
  notice: string;
  onUpdate: (notice: string) => Promise<void>;
  updatedBy?: string;
  updatedAt?: string;
}
```

**Behavior**:
- Small text area (3-4 lines)
- Click to edit, save on blur
- Shows last editor and timestamp
- Real-time updates for all users

#### MembersList Component

**Purpose**: Modal showing all 16 mess members

**Interface**:
```typescript
interface Member {
  id: string;
  name: string;
  avatar?: string;
}

interface MembersListProps {
  members: Member[];
  isOpen: boolean;
  onClose: () => void;
}
```

**Behavior**:
- Triggered by people icon in header
- Shows member names with icons
- Scrollable list
- Close on backdrop click or X button

### 3. Chat Tab Components

#### ChatMessages Component

**Purpose**: Displays chat message history with real-time updates

**Interface**:
```typescript
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  mentions: string[]; // mentioned user IDs
  createdAt: string;
  isViolation?: boolean; // post-cutoff violation
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentUserId: string;
}
```

**Behavior**:
- Auto-scrolls to bottom on new message
- Highlights mentions for current user
- Shows violation messages in red
- Infinite scroll for history (paginated)
- Optimistic rendering for sent messages


#### ChatInput Component

**Purpose**: Message input with mention autocomplete

**Interface**:
```typescript
interface ChatInputProps {
  onSend: (message: string, mentions: string[]) => Promise<void>;
  members: Member[];
}
```

**Behavior**:
- Text input with @ trigger for mentions
- Shows autocomplete dropdown on @
- Filters members by typed characters
- Sends on Enter, Shift+Enter for new line
- Clears input after send
- Shows typing indicator (optional)

#### MentionAutocomplete Component

**Purpose**: Dropdown for selecting members to mention

**Interface**:
```typescript
interface MentionAutocompleteProps {
  query: string;
  members: Member[];
  onSelect: (member: Member) => void;
  position: { top: number; left: number };
}
```

**Behavior**:
- Filters members by name matching query
- Keyboard navigation (up/down arrows)
- Click or Enter to select
- Positioned above/below cursor

### 4. Preferences Tab Components

#### ProfileSection Component

**Purpose**: Display and edit user profile

**Interface**:
```typescript
interface ProfileSectionProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  onUpdate: (updates: Partial<User>) => Promise<void>;
}
```

**Behavior**:
- Shows name, email, phone
- Inline edit for name and phone
- Email read-only (from auth)
- Save button with loading state


#### ThemeToggle Component

**Purpose**: Switch between eggplant and dark themes

**Interface**:
```typescript
interface ThemeToggleProps {
  currentTheme: 'eggplant' | 'dark';
  onThemeChange: (theme: string) => void;
}
```

**Behavior**:
- Toggle switch or radio buttons
- Applies theme immediately via CSS variables
- Persists to localStorage
- Smooth transition animation

#### NotificationSettings Component

**Purpose**: Manage push notification preferences

**Interface**:
```typescript
interface NotificationSettingsProps {
  enabled: boolean;
  onToggle: () => Promise<void>;
  permission: NotificationPermission;
}
```

**Behavior**:
- Shows current permission status
- Toggle to enable/disable
- Requests browser permission if needed
- Shows instructions if blocked

## Data Models

### Database Schema

#### members table

```sql
CREATE TABLE members (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  rice_preference text DEFAULT 'boiled' CHECK (rice_preference IN ('boiled', 'atop')),
  role text DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_members_email ON members(email);
```

#### meals table

```sql
CREATE TYPE meal_period AS ENUM ('morning', 'night');

CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  meal_date date NOT NULL,
  period meal_period NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, meal_date, period)
);

CREATE INDEX idx_meals_date_period ON meals(meal_date, period);
CREATE INDEX idx_meals_member_date ON meals(member_id, meal_date);
```


#### meal_details table

```sql
CREATE TABLE meal_details (
  id serial PRIMARY KEY,
  meal_date date UNIQUE NOT NULL,
  morning_details text,
  night_details text,
  notice text,
  updated_by uuid REFERENCES members(id),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_meal_details_date ON meal_details(meal_date);
```

#### chats table

```sql
CREATE TABLE chats (
  id bigserial PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  is_violation boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_chats_mentions ON chats USING GIN(mentions);
```

#### push_subscriptions table

```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_member ON push_subscriptions(member_id);
```

### TypeScript Interfaces

```typescript
// Client-side types
export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ricePreference: 'boiled' | 'atop';
  role: 'member' | 'admin';
}

export interface Meal {
  id: string;
  memberId: string;
  mealDate: string;
  period: 'morning' | 'night';
  createdAt: string;
}

export interface MealDetails {
  mealDate: string;
  morningDetails?: string;
  nightDetails?: string;
  notice?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  mentions: string[];
  isViolation: boolean;
  createdAt: string;
}

export interface MealCount {
  boiledRice: number;
  atopRice: number;
  total: number;
  participants: Array<{ id: string; name: string; ricePreference: string }>;
}
```


## API Design

### Supabase Client Operations

#### Authentication

```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

#### Meal Operations

```typescript
// Add meal registration
const { data, error } = await supabase
  .from('meals')
  .insert({
    member_id: userId,
    meal_date: '2025-10-24',
    period: 'morning'
  })
  .select()
  .single();

// Remove meal registration
const { error } = await supabase
  .from('meals')
  .delete()
  .match({
    member_id: userId,
    meal_date: '2025-10-24',
    period: 'morning'
  });

// Get today's meal counts
const { data, error } = await supabase
  .from('meals')
  .select('*, members(name, rice_preference)')
  .eq('meal_date', '2025-10-24')
  .eq('period', 'morning');

// Get monthly meal report
const { data, error } = await supabase
  .rpc('get_monthly_report', {
    target_month: '2025-10',
  });
```

#### Meal Details Operations

```typescript
// Get meal details for date
const { data, error } = await supabase
  .from('meal_details')
  .select('*, members(name)')
  .eq('meal_date', '2025-10-24')
  .single();

// Update meal details
const { data, error } = await supabase
  .from('meal_details')
  .upsert({
    meal_date: '2025-10-24',
    morning_details: 'Rice, Dal, Fish Curry',
    updated_by: userId
  })
  .select()
  .single();
```

#### Chat Operations

```typescript
// Send message
const { data, error } = await supabase
  .from('chats')
  .insert({
    sender_id: userId,
    message: 'Hello @john',
    mentions: ['user-id-of-john']
  })
  .select()
  .single();

// Get recent messages
const { data, error } = await supabase
  .from('chats')
  .select('*, members(name)')
  .order('created_at', { ascending: false })
  .limit(50);
```


### Supabase Edge Functions

#### cutoff-enforcer Function

**Purpose**: Validates meal registration changes against cutoff times

**Endpoint**: `POST /functions/v1/cutoff-enforcer`

**Request**:
```typescript
{
  action: 'add' | 'remove';
  memberId: string;
  mealDate: string;
  period: 'morning' | 'night';
}
```

**Response**:
```typescript
{
  success: boolean;
  error?: string;
  cutoffPassed?: boolean;
}
```

**Logic**:
1. Get current time in UTC+6 timezone
2. Check if action is before cutoff (7 AM for morning, 6 PM for night)
3. If after cutoff, return error
4. If before cutoff, perform database operation
5. If after cutoff but action succeeds (admin override), post violation message to chat

#### send-push-notification Function

**Purpose**: Sends push notifications for chat mentions

**Trigger**: Database trigger on chats table insert

**Logic**:
1. Parse mentions from message
2. Query push_subscriptions for mentioned users
3. Send Web Push notification to each subscription
4. Handle failed subscriptions (remove invalid ones)

#### monthly-report Function

**Purpose**: Generates monthly meal consumption report

**Endpoint**: `POST /functions/v1/monthly-report`

**Request**:
```typescript
{
  month: string; // 'YYYY-MM'
}
```

**Response**:
```typescript
{
  members: Array<{
    name: string;
    morningCount: number;
    nightCount: number;
    monthlyTotal: number;
  }>;
}
```

**SQL Query**:
```sql
SELECT 
  m.name,
  COUNT(*) FILTER (WHERE me.period = 'morning') as morning_count,
  COUNT(*) FILTER (WHERE me.period = 'night') as night_count,
  COUNT(*) as monthly_total
FROM members m
LEFT JOIN meals me ON me.member_id = m.id
  AND date_trunc('month', me.meal_date) = date_trunc('month', $1::date)
GROUP BY m.id, m.name
ORDER BY m.name;
```


### Row Level Security (RLS) Policies

```sql
-- Members can read all member profiles
CREATE POLICY "Members can view all profiles"
  ON members FOR SELECT
  USING (auth.role() = 'authenticated');

-- Members can update their own profile
CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  USING (auth.uid() = id);

-- Members can insert their own meals
CREATE POLICY "Members can add own meals"
  ON meals FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Members can delete their own meals
CREATE POLICY "Members can remove own meals"
  ON meals FOR DELETE
  USING (auth.uid() = member_id);

-- Everyone can read all meals
CREATE POLICY "Members can view all meals"
  ON meals FOR SELECT
  USING (auth.role() = 'authenticated');

-- Everyone can read meal details
CREATE POLICY "Members can view meal details"
  ON meal_details FOR SELECT
  USING (auth.role() = 'authenticated');

-- Everyone can update meal details
CREATE POLICY "Members can edit meal details"
  ON meal_details FOR ALL
  USING (auth.role() = 'authenticated');

-- Everyone can read chats
CREATE POLICY "Members can view chats"
  ON chats FOR SELECT
  USING (auth.role() = 'authenticated');

-- Members can insert their own messages
CREATE POLICY "Members can send messages"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Members can manage their own push subscriptions
CREATE POLICY "Members can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = member_id);
```

## Real-Time Subscriptions

### Meal Updates Subscription

```typescript
const mealSubscription = supabase
  .channel('meals-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'meals',
      filter: `meal_date=eq.${today}`
    },
    (payload) => {
      // Update meal counts in UI
      refreshMealCounts();
    }
  )
  .subscribe();
```

### Chat Messages Subscription

```typescript
const chatSubscription = supabase
  .channel('chat-messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chats'
    },
    (payload) => {
      const newMessage = payload.new as ChatMessage;
      // Add message to chat UI
      addMessageToChat(newMessage);
      
      // Check if current user is mentioned
      if (newMessage.mentions.includes(currentUserId)) {
        showNotification(newMessage);
      }
    }
  )
  .subscribe();
```


### Meal Details Subscription

```typescript
const mealDetailsSubscription = supabase
  .channel('meal-details-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'meal_details',
      filter: `meal_date=eq.${today}`
    },
    (payload) => {
      // Update meal details in UI
      updateMealDetails(payload.new);
    }
  )
  .subscribe();
```

## State Management

### Zustand Stores

#### authStore

```typescript
interface AuthState {
  user: Member | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    set({ user: data.user, session: data.session });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ user: member, session, loading: false });
    } else {
      set({ loading: false });
    }
  }
}));
```

#### mealStore

```typescript
interface MealState {
  meals: Meal[];
  mealDetails: MealDetails | null;
  counts: { morning: MealCount; night: MealCount };
  loading: boolean;
  addMeal: (period: 'morning' | 'night') => Promise<void>;
  removeMeal: (period: 'morning' | 'night') => Promise<void>;
  updateMealDetails: (period: string, details: string) => Promise<void>;
  fetchTodayMeals: () => Promise<void>;
}
```

#### chatStore

```typescript
interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  sendMessage: (message: string, mentions: string[]) => Promise<void>;
  fetchMessages: (limit?: number) => Promise<void>;
  subscribeToMessages: () => void;
}
```


## Offline Support and PWA

### Service Worker Strategy

```typescript
// service-worker.ts
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3
  })
);

// Cache static assets with cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'image' || 
                   request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets'
  })
);

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: data.url
    })
  );
});
```

### Offline Behavior

Write operations require an internet connection. When offline, the UI shows an offline indicator and actions fail with a network error.


### Web App Manifest

```json
{
  "name": "Mess Meal Management",
  "short_name": "Mess Meals",
  "description": "Manage daily meals for your boarding mess",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#5B4B8A",
  "theme_color": "#5B4B8A",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Push Notifications

### Web Push Setup

```typescript
// notifications.ts
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(userId: string): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  const subscriptionData = {
    member_id: userId,
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
    auth: arrayBufferToBase64(subscription.getKey('auth'))
  };

  await supabase.from('push_subscriptions').upsert(subscriptionData);
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('member_id', userId);
  }
}
```

### Edge Function for Sending Notifications

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.5.0';

serve(async (req) => {
  const { mentionedUserIds, message, senderName } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get push subscriptions for mentioned users
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('member_id', mentionedUserIds);

  const vapidKeys = {
    publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
    privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!,
    subject: 'mailto:admin@messmeal.app'
  };

  webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  const notifications = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    const payload = JSON.stringify({
      title: `${senderName} mentioned you`,
      body: message,
      url: '/chat'
    });

    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (error) {
      // Remove invalid subscription
      if (error.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id);
      }
    }
  });

  await Promise.all(notifications);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```


## UI/UX Design

### Theme System

#### Eggplant Theme (Default)

```css
:root[data-theme="eggplant"] {
  /* Primary colors */
  --color-primary: #5B4B8A;
  --color-primary-light: #7B6BAA;
  --color-primary-dark: #3B2B6A;
  
  /* Accent colors */
  --color-accent: #E8B4F0;
  --color-accent-light: #F5D4FF;
  
  /* Background colors */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F8F5FA;
  --color-bg-tertiary: #EDE8F5;
  
  /* Text colors */
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  
  /* Border colors */
  --color-border: #E0D5ED;
  --color-border-light: #F0E8F7;
  
  /* Status colors */
  --color-success: #4CAF50;
  --color-error: #F44336;
  --color-warning: #FF9800;
  --color-info: #2196F3;
}
```

#### Dark Theme

```css
:root[data-theme="dark"] {
  /* Primary colors */
  --color-primary: #7B6BAA;
  --color-primary-light: #9B8BCA;
  --color-primary-dark: #5B4B8A;
  
  /* Accent colors */
  --color-accent: #E8B4F0;
  --color-accent-light: #F5D4FF;
  
  /* Background colors */
  --color-bg-primary: #1A1A1A;
  --color-bg-secondary: #2A2A2A;
  --color-bg-tertiary: #3A3A3A;
  
  /* Text colors */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #CCCCCC;
  --color-text-tertiary: #999999;
  
  /* Border colors */
  --color-border: #444444;
  --color-border-light: #555555;
  
  /* Status colors */
  --color-success: #66BB6A;
  --color-error: #EF5350;
  --color-warning: #FFA726;
  --color-info: #42A5F5;
}
```

### Responsive Breakpoints

```css
/* Mobile first approach */
/* xs: 0-639px (default) */
/* sm: 640px+ */
@media (min-width: 640px) { }

/* md: 768px+ */
@media (min-width: 768px) { }

/* lg: 1024px+ */
@media (min-width: 1024px) { }

/* xl: 1280px+ */
@media (min-width: 1280px) { }
```

### Layout Structure

#### Mobile Layout (< 768px)

```
┌─────────────────────────┐
│   Header (Date, Icon)   │
├─────────────────────────┤
│                         │
│                         │
│    Content Area         │
│    (Tab Content)        │
│                         │
│                         │
├─────────────────────────┤
│  Bottom Nav (3 tabs)    │
└─────────────────────────┘
```

#### Desktop Layout (>= 768px)

```
┌──────┬──────────────────────┐
│      │   Header (Date, Icon)│
│      ├──────────────────────┤
│ Side │                      │
│ Nav  │                      │
│ (3   │   Content Area       │
│ tabs)│   (Tab Content)      │
│      │                      │
│      │                      │
└──────┴──────────────────────┘
```


### Component Styling Guidelines

#### Buttons

```css
/* Primary button */
.btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
  min-height: 44px; /* Touch target */
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Secondary button */
.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
  min-height: 44px;
}
```

#### Cards

```css
.card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
}

.card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
```

#### Inputs

```css
.input {
  background: var(--color-bg-primary);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px; /* Prevents zoom on iOS */
  transition: border-color 0.2s;
  min-height: 44px;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
}
```

### Animation Guidelines

```css
/* Keep animations minimal for performance */
.fade-in {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Error Handling

### Client-Side Error Handling

```typescript
// Custom error types
export class CutoffError extends Error {
  constructor(period: string, cutoffTime: string) {
    super(`Cannot modify ${period} meal after ${cutoffTime}`);
    this.name = 'CutoffError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Error handler utility
export function handleError(error: unknown): string {
  if (error instanceof CutoffError) {
    return error.message;
  }
  
  if (error instanceof NetworkError) {
    return 'Network error. Your changes will be synced when you\'re back online.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// Toast notification for errors
export function showErrorToast(message: string) {
  // Use a toast library like react-hot-toast
  toast.error(message, {
    duration: 4000,
    position: 'top-center'
  });
}
```


### Server-Side Error Handling

```typescript
// Edge Function error handling
export function handleDatabaseError(error: any) {
  if (error.code === '23505') {
    // Unique constraint violation
    return {
      success: false,
      error: 'This meal is already registered'
    };
  }
  
  if (error.code === '23503') {
    // Foreign key violation
    return {
      success: false,
      error: 'Invalid member or reference'
    };
  }
  
  return {
    success: false,
    error: 'Database error occurred'
  };
}
```

### Retry Logic

```typescript
// Exponential backoff retry
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Usage
const data = await retryWithBackoff(() => 
  supabase.from('meals').select('*')
);
```

## Testing Strategy

### Unit Testing

**Framework**: Vitest

**Coverage Goals**:
- Utility functions: 90%+
- State management: 80%+
- Components: 70%+

**Example Tests**:

```typescript
// cutoffChecker.test.ts
import { describe, it, expect, vi } from 'vitest';
import { isCutoffPassed, getTimeUntilCutoff } from './cutoffChecker';

describe('cutoffChecker', () => {
  it('should return true if morning cutoff passed', () => {
    const mockDate = new Date('2025-10-24T07:30:00+06:00');
    vi.setSystemTime(mockDate);
    
    expect(isCutoffPassed('morning')).toBe(true);
  });
  
  it('should return false if morning cutoff not passed', () => {
    const mockDate = new Date('2025-10-24T06:30:00+06:00');
    vi.setSystemTime(mockDate);
    
    expect(isCutoffPassed('morning')).toBe(false);
  });
  
  it('should calculate time until cutoff correctly', () => {
    const mockDate = new Date('2025-10-24T06:30:00+06:00');
    vi.setSystemTime(mockDate);
    
    const timeUntil = getTimeUntilCutoff('morning');
    expect(timeUntil).toBe(30 * 60 * 1000); // 30 minutes in ms
  });
});
```


### Component Testing

```typescript
// MealToggle.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealToggle } from './MealToggle';

describe('MealToggle', () => {
  it('should render morning and night options', () => {
    render(
      <MealToggle
        activePeriod="morning"
        onPeriodChange={vi.fn()}
        cutoffPassed={{ morning: false, night: false }}
      />
    );
    
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Night')).toBeInTheDocument();
  });
  
  it('should call onPeriodChange when clicked', () => {
    const handleChange = vi.fn();
    render(
      <MealToggle
        activePeriod="morning"
        onPeriodChange={handleChange}
        cutoffPassed={{ morning: false, night: false }}
      />
    );
    
    fireEvent.click(screen.getByText('Night'));
    expect(handleChange).toHaveBeenCalledWith('night');
  });
  
  it('should disable period if cutoff passed', () => {
    render(
      <MealToggle
        activePeriod="morning"
        onPeriodChange={vi.fn()}
        cutoffPassed={{ morning: true, night: false }}
      />
    );
    
    const morningButton = screen.getByText('Morning').closest('button');
    expect(morningButton).toBeDisabled();
  });
});
```

### Integration Testing

**Framework**: Playwright

**Test Scenarios**:
1. User authentication flow
2. Meal registration and removal
3. Real-time updates across multiple clients
4. Chat with mentions
5. Offline queue and sync

```typescript
// e2e/meal-registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Meal Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/home');
  });
  
  test('should add morning meal before cutoff', async ({ page }) => {
    // Mock time to before cutoff
    await page.clock.setFixedTime(ne
w Date('2025-10-24T06:00:00+06:00'));
    
    await page.click('[data-testid="add-meal-button"]');
    
    await expect(page.locator('[data-testid="meal-count"]')).toContainText('1');
  });
  
  test('should prevent adding meal after cutoff', async ({ page }) => {
    // Mock time to after cutoff
    await page.clock.setFixedTime(new Date('2025-10-24T07:30:00+06:00'));
    
    await page.click('[data-testid="add-meal-button"]');
    
    await expect(page.locator('[role="alert"]')).toContainText('cutoff');
  });
});
```

### Performance Testing

**Metrics to Monitor**:
- Initial load time: < 2s on 3G
- Time to Interactive (TTI): < 3s
- First Contentful Paint (FCP): < 1.5s
- Bundle size: < 200KB gzipped
- API response time: < 500ms (p95)

**Tools**:
- Lighthouse CI for automated performance audits
- WebPageTest for real-world testing
- Chrome DevTools Performance panel

## Performance Optimization

### Code Splitting

```typescript
// Lazy load routes
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Chat = lazy(() => import('./pages/Chat'));
const Preferences = lazy(() => import('./pages/Preferences'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/preferences" element={<Preferences />} />
      </Routes>
    </Suspense>
  );
}
```

### Image Optimization

```typescript
// Use modern formats with fallbacks
<picture>
  <source srcSet="/icon.webp" type="image/webp" />
  <source srcSet="/icon.png" type="image/png" />
  <img src="/icon.png" alt="Icon" loading="lazy" />
</picture>
```

### Database Query Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_meals_date_period ON meals(meal_date, period);
CREATE INDEX idx_meals_member_date ON meals(member_id, meal_date);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_chats_mentions ON chats USING GIN(mentions);

-- Materialized view for monthly reports (optional)
CREATE MATERIALIZED VIEW monthly_meal_summary AS
SELECT 
  date_trunc('month', meal_date) as month,
  member_id,
  COUNT(*) FILTER (WHERE period = 'morning') as morning_count,
  COUNT(*) FILTER (WHERE period = 'night') as night_count,
  COUNT(*) as total_count
FROM meals
GROUP BY date_trunc('month', meal_date), member_id;

CREATE INDEX idx_monthly_summary ON monthly_meal_summary(month, member_id);

-- Refresh monthly (via cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_meal_summary;
```

### React Performance

```typescript
// Memoize expensive computations
const mealCounts = useMemo(() => {
  return calculateMealCounts(meals, members);
}, [meals, members]);

// Memoize callbacks
const handleMealToggle = useCallback((period: string) => {
  addMeal(period);
}, [addMeal]);

// Virtualize long lists
import { FixedSizeList } from 'react-window';

function ChatMessages({ messages }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ChatMessage message={messages[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

