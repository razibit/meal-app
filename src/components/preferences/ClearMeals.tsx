import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { getTodayDate } from '../../utils/dateHelpers';
import { showErrorToast, handleError } from '../../utils/errorHandling';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';

type Period = 'morning' | 'night';

export function ClearMeals() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('morning');
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const sendMessage = useChatStore((state) => state.sendMessage);
  const user = useAuthStore((state) => state.user);

  const handleDeleteClick = () => {
    setConfirmText('');
    setShowConfirmDialog(true);
    setShowFinalConfirm(false);
  };

  const handleConfirmTextChange = (text: string) => {
    setConfirmText(text);
    if (text === 'Delete') {
      setShowFinalConfirm(true);
    } else {
      setShowFinalConfirm(false);
    }
  };

  const handleFinalConfirm = async () => {
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('meals')
        .update({ quantity: 0 })
        .eq('meal_date', selectedDate)
        .eq('period', selectedPeriod);

      if (error) throw error;

      // Send notification to group chat
      if (user?.name) {
        try {
          await sendMessage(
            `${user.name} has cleared everyone's meals for ${selectedPeriod}.`,
            []
          );
        } catch (chatError) {
          console.error('Failed to send chat notification:', chatError);
        }
      }

      // Success feedback
      alert(`All ${selectedPeriod} meals for ${selectedDate} have been cleared.`);
      
      // Reset state
      setShowConfirmDialog(false);
      setShowFinalConfirm(false);
      setConfirmText('');
    } catch (error) {
      console.error('Error clearing meals:', error);
      showErrorToast(handleError(error));
    } finally {
      setIsClearing(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setShowFinalConfirm(false);
    setConfirmText('');
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 text-text-primary">
        Clear All Meals for a Period
      </h3>
      <p className="text-sm text-text-secondary mb-4">
        Use this to clear all members' meals when the cook doesn't come for a specific period.
      </p>

      <div className="space-y-4">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input w-full"
            disabled={showConfirmDialog}
          />
        </div>

        {/* Period Selection */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Period
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="morning"
                checked={selectedPeriod === 'morning'}
                onChange={(e) => setSelectedPeriod(e.target.value as Period)}
                className="w-4 h-4 text-primary focus:ring-primary"
                disabled={showConfirmDialog}
              />
              <span className="text-text-primary">Morning</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="night"
                checked={selectedPeriod === 'night'}
                onChange={(e) => setSelectedPeriod(e.target.value as Period)}
                className="w-4 h-4 text-primary focus:ring-primary"
                disabled={showConfirmDialog}
              />
              <span className="text-text-primary">Night</span>
            </label>
          </div>
        </div>

        {/* Delete Button */}
        {!showConfirmDialog && (
          <button
            onClick={handleDeleteClick}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            🗑️ Delete All Meals for This Period
          </button>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="border-2 border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 space-y-4">
            <div>
              <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                Type "Delete" to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => handleConfirmTextChange(e.target.value)}
                placeholder="Type Delete here"
                className="input w-full"
                autoFocus
                disabled={isClearing}
              />
            </div>

            {showFinalConfirm && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Are you sure you want to delete all members' meals?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleFinalConfirm}
                    disabled={isClearing}
                    className="btn-primary flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {isClearing ? 'Clearing...' : 'Yes, Delete All Meals'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isClearing}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showFinalConfirm && (
              <button
                onClick={handleCancel}
                disabled={isClearing}
                className="btn-secondary w-full"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
