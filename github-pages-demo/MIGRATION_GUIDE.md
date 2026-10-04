# Database Migration Guide - Egg Counter Feature

## Prerequisites
- Access to Supabase project
- Supabase CLI installed (or use Supabase Dashboard)

## Migration Steps

### Option 1: Using Supabase CLI

```bash
# Navigate to your project directory
cd g:\meal-app

# Run migrations (they will be applied in order)
supabase db push

# Or if using remote database
supabase db push --db-url "your-database-url"
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the following migrations in order:

#### Step 1: Create Eggs Table
Copy and run the contents of: `supabase/migrations/010_create_eggs_table.sql`

#### Step 2: Add Report Functions
Copy and run the contents of: `supabase/migrations/011_add_member_report_functions.sql`

## Verification

After running migrations, verify the setup:

### 1. Check Tables
```sql
-- Should show the eggs table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'eggs';
```

### 2. Check Functions
```sql
-- Should show both new functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_member_monthly_report', 'get_monthly_summary');
```

### 3. Test Egg Insert
```sql
-- Replace 'your-user-id' with an actual member UUID
INSERT INTO eggs (member_id, egg_date, quantity)
VALUES ('your-user-id', CURRENT_DATE, 2);

-- Verify
SELECT * FROM eggs WHERE member_id = 'your-user-id';
```

### 4. Test Report Function
```sql
-- Replace 'your-user-id' with an actual member UUID
SELECT * FROM get_member_monthly_report(
  'your-user-id'::uuid, 
  date_trunc('month', CURRENT_DATE)::text
);
```

## RLS Policies Verification

The eggs table has Row Level Security enabled. Test that:

1. **Users can only insert their own eggs**:
   - Try inserting an egg record for your own user_id ✓
   - Should fail if trying to insert for another user ✗

2. **Users can view all egg records**:
   - All users should be able to see all eggs (for meal planning)

3. **Users can only update/delete their own eggs**:
   - Should be able to modify your own records ✓
   - Should fail when trying to modify another user's records ✗

## Rollback (if needed)

If you need to rollback the migrations:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS get_member_monthly_report(uuid, text);
DROP FUNCTION IF EXISTS get_monthly_summary(text);

-- Drop eggs table
DROP TABLE IF EXISTS eggs;
```

## Post-Migration Tasks

1. **Clear browser cache** to ensure new TypeScript types are loaded
2. **Restart development server**:
   ```bash
   npm run dev
   ```
3. **Test the UI**:
   - Check egg counter appears in header
   - Test adding/updating egg quantity
   - Verify monthly report shows eggs column

## Troubleshooting

### Issue: Function not found
**Solution**: Make sure both migration files were executed in order

### Issue: RLS policy blocking operations
**Solution**: Check that user is authenticated and using their own user_id

### Issue: Egg counter not showing
**Solution**: 
- Hard refresh browser (Ctrl+F5)
- Check browser console for errors
- Verify user is logged in

### Issue: Report showing old format
**Solution**: 
- Clear browser cache
- Restart dev server
- Check that the report page is using the new function

## Success Indicators

✅ Eggs table created with proper indexes  
✅ RLS policies active and working  
✅ Report functions created and accessible  
✅ Egg counter visible in UI header  
✅ Monthly report shows Date/Morning/Night/Eggs columns  
✅ Export (CSV/PDF) includes egg data  

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard
2. Check browser console for JavaScript errors
3. Verify database connection is active
4. Ensure all migrations completed successfully
