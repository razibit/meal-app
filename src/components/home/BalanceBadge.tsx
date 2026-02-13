import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useGroceryExpenseStore } from '../../stores/groceryExpenseStore';
import { getMealMonthDateRange } from '../../utils/mealMonthHelpers';

function BalanceBadge() {
  const { user } = useAuthStore();
  const { getBalance } = useGroceryExpenseStore();
  const [balance, setBalance] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    const bal = await getBalance(dateRange.startDate, dateRange.endDate);
    setBalance(bal);
  }, [user, dateRange, getBalance]);

  useEffect(() => {
    fetchBalance();
    // Refresh balance every 60 seconds
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const handleClick = () => {
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2000);
  };

  if (balance === null) return null;

  return (
    <span className="ml-2 relative inline-flex">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-3 py-1 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors"
        aria-label="Current Available Balance"
      >
        <span className="text-base font-bold text-green-700 dark:text-green-400">
          ৳{Math.round(balance).toLocaleString()}
        </span>
      </button>
      {showTooltip && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs font-medium px-2 py-1 rounded shadow-lg z-20 animate-fade-in">
          Current Balance
        </span>
      )}
    </span>
  );
}

export default BalanceBadge;
