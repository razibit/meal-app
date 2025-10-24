# Supabase Setup Checklist

Quick checklist to ensure your Supabase backend is properly configured.

## ✅ Pre-Setup

- [ ] Supabase account created
- [ ] New project created in Supabase dashboard
- [ ] Project credentials copied (URL and anon key)
- [ ] `.env` file created with credentials

## ✅ Database Schema

- [ ] Migration 001: Schema and tables created
  - [ ] `members` table exists
  - [ ] `meals` table exists with `meal_period` enum
  - [ ] `meal_details` table exists
  - [ ] `chats` table exists
  - [ ] `push_subscriptions` table exists
  - [ ] All indexes created
  - [ ] Triggers for `updated_at` working

- [ ] Migration 002: RLS policies configured
  - [ ] RLS enabled on all tables
  - [ ] Members policies (view all, update own)
  - [ ] Meals policies (insert/delete own, view all)
  - [ ] Meal details policies (all authenticated can edit)
  - [ ] Chats policies (view all, insert own)
  - [ ] Push subscriptions policies (manage own)

- [ ] Migration 003: Functions and indexes created
  - [ ] `get_monthly_report()` function exists
  - [ ] `get_today_meal_counts()` function exists
  - [ ] `check_meal_exists()` function exists
  - [ ] `get_member_monthly_summary()` function exists
  - [ ] Performance indexes created

## ✅ Verification Tests

Run these in SQL Editor:

```sql
-- 1. Check all tables exist (should return 5 tables)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Check RLS is enabled (all should be true)
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- 3. Check functions exist (should return 5 functions)
SELECT COUNT(*) FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- 4. Test monthly report function
SELECT * FROM get_monthly_report('2025-10-01');

-- 5. Test meal counts function
SELECT * FROM get_today_meal_counts(CURRENT_DATE, 'morning');
```

- [ ] All 5 tables exist
- [ ] RLS enabled on all tables
- [ ] All 5 functions exist and execute without errors
- [ ] No SQL errors in any verification query

## ✅ Authentication Setup

- [ ] Email provider enabled
- [ ] Site URL configured (http://localhost:5173 for dev)
- [ ] JWT expiry set to 2592000 seconds (30 days)
- [ ] Email confirmations configured (optional)

## ✅ Realtime Configuration

- [ ] Realtime enabled for `meals` table
- [ ] Realtime enabled for `meal_details` table
- [ ] Realtime enabled for `chats` table

To verify: Go to Database > Replication and check these tables are listed.

## ✅ Test Users (Optional for Development)

- [ ] At least 2 test users created via Authentication > Users
- [ ] Member profiles created in `members` table for test users
- [ ] Test login works with created users

## ✅ Sample Data (Optional)

- [ ] `seed.sql` updated with real user IDs
- [ ] Seed data executed successfully
- [ ] Sample meals visible in database
- [ ] Sample meal details visible

## ✅ Environment Variables

- [ ] `.env` file exists (not committed to git)
- [ ] `VITE_SUPABASE_URL` set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` set correctly
- [ ] `.env.example` updated with all required variables

## ✅ Security Checks

- [ ] `.env` file in `.gitignore`
- [ ] Service role key kept secret (not in client code)
- [ ] RLS policies tested with different users
- [ ] Anon key used for client-side code only

## ✅ Documentation

- [ ] `README.md` reviewed
- [ ] `SETUP_GUIDE.md` followed
- [ ] `queries.sql` available for reference
- [ ] Team members have access to documentation

## ✅ Local Development (Optional)

- [ ] Supabase CLI installed
- [ ] `supabase start` runs successfully
- [ ] Local Studio accessible at http://localhost:54323
- [ ] Migrations applied to local database

## 🎯 Ready for Next Steps

Once all items are checked:

- ✅ Task 2.1: Database schema created
- ✅ Task 2.2: RLS policies configured
- ✅ Task 2.3: Database functions created

**You're ready to proceed with:**
- Task 3: Implement authentication system
- Task 4: Build core layout and navigation
- Task 5: Implement Home tab - Meal management

## 🆘 Troubleshooting

If any checks fail, refer to:
- `SETUP_GUIDE.md` for detailed instructions
- `queries.sql` for debugging queries
- Supabase documentation: https://supabase.com/docs

Common issues:
- **RLS blocking queries**: Check you're authenticated and policies are correct
- **Functions not found**: Ensure migration 003 ran successfully
- **Realtime not working**: Enable replication for tables in Database > Replication
- **Auth errors**: Verify site URL and redirect URLs are configured

## 📝 Notes

- Keep this checklist updated as you make changes
- Document any custom modifications to the schema
- Review security settings before production deployment
- Set up database backups in Supabase dashboard
