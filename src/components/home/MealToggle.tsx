import { useEffect, useState } from 'react';
import { MealPeriod, isCutoffPassed, formatTimeUntilCutoff, getActivePeriod } from '../../utils/cutoffChecker';

interface MealToggleProps {
  activePeriod: MealPeriod;
  onPeriodChange: (period: MealPeriod) => void;
}

function MealToggle({ activePeriod, onPeriodChange }: MealToggleProps) {
  const [cutoffStatus, setCutoffStatus] = useState({
    morning: isCutoffPassed('morning'),
    night: isCutoffPassed('night'),
  });
  const [countdown, setCountdown] = useState({
    morning: formatTimeUntilCutoff('morning'),
    night: formatTimeUntilCutoff('night'),
  });

  // Update cutoff status and countdown every minute
  useEffect(() => {
    const updateStatus = () => {
      setCutoffStatus({
        morning: isCutoffPassed('morning'),
        night: isCutoffPassed('night'),
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
  }, []);

  // Auto-switch to active period on mount
  useEffect(() => {
    const currentPeriod = getActivePeriod();
    if (activePeriod !== currentPeriod) {
      onPeriodChange(currentPeriod);
    }
  }, []);

  return (
    <div className="mb-6">
      <div className="flex gap-2 bg-bg-tertiary p-1 rounded-lg">
        <button
          onClick={() => onPeriodChange('morning')}
          disabled={cutoffStatus.morning}
          className={`
            flex-1 py-3 px-4 rounded-md font-medium transition-all min-h-touch
            ${activePeriod === 'morning'
              ? 'bg-primary text-white shadow-lg'
              : 'text-text-secondary hover:text-text-primary'
            }
            ${cutoffStatus.morning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center">
            <span className="text-lg">Morning</span>
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
          </div>
        </button>

        <button
          onClick={() => onPeriodChange('night')}
          disabled={cutoffStatus.night}
          className={`
            flex-1 py-3 px-4 rounded-md font-medium transition-all min-h-touch
            ${activePeriod === 'night'
              ? 'bg-primary text-white shadow-lg'
              : 'text-text-secondary hover:text-text-primary'
            }
            ${cutoffStatus.night ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center">
            <span className="text-lg">Night</span>
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
          </div>
        </button>
      </div>
    </div>
  );
}

export default MealToggle;
