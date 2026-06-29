import { useEffect, useState } from 'react';
import { MEAL_PERIOD_LABELS, MEAL_PERIODS, type MealPeriod } from '../../constants/meals';
import { formatTimeUntilCutoff, isCutoffPassed, getActivePeriod } from '../../utils/cutoffChecker';
import { getTodayDate } from '../../utils/dateHelpers';

interface MealToggleProps {
  activePeriod: MealPeriod;
  onPeriodChange: (period: MealPeriod) => void;
  selectedDate: string;
}

function MealToggle({ activePeriod, onPeriodChange, selectedDate }: MealToggleProps) {
  const todayDate = getTodayDate();
  const isFutureDate = selectedDate > todayDate;

  const [cutoffStatus, setCutoffStatus] = useState(
    Object.fromEntries(MEAL_PERIODS.map((period) => [period, isCutoffPassed(period, selectedDate)])) as Record<MealPeriod, boolean>
  );
  const [countdown, setCountdown] = useState(
    Object.fromEntries(MEAL_PERIODS.map((period) => [period, formatTimeUntilCutoff(period)])) as Record<MealPeriod, string>
  );

  useEffect(() => {
    const updateStatus = () => {
      setCutoffStatus(
        Object.fromEntries(MEAL_PERIODS.map((period) => [period, isCutoffPassed(period, selectedDate)])) as Record<MealPeriod, boolean>
      );
      setCountdown(
        Object.fromEntries(MEAL_PERIODS.map((period) => [period, formatTimeUntilCutoff(period)])) as Record<MealPeriod, string>
      );
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  useEffect(() => {
    if (!isFutureDate) {
      const currentPeriod = getActivePeriod();
      if (activePeriod !== currentPeriod) {
        onPeriodChange(currentPeriod);
      }
    }
  }, [activePeriod, isFutureDate, onPeriodChange]);

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-2 bg-bg-tertiary p-1 rounded-full">
        {MEAL_PERIODS.map((period) => (
          <button
            key={period}
            onClick={() => onPeriodChange(period)}
            className={`
              py-3 px-3 rounded-full font-medium transition-all min-h-touch cursor-pointer
              ${activePeriod === period
                ? 'bg-primary text-white shadow-lg'
                : 'text-text-secondary hover:text-text-primary animate-soft-glow'
              }
            `}
          >
            <div className="flex flex-col items-center">
              <span className="text-base sm:text-lg">{MEAL_PERIOD_LABELS[period]}</span>
              {isFutureDate ? (
                <span className="text-xs mt-1 opacity-75">Available</span>
              ) : (
                <span className="text-xs mt-1 opacity-75">
                  {cutoffStatus[period] ? 'Cutoff passed' : countdown[period]}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MealToggle;
