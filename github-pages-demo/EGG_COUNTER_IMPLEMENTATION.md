# Egg Counter and Report Redesign Implementation

## Overview
This document describes the implementation of the egg tracking system and the complete redesign of the monthly report page.

## Features Implemented

### 1. Egg Tracking System

#### Database Schema
- **New Table**: `eggs`
  - Fields: `id`, `member_id`, `egg_date`, `quantity`, `created_at`, `updated_at`
  - Constraint: One record per member per date
  - Quantity range: 0-50 eggs
  - Indexed on date and member+date for fast queries

#### Migration Files
- **010_create_eggs_table.sql**: Creates the eggs table with RLS policies
- **011_add_member_report_functions.sql**: Adds database functions for reporting

### 2. UI Components

#### Egg Counter in Header
- Location: Next to the time display in the header
- Display: 🥚 icon with current quantity
- Interaction: Click to edit
  - Shows: `- [quantity] + [Save] [Cancel]`
  - Increment/decrement buttons
  - Save/Cancel actions
- No auto-egg feature (unlike meals)
- Date-specific (not period-dependent)

#### Component Location
- `src/components/home/EggCounter.tsx`: New component for egg counter
- `src/components/layout/Header.tsx`: Updated to include egg counter

### 3. State Management

#### Egg Store
- **File**: `src/stores/eggStore.ts`
- **Actions**:
  - `fetchEggs(date)`: Fetch eggs for a specific date
  - `getUserEggQuantity(userId, date)`: Get user's egg count
  - `updateEggQuantity(memberId, date, quantity)`: Update or delete egg record
  - `clearError()`: Clear error state

### 4. Monthly Report Redesign

#### New Report Structure
The report now shows **individual member's daily data** instead of all members' totals:

```
Date         | Morning | Night | Eggs
-------------|---------|-------|------
Mon, Feb 2   |    2    |   1   |  3
Tue, Feb 3   |    1    |   2   |  0
...
Total        |   45    |  38   | 12
```

#### Key Changes
- **Before**: Showed all members with their monthly totals
- **After**: Shows logged-in member's daily breakdown for the month
- **Columns**: Date, Morning count, Night count, Egg count
- **Display**: 
  - Shows '-' for days with no data
  - Faded rows for empty days
  - Bold totals row at bottom

#### Database Functions
- **get_member_monthly_report(member_id, target_month)**: 
  - Returns daily breakdown with morning, night, and egg counts
  - Generates all dates in the month (even with no data)
  
- **get_monthly_summary(target_month)**: 
  - Updated to use meal quantities (not just counts)
  - Includes egg quantities
  - For admin/cost calculation purposes

### 5. Type Definitions

Updated `src/types/index.ts` with:
```typescript
export interface Egg {
  id: string;
  member_id: string;
  egg_date: string;
  quantity: number;
  created_at: string;
  updated_at?: string;
}

export interface DailyReportRow {
  meal_date: string;
  morning_count: number;
  night_count: number;
  egg_count: number;
}

export interface MemberMonthlyReport {
  dates: DailyReportRow[];
  totals: {
    morning: number;
    night: number;
    eggs: number;
  };
}
```

## User Flow

### Adding Eggs
1. User sees egg counter (🥚 0) next to time in header
2. Clicks on it to edit
3. Uses +/- buttons to adjust quantity
4. Clicks "Save" to update or "Cancel" to discard
5. If quantity is 0, the record is deleted

### Viewing Monthly Report
1. Navigate to Reports page
2. Select month from dropdown
3. See personal daily breakdown:
   - Each day shows morning meals, night meals, and eggs taken
   - Total row shows monthly sums
4. Export to CSV or PDF if needed

## Database Queries

### For Egg Data
```sql
-- Get eggs for a specific date
SELECT * FROM eggs 
WHERE egg_date = '2026-02-02' 
ORDER BY created_at DESC;

-- Update/Insert egg quantity
INSERT INTO eggs (member_id, egg_date, quantity)
VALUES ('user-id', '2026-02-02', 3)
ON CONFLICT (member_id, egg_date) 
DO UPDATE SET quantity = EXCLUDED.quantity;
```

### For Reports
```sql
-- Get member's monthly report
SELECT * FROM get_member_monthly_report(
  'user-id'::uuid, 
  '2026-02-01'
);

-- Get all members' summary (for admin/cost calculation)
SELECT * FROM get_monthly_summary('2026-02-01');
```

## Cost Calculation Notes

For month-end cost calculations, use the `get_monthly_summary()` function which:
- Sums meal **quantities** (not just registration counts)
- Includes egg quantities per member
- Returns data for all members

Example output:
```
member_name | morning_quantity | night_quantity | egg_quantity | monthly_total
------------|------------------|----------------|--------------|---------------
John        |        45        |       38       |      12      |      83
Jane        |        32        |       40       |       8      |      72
```

## Files Modified/Created

### New Files
- `supabase/migrations/010_create_eggs_table.sql`
- `supabase/migrations/011_add_member_report_functions.sql`
- `src/stores/eggStore.ts`
- `src/components/home/EggCounter.tsx`

### Modified Files
- `src/types/index.ts` - Added Egg and DailyReportRow types
- `src/components/layout/Header.tsx` - Added egg counter display
- `src/pages/Home.tsx` - Added egg store integration
- `src/pages/MonthlyReport.tsx` - Complete redesign for daily view

## Next Steps (If Needed)

1. **Admin View**: Create separate admin report showing all members' totals
2. **Egg Analytics**: Add egg consumption trends
3. **Cost Calculator**: Integrate meal and egg quantities for automatic billing
4. **Notifications**: Alert when eggs are running low (based on consumption)
5. **Historical Data**: Add charts showing consumption over time

## Testing Checklist

- [ ] Create egg records via UI
- [ ] Update egg quantity
- [ ] Delete egg records (set to 0)
- [ ] View monthly report with egg data
- [ ] Export report to CSV
- [ ] Export report to PDF
- [ ] Test with different months
- [ ] Test with no data for a month
- [ ] Verify totals calculation
- [ ] Test RLS policies (users can only modify their own eggs)
