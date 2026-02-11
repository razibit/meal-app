import { useState } from 'react';
import { useDepositStore } from '../../stores/depositStore';
import { useMembers } from '../../hooks/useMembers';
import { playSuccessSound } from '../../utils/soundFeedback';

export function DepositSection() {
  const { addDeposit, loading } = useDepositStore();
  const { members, loading: membersLoading } = useMembers();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    setIsAdding(false);
    setSelectedMemberId('');
    setAmount('');
    setDetails('');
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedMemberId) {
      setError('Please select a member');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid amount (greater than 0)');
      return;
    }

    try {
      await addDeposit(selectedMemberId, amountValue, details || undefined);
      playSuccessSound();
      handleCancel();
    } catch (err) {
      setError('Failed to add deposit');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Deposit</h3>
          <p className="text-sm text-text-secondary mt-1">
            Add money deposits for members
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="btn-secondary px-4 py-2 rounded-lg font-medium"
            disabled={loading || membersLoading}
          >
            Add Deposit
          </button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-4">
          {/* User Selection Dropdown */}
          <div>
            <label htmlFor="depositor" className="block text-sm font-medium text-text-secondary mb-2">
              Depositor <span className="text-red-500">*</span>
            </label>
            <select
              id="depositor"
              value={selectedMemberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                setError(null);
              }}
              className="input w-full px-4 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary"
            >
              <option value="">Select a member</option>
              {members
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-text-secondary mb-2">
              Amount (৳ Taka) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              placeholder="Enter amount"
              min="0"
              step="0.01"
              className="input w-full px-4 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary"
            />
          </div>

          {/* Details Text Box */}
          <div>
            <label htmlFor="details" className="block text-sm font-medium text-text-secondary mb-2">
              Details (Optional)
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any notes or details about this deposit"
              rows={3}
              className="input w-full px-4 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Deposit'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="btn-secondary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
