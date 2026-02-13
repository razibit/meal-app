import { useState, useEffect } from 'react';
import { useEggStore } from '../../stores/eggStore';
import { getTodayDate } from '../../utils/dateHelpers';
import { playSuccessSound } from '../../utils/soundFeedback';

export function EggInventory() {
  const { 
    totalAddedThisPeriod,
    inventoryHistory, 
    eggPrice,
    fetchTotalEggs, 
    fetchTotalAddedThisPeriod,
    fetchInventoryHistory,
    fetchEggPrice,
    updateEggPrice,
    updateTotalEggs, 
    loading 
  } = useEggStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [newTotal, setNewTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');

  useEffect(() => {
    fetchTotalEggs();
    fetchTotalAddedThisPeriod(getTodayDate());
    fetchEggPrice();
  }, [fetchTotalEggs, fetchTotalAddedThisPeriod, fetchEggPrice]);

  const handleEditPrice = () => {
    setPriceInput(eggPrice > 0 ? String(eggPrice) : '');
    setIsEditingPrice(true);
  };

  const handleSavePrice = async () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) {
      setError('Please enter a valid price');
      return;
    }
    try {
      await updateEggPrice(price);
      playSuccessSound();
      setIsEditingPrice(false);
      setPriceInput('');
      setError(null);
    } catch {
      setError('Failed to update egg price');
    }
  };

  const handleCancelPrice = () => {
    setIsEditingPrice(false);
    setPriceInput('');
    setError(null);
  };

  const handleEdit = () => {
    setNewTotal('');
    setNotes('');
    setMode('add');
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewTotal('');
    setNotes('');
    setMode('add');
    setError(null);
  };

  const handleToggleHistory = async () => {
    if (!showHistory) {
      await fetchInventoryHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleSave = async () => {
    const amount = parseInt(newTotal, 10);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid number (greater than 0)');
      return;
    }

    const effectiveAmount = mode === 'remove' ? -amount : amount;
    const autoNote = mode === 'remove'
      ? `Removed ${amount} eggs${notes ? ': ' + notes : ' (given to cook)'}`
      : notes || undefined;

    try {
      await updateTotalEggs(effectiveAmount, autoNote);
      playSuccessSound();
      setIsEditing(false);
      setNewTotal('');
      setNotes('');
      setMode('add');
      setError(null);
      // Refresh history if it's being shown
      if (showHistory) {
        await fetchInventoryHistory();
      }
    } catch (err) {
      setError('Failed to update egg inventory');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Egg Inventory</h3>
          <p className="text-sm text-text-secondary mt-1">
            Manage total eggs available in the kitchen
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditingPrice ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-text-secondary">৳</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="input w-20 px-2 py-1.5 rounded-lg border-2 border-border bg-bg-primary text-text-primary text-sm"
                placeholder="0"
                autoFocus
              />
              <button
                onClick={handleSavePrice}
                disabled={loading || !priceInput}
                className="btn-primary px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Set
              </button>
              <button
                onClick={handleCancelPrice}
                className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={handleEditPrice}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors text-sm font-bold text-amber-700 dark:text-amber-400"
              title="Click to set egg price"
            >
              {eggPrice > 0 ? `৳${eggPrice}/pc` : 'Set Price'}
            </button>
          )}
          <button
            onClick={handleToggleHistory}
            className="btn-secondary px-4 py-2 rounded-lg font-medium"
            disabled={loading}
          >
            {showHistory ? 'Hide' : 'Show'}
          </button>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="btn-secondary px-4 py-2 rounded-lg font-medium"
              disabled={loading}
            >
              Update
            </button>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥚</span>
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {totalAddedThisPeriod}
              </div>
              <div className="text-sm text-text-secondary">
                eggs were taken by members
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="egg-mode" className="block text-sm font-medium text-text-secondary mb-2">
              Action
            </label>
            <select
              id="egg-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'add' | 'remove')}
              className="input w-full px-4 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary"
            >
              <option value="add">Add eggs to inventory</option>
              <option value="remove">Remove eggs (e.g. given to cook)</option>
            </select>
          </div>

          <div>
            <label htmlFor="total-eggs" className="block text-sm font-medium text-text-secondary mb-2">
              {mode === 'add' ? 'Number of Eggs to Add' : 'Number of Eggs to Remove'}
            </label>
            <input
              id="total-eggs"
              type="number"
              min="1"
              value={newTotal}
              onChange={(e) => setNewTotal(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary"
              placeholder={mode === 'add' ? 'e.g. 24' : 'e.g. 8'}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text-secondary mb-2">
              Notes (optional)
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary"
              placeholder="e.g., Bought 30 eggs from market"
            />
          </div>

          {error && (
            <div className="text-error text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || !newTotal}
              className="btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="btn-secondary px-4 py-2 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>

          <div className="text-xs text-text-tertiary mt-2">
            {mode === 'add'
              ? '💡 Adds eggs to the inventory pool. All members share from this pool.'
              : '💡 Removes eggs from the pool (not counted against any member). Use when eggs are given to the cook for a meal.'}
          </div>
        </div>
      )}

      {showHistory && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-text-primary mb-3">Inventory History</h4>
          {loading ? (
            <div className="text-center py-4 text-text-secondary">Loading...</div>
          ) : inventoryHistory.length === 0 ? (
            <div className="text-center py-4 text-text-secondary">No history available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Added By</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Eggs</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryHistory.map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-bg-secondary/50 transition-colors">
                      <td className="py-3 px-4 text-sm text-text-primary">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary">
                        {item.member_name}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right font-semibold ${
                        item.total_eggs >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {item.total_eggs >= 0 ? `+${item.total_eggs}` : item.total_eggs}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary">
                        {item.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
