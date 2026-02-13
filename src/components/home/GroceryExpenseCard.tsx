import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useGroceryExpenseStore } from '../../stores/groceryExpenseStore';
import { useMembers } from '../../hooks/useMembers';
import { playSuccessSound } from '../../utils/soundFeedback';

function GroceryExpenseCard() {
  const { user } = useAuthStore();
  const { addExpense, loading: storeLoading } = useGroceryExpenseStore();
  const { members } = useMembers();

  const [shopperId, setShopperId] = useState('');
  const [transactionType, setTransactionType] = useState<'cash' | 'credit'>('cash');
  const [details, setDetails] = useState('');
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!shopperId) {
      setErrorMessage('Please select a shopper');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await addExpense(shopperId, transactionType, parsedAmount, details || undefined);
      playSuccessSound();
      setSuccessMessage('Expense saved successfully!');
      // Reset form
      setShopperId('');
      setTransactionType('cash');
      setDetails('');
      setAmount('');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setErrorMessage('Failed to save expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="card">
        <h3 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          Grocery Expense
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {/* Shopper Dropdown */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Shopper
            </label>
            <select
              value={shopperId}
              onChange={(e) => setShopperId(e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-border bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Type
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => setTransactionType('cash')}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg font-medium transition-all ${
                  transactionType === 'cash'
                    ? 'bg-primary text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setTransactionType('credit')}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg font-medium transition-all ${
                  transactionType === 'credit'
                    ? 'bg-primary text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                💳 Credit
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {/* Details */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Details
            </label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Rice, Oil, etc..."
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-border bg-bg-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Amount (৳)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-border bg-bg-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-2 flex items-center gap-1 text-error text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-2 flex items-center gap-1 text-success text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || storeLoading}
          className={`
            w-full px-4 py-1.5 text-sm rounded-lg font-semibold transition-all
            flex items-center justify-center gap-1.5
            ${isSaving
              ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dark active:scale-95'
            }
          `}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Expense</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default GroceryExpenseCard;
