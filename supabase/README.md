# Supabase Database Setup

This directory contains SQL migration files for the Mess Meal Management System database.

## Migration Files

1. **001_create_schema.sql** - Creates all database tables and indexes
   - members table
   - meals table with meal_period enum
   - meal_details table
   - chats table
   - push_subscriptions table
   - Indexes for performance optimization
   - Triggers for updated_at columns

2. **002_create_rls_policies.sql** - Sets up Row Level Security policies
   - Members table policies (view all, update own)
   - Meals table policies (insert/delete own, view all)
   - Meal details policies (all authenticated can edit)
   - Chats policies (view all, insert own)
   - Push subscriptions policies (manage own)

3. **003_create_functions.sql** - Creates database functions and additional indexes
   - get_monthly_report() - Aggregate meal data for monthly reporting
   - get_today_meal_counts() - Get meal counts with rice preferences
   - check_meal_exists() - Check if meal registration exists
   - get_member_monthly_summary() - Detailed monthly summary for a member
   - Additional performance indexes

## Setup Instructions

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project (if not already done):
   ```bash
   supabase init
   ```

3. Link to your Supabase project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Apply migrations:
   ```bash
   supabase db push
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of each migration file in order:
   - 001_create_schema.sql
   - 002_create_rls_policies.sql
   - 003_create_functions.sql
4. Execute each file

### Option 3: Local Development

1. Start local Supabase:
   ```bash
   supabase start
   ```

2. Apply migrations:
   ```bash
   supabase db reset
   ```

## Database Schema Overview

### Tables

- **members** - User profiles with rice preferences
- **meals** - Meal registrations (member_id, date, period)
- **meal_details** - Daily menu descriptions
- **chats** - Chat messages with mentions support
- **push_subscriptions** - Web push notification subscriptions

### Key Features

- Row Level Security (RLS) enabled on all tables
- Automatic updated_at timestamp triggers
- Optimized indexes for common queries
- GIN index for array-based mention searches
- Unique constraints to prevent duplicate meal registrations

## Testing the Setup

After running migrations, you can test with these queries:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test the monthly report function
SELECT * FROM get_monthly_report('2025-10-01');

-- Test meal counts function
SELECT * FROM get_today_meal_counts('2025-10-24', 'morning');
```

## Environment Variables

Make sure to set these in your `.env` file:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Security Notes

- All tables have RLS enabled
- Service role key should only be used in Edge Functions
- Anon key is safe for client-side use with RLS
- Members can only modify their own meal registrations
- All authenticated users can edit meal details and notices
