import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEggStore } from '../../stores/eggStore';
import { supabase } from '../../services/supabase';
import { getMealMonthDateRange } from '../../utils/mealMonthHelpers';

function MealRateBadge() {
  const { user } = useAuthStore();
  const { eggPrice, fetchEggPrice } = useEggStore();
  const [mealRate, setMealRate] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);

  useEffect(() => {
    fetchEggPrice();
  }, [fetchEggPrice]);

  const fetchMealRate = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch total grocery expenses (cash + credit)
      const { data: totalExpenses, error: expError } = await supabase.rpc(
        'get_total_grocery_expenses',
        {
          p_start_date: dateRange.startDate,
          p_end_date: dateRange.endDate,
        }
      );
      if (expError) throw expError;

      // Fetch global monthly report to get total meals and total eggs
      const { data: reportData, error: reportError } = await supabase.rpc(
        'get_global_monthly_report_with_dates',
        {
          p_start_date: dateRange.startDate,
          p_end_date: dateRange.endDate,
        }
      );
      if (reportError) throw reportError;

      // Calculate totals from global report
      // Each row has: member_id, member_name, meal_date, morning_count, night_count, egg_count
      const rows = reportData || [];
      let totalMeals = 0;
      let totalEggs = 0;

      rows.forEach((row: any) => {
        totalMeals += (row.morning_count || 0) + (row.night_count || 0);
        totalEggs += row.egg_count || 0;
      });

      if (totalMeals === 0) {
        setMealRate(0);
        return;
      }

      const expenses = totalExpenses || 0;
      const eggCost = totalEggs * eggPrice;
      const rate = (expenses - eggCost) / totalMeals;

      setMealRate(Math.max(0, rate));
    } catch (err) {
      console.error('Error calculating meal rate:', err);
    }
  }, [user, dateRange, eggPrice]);

  useEffect(() => {
    fetchMealRate();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMealRate, 60000);
    return () => clearInterval(interval);
  }, [fetchMealRate]);

  const handleClick = () => {
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2000);
  };

  if (mealRate === null) return null;

  return (
    <span className="ml-2 relative inline-flex">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
        aria-label="Meal Rate"
      >
        {/* Meal / utensils icon */}
        <svg
          className="w-4 h-4 text-blue-700 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z"
          />
        </svg>
        <span className="text-base font-bold text-blue-700 dark:text-blue-400">
          {Math.round(mealRate)}৳
        </span>
      </button>
      {showTooltip && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs font-medium px-2 py-1 rounded shadow-lg z-20 animate-fade-in">
          Meal Rate
        </span>
      )}
    </span>
  );
}

export default MealRateBadge;
