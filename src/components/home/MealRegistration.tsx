import { useState } from 'react';
import { MealPeriod } from '../../utils/cutoffChecker';

interface MealRegistrationProps {
  period: MealPeriod;
  hasRegistered: boolean;
  isLoading: boolean;
  onRegister: () => Promise<void>;
  onRemove: () => Promise<void>;
}

function MealRegistration({
  period,
  hasRegistered,
  isLoading,
  onRegister,
  onRemove,
}: MealRegistrationProps) {
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);

  const handleRegister = async () => {
    setOptimisticState(true);
    try {
      await onRegister();
    } catch (error) {
      setOptimisticState(null);
      // Error will be handled by parent component
    }
  };

  const handleRemove = async () => {
    setOptimisticState(false);
    try {
      await onRemove();
    } catch (error) {
      setOptimisticState(null);
      // Error will be handled by parent component
    }
  };

  const displayState = optimisticState !== null ? optimisticState : hasRegistered;

  return (
    <div className="mb-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {period === 'morning' ? 'Morning' : 'Night'} Meal Registration
        </h3>

        {!displayState ? (
          <button
            onClick={handleRegister}
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Registering...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>I Ate</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">Meal registered</span>
            </div>
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="w-full bg-error hover:bg-error/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-touch"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>Remove Meal</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MealRegistration;
