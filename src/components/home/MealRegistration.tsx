import { useState, useEffect } from 'react';
import { MealPeriod } from '../../utils/cutoffChecker';

interface MealRegistrationProps {
  period: MealPeriod;
  currentQuantity: number;
  autoMealEnabled: boolean;
  isLoading: boolean;
  isCutoffPassed: boolean;
  isFutureDate?: boolean;
  onSaveQuantity: (quantity: number) => Promise<void>;
  onToggleAutoMeal: (enabled: boolean) => Promise<void>;
}

function MealRegistration({
  period,
  currentQuantity,
  autoMealEnabled,
  isLoading,
  isCutoffPassed,
  isFutureDate = false,
  onSaveQuantity,
  onToggleAutoMeal,
}: MealRegistrationProps) {
  const [quantity, setQuantity] = useState(currentQuantity);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingAutoMeal, setIsTogglingAutoMeal] = useState(false);
  
  // Sync local quantity when currentQuantity changes (e.g., from server)
  useEffect(() => {
    setQuantity(currentQuantity);
  }, [currentQuantity]);

  const hasChanges = quantity !== currentQuantity;
  
  // Disable quantity controls for future dates when auto meal is enabled
  const isQuantityDisabled = isCutoffPassed || (autoMealEnabled && isFutureDate);

  const handleIncrement = () => {
    if (quantity < 10) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
    }
  };

  const handleSave = async () => {
    if (!hasChanges || isQuantityDisabled) return;
    
    setIsSaving(true);
    try {
      await onSaveQuantity(quantity);
    } catch (error) {
      // Revert on error
      setQuantity(currentQuantity);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAutoMeal = async () => {
    setIsTogglingAutoMeal(true);
    try {
      await onToggleAutoMeal(!autoMealEnabled);
    } finally {
      setIsTogglingAutoMeal(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {period === 'morning' ? 'Morning' : 'Night'} Meal Registration
        </h3>

        {/* Quantity Selector */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Decrement Button */}
            <button
              onClick={handleDecrement}
              disabled={quantity <= 0 || isLoading || isSaving || isQuantityDisabled}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl
                transition-all min-h-touch
                ${quantity <= 0 || isQuantityDisabled
                  ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                  : 'bg-bg-tertiary text-text-primary hover:bg-primary hover:text-white active:scale-95'
                }
              `}
              aria-label="Decrease meal quantity"
            >
              −
            </button>

            {/* Quantity Display */}
            <div className="flex items-center gap-2 min-w-[80px] justify-center">
              <span className={`
                text-2xl font-bold tabular-nums
                ${quantity === 0 ? 'text-error' : 'text-primary'}
              `}>
                {quantity}
              </span>
              <span className="text-text-secondary">
                {quantity === 1 ? 'Meal' : 'Meals'}
              </span>
            </div>

            {/* Increment Button */}
            <button
              onClick={handleIncrement}
              disabled={quantity >= 10 || isLoading || isSaving || isQuantityDisabled}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl
                transition-all min-h-touch
                ${quantity >= 10 || isQuantityDisabled
                  ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                  : 'bg-bg-tertiary text-text-primary hover:bg-primary hover:text-white active:scale-95'
                }
              `}
              aria-label="Increase meal quantity"
            >
              +
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading || isSaving || isQuantityDisabled}
            className={`
              px-6 py-2 rounded-lg font-semibold transition-all min-h-touch
              flex items-center gap-2
              ${!hasChanges || isQuantityDisabled
                ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark active:scale-95'
              }
            `}
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
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
                <span>Saving...</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>

        {/* Status Message */}
        {quantity === 0 && (
          <div className="flex items-center gap-2 text-error text-sm mb-4">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <span>Meal is turned off for this {period}</span>
          </div>
        )}

        {quantity > 0 && !hasChanges && (
          <div className="flex items-center gap-2 text-success text-sm mb-4">
            <svg
              className="w-4 h-4"
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
            <span>{quantity} {quantity === 1 ? 'meal' : 'meals'} registered</span>
          </div>
        )}

        {hasChanges && (
          <div className="flex items-center gap-2 text-warning text-sm mb-4">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Unsaved changes</span>
          </div>
        )}

        {isCutoffPassed && (
          <div className="flex items-center gap-2 text-text-tertiary text-sm mb-4">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Cutoff passed - cannot modify</span>
          </div>
        )}

        {autoMealEnabled && isFutureDate && (
          <div className="flex items-center gap-2 text-text-tertiary text-sm mb-4">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Auto Meal is managing future meals - quantity control disabled</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border my-4" />

        {/* Auto Meal Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-text-primary">Auto Meal</div>
            <div className="text-sm text-text-secondary">
              Automatically register {period} meal daily
            </div>
          </div>
          
          <button
            onClick={handleToggleAutoMeal}
            disabled={isTogglingAutoMeal}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full
              transition-colors duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${autoMealEnabled ? 'bg-primary' : 'bg-bg-tertiary'}
              ${isTogglingAutoMeal ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            `}
            role="switch"
            aria-checked={autoMealEnabled}
            aria-label={`Toggle auto meal for ${period}`}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white shadow-lg
                transition duration-200 ease-in-out
                ${autoMealEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {autoMealEnabled && (
          <div className="mt-2 text-xs text-text-tertiary">
            Your {period} meal will be auto-registered with 1 meal each day
          </div>
        )}
      </div>
    </div>
  );
}

export default MealRegistration;
