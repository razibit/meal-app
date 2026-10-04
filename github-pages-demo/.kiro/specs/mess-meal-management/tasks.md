# Implementation Plan

- [x] 1. Set up project structure and dependencies





  - Initialize React + Vite project with TypeScript
  - Install core dependencies: Tailwind CSS, Zustand, React Router, Supabase client
  - Install PWA dependencies: Workbox, vite-plugin-pwa
  - Configure Vite for optimal bundle splitting and performance
  - Set up Tailwind CSS with custom theme configuration
  - _Requirements: 9.5_

- [x] 2. Configure Supabase backend





  - [x] 2.1 Create database schema and tables


    - Create members table with RLS policies
    - Create meals table with meal_period enum and indexes
    - Create meal_details table
    - Create chats table with GIN index for mentions
    - Create push_subscriptions table
    - _Requirements: 10.3, 12.1, 12.3_
  
  - [x] 2.2 Set up Row Level Security policies


    - Implement RLS policies for members table (view all, update own)
    - Implement RLS policies for meals table (insert/delete own, view all)
    - Implement RLS policies for meal_details (all authenticated can edit)
    - Implement RLS policies for chats (view all, insert own)
    - Implement RLS policies for push_subscriptions (manage own)
    - _Requirements: 10.3_
  
  - [x] 2.3 Create database functions


    - Create get_monthly_report RPC function for aggregating meal data
    - Add database indexes for performance optimization
    - _Requirements: 7.3, 12.3_

- [x] 3. Implement authentication system




  - [x] 3.1 Create Supabase client configuration


    - Set up Supabase client with environment variables
    - Configure auth persistence and session management
    - _Requirements: 10.1_
  
  - [x] 3.2 Build auth store with Zustand


    - Implement authStore with user, session, loading state
    - Create signIn, signOut, and initialize methods
    - Handle auth state changes and session refresh
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [x] 3.3 Create login/signup UI components


    - Build login form with email and password fields
    - Add form validation and error handling
    - Implement loading states and error messages
    - _Requirements: 10.1_

- [x] 4. Build core layout and navigation





  - [x] 4.1 Create main layout component


    - Implement responsive layout shell with header and content area
    - Add bottom navigation for mobile (<768px)
    - Add side navigation for desktop (>=768px)
    - _Requirements: 9.4_
  
  - [x] 4.2 Implement bottom/side navigation


    - Create BottomNav component with 3 tabs (Home, Chat, Preferences)
    - Integrate React Router for client-side navigation
    - Add active tab highlighting
    - _Requirements: 1.1_
  
  - [x] 4.3 Create header component


    - Display current date with proper formatting
    - Add people icon button in top-right corner
    - Implement responsive header layout
    - _Requirements: 1.1, 2.4_

- [x] 5. Implement Home tab - Meal management





  - [x] 5.1 Create meal toggle component



    - Build segmented control for Morning/Night toggle
    - Implement auto-switch based on time of day (morning until 12 PM)
    - Add cutoff time countdown display
    - Disable toggle when cutoff passed
    - _Requirements: 1.1, 1.3, 1.4, 11.5_
  


  - [x] 5.2 Build meal counts display

    - Display boiled rice and atop rice counts separately
    - Show total meal count for active period
    - Make counts clickable to show participant list modal


    - _Requirements: 2.1, 2.2, 2.5_
  
  - [x] 5.3 Create meal registration controls

    - Add "I Ate" button for self meal registration
    - Implement add/remove meal functionality


    - Show optimistic UI updates
    - Handle cutoff validation errors
    - _Requirements: 1.2, 1.5_
  
  - [x] 5.4 Implement meal details editor



    - Create editable text area for morning/night menu
    - Add auto-save on blur with 500ms debounce
    - Display "Edited by [Name] at [Time]" metadata
    - Implement optimistic updates


    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [x] 5.6 Create members list modal

    - Build modal triggered by people icon
    - Display all 16 members with names and icons
    - Add scrollable list
    - Implement close on backdrop click
    - _Requirements: 2.4_

