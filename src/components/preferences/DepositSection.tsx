import { useState } from 'react';
import { useDepositStore } from '../../stores/depositStore';
import { useMembers } from '../../hooks/useMembers';
import { playSuccessSound } from '../../utils/soundFeedback';
import { getTodayDate } from '../../utils/dateHelpers';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../query/keys';
import { supabase } from '../../services/supabase';
import type { Deposit } from '../../types';

export function DepositSection() {
  const { addDeposit, updateDeposit, deleteDeposit, loading } = useDepositStore();
  const { members, loading: membersLoading } = useMembers();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [depositDate, setDepositDate] = useState(getTodayDate());
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDeposits, setShowDeposits] = useState(false);
  const depositsQuery = useQuery({
    queryKey: queryKeys.deposits(),
    queryFn: async () => {
      const { data, error } = await supabase.from('deposits').select('*').order('accounting_date', { ascending: false }).limit(50);
      if (error) throw error;
      return (data || []) as Deposit[];
    },
  });

  const editDeposit = async (deposit: Deposit) => {
    const nextAmount = window.prompt('Deposit amount', String(deposit.amount));
    if (nextAmount === null) return;
    const parsed = Number(nextAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) { setError('Please enter a valid amount'); return; }
    const nextDetails = window.prompt('Details', deposit.details || '');
    if (nextDetails === null) return;
    await updateDeposit(deposit.id, { depositorId: deposit.depositor_id, amount: parsed, accountingDate: deposit.accounting_date, details: nextDetails });
  };

  const removeDeposit = async (deposit: Deposit) => {
    if (!window.confirm('Delete this deposit?')) return;
    await deleteDeposit(deposit.id);
  };

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
      await addDeposit(selectedMemberId, amountValue, depositDate, details || undefined);
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

          <div>
            <label htmlFor="deposit-date" className="block text-sm font-medium text-text-secondary mb-2">Deposit Date <span className="text-red-500">*</span></label>
            <input id="deposit-date" type="date" value={depositDate} onChange={(event) => setDepositDate(event.target.value)} className="input w-full px-4 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary" required />
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
      {!isAdding && depositsQuery.data && depositsQuery.data.length > 0 && (
        <button type="button" className="w-full mt-4 py-2 flex items-center justify-between text-sm font-medium text-text-secondary hover:text-text-primary border-t border-border" onClick={() => setShowDeposits((value) => !value)} aria-expanded={showDeposits}>
          <span>Added deposits ({depositsQuery.data.length})</span><span aria-hidden="true">{showDeposits ? '▲' : '▼'}</span>
        </button>
      )}
      {!isAdding && showDeposits && depositsQuery.data && depositsQuery.data.length > 0 && (
        <div className="mt-4 divide-y divide-border border-t border-border">
          {depositsQuery.data.map((deposit) => {
            const member = members.find((item) => item.id === deposit.depositor_id);
            return <div key={deposit.id} className="py-3 flex items-center justify-between gap-3">
              <div><div className="font-medium text-text-primary">{member?.name || 'Member'} · ৳{Number(deposit.amount).toFixed(2)}</div><div className="text-xs text-text-secondary">{deposit.accounting_date}{deposit.details ? ` · ${deposit.details}` : ''}</div></div>
              <div className="flex gap-2"><button className="btn-secondary px-3 py-1 text-sm" disabled={loading} onClick={() => void editDeposit(deposit)}>Edit</button><button className="px-3 py-1 text-sm rounded border border-error text-error" disabled={loading} onClick={() => void removeDeposit(deposit)}>Delete</button></div>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}
