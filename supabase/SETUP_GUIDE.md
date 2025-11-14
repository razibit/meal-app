# Supabase Setup Guide

Complete guide for setting up the Supabase backend for the Mess Meal Management System.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (sign up at https://supabase.com)
- Supabase CLI installed: `npm install -g supabase`

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - Name: "Mess Meal Management"
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Wait for project to be provisioned (~2 minutes)

## Step 2: Get Project Credentials

1. In your Supabase project dashboard, go to Settings > API
2. Copy the following values:
   - **Project URL** (e.g., https://xxxxx.supabase.co)
   - **anon/public key** (safe to use in client-side code)
   - **service_role key** (keep secret, only for server-side)

3. Create a `.env` file in your project root:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your credentials:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   VITE_VAPID_PUBLIC_KEY=will_generate_later
   ```

## Step 3: Run Database Migrations

### Option A: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of each migration file in order:

   **First:** `supabase/migrations/001_create_schema.sql`
   - Click "Run" to execute
   - Verify: You should see "Success. No rows returned"

   **Second:** `supabase/migrations/002_create_rls_policies.sql`
   - Click "Run" to execute
   - Verify: Check that RLS is enabled

   **Third:** `supabase/migrations/003_create_functions.sql`
   - Click "Run" to execute
   - Verify: Functions are created

### Option B: Using Supabase CLI (Recommended for teams)

1. Link your local project to Supabase:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find project-ref in Settings > General)

2. Push migrations:
   ```bash
   supabase db push
   ```

3. Verify migrations:
   ```bash
   supabase db diff
   ```

## Step 4: Verify Database Setup

Run these queries in the SQL Editor to verify everything is set up correctly:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- chats, meal_details, meals, members, push_subscriptions

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All should show rowsecurity = true

-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION';

-- Expected functions:
-- check_meal_exists
-- get_member_monthly_summary
-- get_monthly_report
-- get_today_meal_counts
-- update_updated_at_column
```

## Step 5: Configure Authentication

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Enable **Email** provider (should be enabled by default)

3. **Disable Email Verification** (for simple registration):
   - Go to **Authentication > Settings**
   - Scroll to **Email Auth**
   - **Disable** "Enable email confirmations"
   - **Disable** "Confirm email changes with a confirmation email"
   - This allows users to register and login immediately without email verification

4. Set up redirect URLs:
   - Go to **Authentication > URL Configuration**
   - Add your site URL: `http://localhost:5173` (for development)
   - Add production URL when deploying

5. Configure Auth settings:
   - Go to **Authentication > Settings**
   - Set JWT expiry: 2592000 seconds (30 days)

## Step 6: Create Test Users

### Option A: Via Dashboard

1. Go to **Authentication > Users**
2. Click "Add user"
3. Enter email and password
4. Click "Create user"
5. Repeat for all 16 test members

### Option B: Via Auth API (Programmatic)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
)

// Create a user
const { data, error } = await supabase.auth.admin.createUser({
  email: 'john@example.com',
  password: 'secure_password',
  email_confirm: true
})

// Then insert member profile
await supabase.from('members').insert({
  id: data.user.id,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+8801712345601',
  rice_preference: 'boiled',
  role: 'admin'
})
```

## Step 7: Seed Sample Data (Optional)

If you want to test with sample data:

1. Update `supabase/seed.sql` with actual user IDs from Step 6
2. Run the seed file in SQL Editor
3. Verify data:
   ```sql
   SELECT COUNT(*) FROM members;
   SELECT COUNT(*) FROM meals;
   SELECT * FROM meal_details;
   ```

## Step 8: Test Database Functions

```sql
-- Test monthly report (replace with current month)
SELECT * FROM get_monthly_report('2025-10-01');

-- Test today's meal counts
SELECT * FROM get_today_meal_counts(CURRENT_DATE, 'morning');
SELECT * FROM get_today_meal_counts(CURRENT_DATE, 'night');

-- Test meal existence check (replace with real member ID)
SELECT check_meal_exists(
  '00000000-0000-0000-0000-000000000001'::uuid,
  CURRENT_DATE,
  'morning'::meal_period
);
```

## Step 9: Set Up Realtime (Already Enabled)

Realtime is enabled by default for all tables. Verify:

1. Go to **Database > Replication**
2. Ensure these tables have replication enabled:
   - meals
   - meal_details
   - chats

## Step 10: Configure Storage (Optional)

If you plan to add profile pictures or other files:

1. Go to **Storage**
2. Create a new bucket: "avatars"
3. Set bucket to public or configure RLS policies

## Local Development Setup

For local development with Supabase:

```bash
# Start local Supabase
supabase start

# This will start:
# - PostgreSQL database
# - Auth server
# - Realtime server
# - Storage server
# - Studio (local dashboard)

# Apply migrations to local database
supabase db reset

# Stop local Supabase
supabase stop
```

Local URLs:
- Studio: http://localhost:54323
- API: http://localhost:54321
- DB: postgresql://postgres:postgres@localhost:54322/postgres

## Troubleshooting

### Issue: Migrations fail with permission errors
**Solution:** Make sure you're using the correct project reference and have owner access

### Issue: RLS policies blocking queries
**Solution:** Verify you're authenticated and the policies match your use case. Check with:
```sql
SELECT current_user, current_setting('request.jwt.claims', true);
```

### Issue: Functions not found
**Solution:** Ensure migrations ran successfully and grant execute permissions:
```sql
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

### Issue: Realtime not working
**Solution:** Check that replication is enabled for the table in Database > Replication

## Next Steps

After completing this setup:

1. ✅ Database schema created
2. ✅ RLS policies configured
3. ✅ Functions and indexes created
4. ✅ Authentication configured
5. ✅ Test users created

You're now ready to:
- Implement the frontend authentication (Task 3)
- Build the UI components (Tasks 4-9)
- Set up Edge Functions for cutoff enforcement (Task 8)
- Configure push notifications (Task 10)

## Security Checklist

- [ ] Never commit `.env` file to git
- [ ] Keep service_role key secret (only use in Edge Functions)
- [ ] Verify RLS is enabled on all tables
- [ ] Test RLS policies with different user roles
- [ ] Use anon key for client-side code
- [ ] Enable email confirmations in production
- [ ] Set up proper CORS and redirect URLs
- [ ] Review and test all RLS policies before production

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)