- [x] 6. Implement real-time meal updates




  - [x] 6.1 Create meal store with Zustand


    - Implement mealStore with meals, counts, and loading state
    - Create addMeal and removeMeal methods
    - Add updateMealDetails and fetchTodayMeals methods
    - _Requirements: 1.2, 3.2_
  
  - [x] 6.2 Set up Supabase Realtime subscriptions


    - Subscribe to meals table changes for today's date
    - Subscribe to meal_details table updates
    - Update UI when changes detected
    - Handle subscription cleanup on unmount
    - _Requirements: 2.3, 3.2_
  
  - [x] 6.3 Implement cutoff time enforcement


    - Create cutoffChecker utility for client-side validation
    - Implement server-side cutoff validation in Edge Function
    - Use UTC+6 timezone for all cutoff calculations
    - Display appropriate error messages when cutoff passed
    - _Requirements: 1.3, 1.4, 1.5, 11.1, 11.2, 11.3, 11.4_

- [x] 7. Build Chat tab with mentions





  - [x] 7.1 Create chat store with Zustand


    - Implement chatStore with messages and loading state
    - Create sendMessage and fetchMessages methods
    - Add subscribeToMessages for real-time updates
    - _Requirements: 5.1_
  
  - [x] 7.2 Build chat messages display


    - Create ChatMessages component with message list
    - Implement auto-scroll to bottom on new messages
    - Highlight mentions for current user
    - Display violation messages in red color
    - Add infinite scroll for message history
    - _Requirements: 5.1, 5.5, 4.1, 4.2_
  
  - [x] 7.3 Implement chat input with mentions


    - Create ChatInput component with text area
    - Detect @ symbol and trigger autocomplete
    - Parse mentions from message text
    - Send message with mentions array
    - Clear input after send
    - _Requirements: 5.2, 5.3_
  
  - [x] 7.4 Build mention autocomplete


    - Create MentionAutocomplete dropdown component
    - Filter members by typed characters after @
    - Implement keyboard navigation (up/down arrows)
    - Handle selection on click or Enter
    - Position dropdown relative to cursor
    - _Requirements: 5.2_
  
  - [x] 7.5 Set up real-time chat subscription


    - Subscribe to chats table INSERT events
    - Add new messages to chat UI in real-time
    - Check for mentions of current user
    - Trigger notifications for mentions
    - _Requirements: 5.5_

- [x] 8. Implement post-cutoff violation tracking





  - [x] 8.1 Create Edge Function for cutoff enforcement


    - Build cutoff-enforcer Edge Function
    - Validate meal changes against cutoff times
    - Return appropriate error responses
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 8.2 Post violation messages to chat


    - When meal added/removed after cutoff, insert chat message
    - Format message as "X has added/removed their meal after [time]"
    - Set is_violation flag to true
    - Display violation messages in red in chat
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Build Preferences tab





  - [x] 9.1 Create profile section


    - Display user name, email, and phone
    - Implement inline editing for name and phone
    - Make email read-only
    - Add save button with loading state
    - _Requirements: 6.1_
  
  - [x] 9.2 Implement theme toggle


    - Create toggle for eggplant and dark themes
    - Apply theme via CSS variables
    - Persist theme preference to localStorage
    - Add smooth transition animation
    - _Requirements: 6.3, 6.4_
  
  - [x] 9.3 Build notification settings


    - Display current notification permission status
    - Add toggle to enable/disable notifications
    - Request browser permission when enabling
    - Show instructions if permission blocked
    - _Requirements: 6.2_

- [x] 10. Implement push notifications




  - [x] 10.1 Set up Web Push with VAPID


    - Generate VAPID keys for push notifications
    - Create notifications service module
    - Implement requestNotificationPermission function
    - Build subscribeToPush and unsubscribeFromPush functions
    - _Requirements: 5.4_
  
  - [x] 10.2 Create send-push-notification Edge Function


    - Build Edge Function triggered on chat insert
    - Parse mentions from new messages
    - Query push_subscriptions for mentioned users
    - Send Web Push notifications using web-push library
    - Handle failed subscriptions (remove invalid ones)
    - _Requirements: 5.4_
  
  - [x] 10.3 Integrate notifications in service worker


    - Handle push events in service worker
    - Display notification with title, body, and icon
    - Handle notification click to open chat tab
    - _Requirements: 5.4_

