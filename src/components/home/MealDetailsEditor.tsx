import { useState, useEffect, useRef } from 'react';
import { MealPeriod } from '../../utils/cutoffChecker';
import { formatRelativeTime } from '../../utils/dateHelpers';

interface MealDetailsEditorProps {
  period: MealPeriod;
  details: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
  onSave: (details: string) => Promise<void>;
}

function MealDetailsEditor({
  period,
  details,
  updatedBy,
  updatedByName,
  updatedAt,
  onSave,
}: MealDetailsEditorProps) {
  const [value, setValue] = useState(details);
  const [isSaving, setIsSaving] = useState(false);
  const [optimisticValue, setOptimisticValue] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setValue(details);
  }, [details]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (500ms debounce)
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newValue);
    }, 500);
  };

  const handleBlur = () => {
    // Save immediately on blur if there are pending changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      handleSave(value);
    }
  };

  const handleSave = async (newValue: string) => {
    if (newValue === details) return;

    setIsSaving(true);
    setOptimisticValue(newValue);

    try {
      await onSave(newValue);
    } catch (error) {
      // Revert on error
      setValue(details);
      setOptimisticValue(null);
    } finally {
      setIsSaving(false);
      setOptimisticValue(null);
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const displayValue = optimisticValue !== null ? optimisticValue : value;

  return (
    <div className="mb-6">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-text-primary">
            {period === 'morning' ? 'Morning' : 'Night'} Menu
          </h3>
          {isSaving && (
            <span className="text-sm text-primary flex items-center gap-1">
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
              Saving...
            </span>
          )}
        </div>

        <textarea
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={`Enter ${period} menu details...`}
          className="input w-full min-h-[120px] resize-y"
        />

        {updatedAt && (
          <div className="mt-2 text-xs text-text-tertiary">
            Edited by {updatedByName || updatedBy || 'Unknown'} {formatRelativeTime(new Date(updatedAt))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MealDetailsEditor;
