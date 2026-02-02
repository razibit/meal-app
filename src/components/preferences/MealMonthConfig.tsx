import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../services/supabase';
import { timeService } from '../../services/timeService';
import {
  getMealMonthDateRange,
  formatDateRangeForDisplay,
  hasCustomMealMonth,
  isValidDateRange,
  getDefaultMealMonthDates,
} from '../../utils/mealMonthHelpers';

export function MealMonthConfig() {
  const user = useAuthStore((state) => state.user);
  const [isEditing, setIsEditing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize dates when component mounts or user changes
  useEffect(() => {
    if (user) {
      const dateRange = getMealMonthDateRange(user);
      setStartDate(dateRange.startDate);
      setEndDate(dateRange.endDate);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    // Validate date range
    if (!isValidDateRange(startDate, endDate)) {
      setError('End date must be after start date');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const { error: updateError } = await supabase
        .from('members')
        .update({
          meal_month_start_date: startDate,
          meal_month_end_date: endDate,
          updated_at: timeService.now().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      const { data: updatedMember, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update auth store
      useAuthStore.setState({ user: updatedMember });

      setSuccess(true);
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update meal month dates';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Clear custom dates (set to null) to use default 6th-5th logic
      const { error: updateError } = await supabase
        .from('members')
        .update({
          meal_month_start_date: null,
          meal_month_end_date: null,
          updated_at: timeService.now().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      const { data: updatedMember, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update auth store
      useAuthStore.setState({ user: updatedMember });

      // Reset to default dates for display
      const defaultDates = getDefaultMealMonthDates();
      setStartDate(defaultDates.startDate);
      setEndDate(defaultDates.endDate);

      setSuccess(true);
      setIsEditing(false);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset meal month dates';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      const dateRange = getMealMonthDateRange(user);
      setStartDate(dateRange.startDate);
      setEndDate(dateRange.endDate);
    }
    setIsEditing(false);
    setError(null);
  };

  if (!user) {
    return null;
  }

  const isCustom = hasCustomMealMonth(user);
  const currentRange = getMealMonthDateRange(user);
  const displayRange = formatDateRangeForDisplay(currentRange.startDate, currentRange.endDate);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Meal Management Month</h3>

      <div className="space-y-4">
        {/* Current Configuration Display */}
        <div className="p-3 bg-bg-secondary rounded-lg border border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Current Period</p>
              <p className="text-text-primary font-medium">{displayRange}</p>
              <p className="text-xs text-text-tertiary mt-1">
                {isCustom ? 'Custom configuration' : 'Default (6th to 5th)'}
              </p>
            </div>
            {!isEditing && (
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Editing Mode */}
        {isEditing && (
          <>
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-text-secondary mb-1">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-full"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-text-secondary mb-1">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-full"
                disabled={loading}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 Your monthly report will show data for this date range. By default, the meal management month runs from the 6th of one month to the 5th of the next month.
              </p>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">
              Meal month dates updated successfully!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading || !startDate || !endDate}
                className="btn-primary flex-1"
              >
                {loading ? 'Saving...' : 'Save Dates'}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary flex-1"
              >
                Configure Dates
              </button>
              {isCustom && (
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="btn-secondary"
                  title="Reset to default (6th to 5th)"
                >
                  Reset to Default
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