- [x] 11. Implement PWA features





  - [x] 11.1 Create web app manifest


    - Define app name, short_name, and description
    - Set display mode to standalone
    - Configure theme colors (eggplant: #5B4B8A)
    - Add app icons (192x192 and 512x512)
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 11.2 Set up service worker with Workbox


    - Configure vite-plugin-pwa
    - Implement precaching for app shell
    - Add network-first strategy for API calls
    - Add cache-first strategy for static assets
    - _Requirements: 8.4_
  
- [x] 12. Implement monthly reporting





  - [x] 12.1 Create monthly report view


    - Build UI to select month/year
    - Display table with columns: Name, Lunch, Dinner, Daily total, Monthly total
    - Fetch data using get_monthly_report RPC
    - _Requirements: 7.2, 7.3_
  
  - [x] 12.2 Add CSV export functionality


    - Implement export button
    - Generate CSV from monthly report data
    - Trigger browser download
    - _Requirements: 7.4_

- [x] 13. Implement error handling and retry logic





  - [x] 13.1 Create error handling utilities


    - Define custom error types (CutoffError, NetworkError)
    - Implement handleError function
    - Create showErrorToast for user feedback
    - _Requirements: 1.5, 12.5_
  
  - [x] 13.2 Add retry logic with exponential backoff


    - Implement retryWithBackoff utility
    - Apply to critical database operations
    - Configure max retries (3) and base delay (1000ms)
    - _Requirements: 12.5_

- [x] 14. Optimize performance





  - [x] 14.1 Implement code splitting


    - Lazy load route components (Home, Chat, Preferences)
    - Add Suspense boundaries with loading spinners
    - _Requirements: 9.5_
  
  - [x] 14.2 Optimize React rendering


    - Add useMemo for expensive calculations (meal counts)
    - Use useCallback for event handlers
    - Implement virtualization for long chat lists
    - _Requirements: 9.1, 9.2_
  
  - [x] 14.3 Optimize bundle size


    - Configure Vite for tree-shaking
    - Analyze bundle with rollup-plugin-visualizer
    - Ensure total bundle < 200KB gzipped
    - _Requirements: 9.5_

- [x] 15. Apply theme system and styling





  - [x] 15.1 Configure CSS variables for themes

    - Define eggplant theme colors
    - Define dark theme colors
    - Set up theme switching logic
    - _Requirements: 6.3, 6.4_
  
  - [x] 15.2 Implement responsive design


    - Apply mobile-first approach
    - Define breakpoints (sm: 640px, md: 768px, lg: 1024px)
    - Test on screen widths 320px to 1920px+
    - _Requirements: 9.4_
  
  - [x] 15.3 Style core components


    - Apply button styles (primary, secondary)
    - Style cards with borders and shadows
    - Style inputs with focus states
    - Ensure minimum touch target size (44x44px)
    - _Requirements: 9.4_
  
  - [x] 15.4 Add animations and transitions


    - Implement fade-in and slide-up animations
    - Add smooth transitions for theme changes
    - Respect prefers-reduced-motion
    - Keep animations minimal for performance
    - _Requirements: 9.1_

- [ ] 16. Deploy and configure hosting
  - [ ] 16.1 Configure Supabase project
    - Set up Supabase project with database
    - Configure authentication providers
    - Deploy Edge Functions
    - Set environment variables
    - _Requirements: 10.1_
  
  - [ ] 16.2 Deploy frontend to Render
    - Create Render static site
    - Configure build command and publish directory
    - Set environment variables (Supabase URL, anon key)
    - Configure custom domain (optional)
    - _Requirements: 9.1_

- [ ]* 17. Testing and quality assurance
  - [ ]* 17.1 Write unit tests
    - Test cutoffChecker utility functions
    - Test date helpers and validators
    - Test Zustand stores
    - Achieve 80%+ coverage for utilities
  
  - [ ]* 17.2 Write component tests
    - Test MealToggle component
    - Test ChatInput with mentions
    - Test theme toggle
    - Achieve 70%+ component coverage
  
  - [ ]* 17.3 Write integration tests
    - Test authentication flow
    - Test meal registration and removal
    - Test real-time updates
    - Test chat with mentions
    - Test offline queue and sync
