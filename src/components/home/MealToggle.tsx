import { useEffect, useState } from 'react';
import { MealPeriod, isCutoffPassed, formatTimeUntilCutoff, getActivePeriod } from '../../utils/cutoffChecker';
import { getTodayDate } from '../../utils/dateHelpers';

interface MealToggleProps {
  activePeriod: MealPeriod;
  onPeriodChange: (period: MealPeriod) => void;
  selectedDate: string;
}

function MealToggle({ activePeriod, onPeriodChange, selectedDate }: MealToggleProps) {
  const todayDate = getTodayDate();
  const isFutureDate = selectedDate > todayDate;
  
  const [cutoffStatus, setCutoffStatus] = useState({
    morning: isCutoffPassed('morning', selectedDate),
    night: isCutoffPassed('night', selectedDate),
  });
  const [countdown, setCountdown] = useState({
    morning: formatTimeUntilCutoff('morning'),
    night: formatTimeUntilCutoff('night'),
  });

  // Update cutoff status and countdown every minute
  useEffect(() => {
    const updateStatus = () => {
      setCutoffStatus({
        morning: isCutoffPassed('morning', selectedDate),
        night: isCutoffPassed('night', selectedDate),
      });
      setCountdown({
        morning: formatTimeUntilCutoff('morning'),
        night: formatTimeUntilCutoff('night'),
      });
    };

    // Update immediately
    updateStatus();

    // Then update every minute
    const interval = setInterval(updateStatus, 60000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  // Auto-switch to active period on mount (only for today)
  useEffect(() => {
    if (!isFutureDate) {
      const currentPeriod = getActivePeriod();
      if (activePeriod !== currentPeriod) {
        onPeriodChange(currentPeriod);
      }
    }
  }, [selectedDate]);

  return (
    <div className="mb-6">
      <div className="flex gap-2 bg-bg-tertiary p-1 rounded-lg">
        <button
          onClick={() => onPeriodChange('morning')}
          className={`
            flex-1 py-3 px-4 rounded-md font-medium transition-all min-h-touch cursor-pointer
            ${activePeriod === 'morning'
              ? 'bg-primary text-white shadow-lg'
              : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          <div className="flex flex-col items-center">
            <span className="text-lg">Morning</span>
            {isFutureDate ? (
              <span className="text-xs mt-1 opacity-75">
                Available
              </span>
            ) : (
              <>
                {!cutoffStatus.morning && (
                  <span className="text-xs mt-1 opacity-75">
                    {countdown.morning}
                  </span>
                )}
                {cutoffStatus.morning && (
                  <span className="text-xs mt-1 opacity-75">
                    Cutoff passed
                  </span>
                )}
              </>
            )}
          </div>
        </button>

        <button
          onClick={() => onPeriodChange('night')}
          className={`
            flex-1 py-3 px-4 rounded-md font-medium transition-all min-h-touch cursor-pointer
            ${activePeriod === 'night'
              ? 'bg-primary text-white shadow-lg'
              : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          <div className="flex flex-col items-center">
            <span className="text-lg">Night</span>
            {isFutureDate ? (
              <span className="text-xs mt-1 opacity-75">
                Available
              </span>
            ) : (
              <>
                {!cutoffStatus.night && (
                  <span className="text-xs mt-1 opacity-75">
                    {countdown.night}
                  </span>
                )}
                {cutoffStatus.night && (
                  <span className="text-xs mt-1 opacity-75">
                    Cutoff passed
                  </span>
                )}
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

export default MealToggle;
