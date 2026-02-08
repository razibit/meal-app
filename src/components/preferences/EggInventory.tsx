import { useState, useEffect } from 'react';
import { useEggStore } from '../../stores/eggStore';

export function EggInventory() {
  const { 
    totalEggs, 
    inventoryHistory, 
    fetchTotalEggs, 
    fetchInventoryHistory,
    updateTotalEggs, 
    loading 
  } = useEggStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newTotal, setNewTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTotalEggs();
  }, [fetchTotalEggs]);

  const handleEdit = () => {
    setNewTotal(totalEggs.toString());
    setNotes('');
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewTotal('');
    setNotes('');
    setError(null);
  };

  const handleToggleHistory = async () => {
    if (!showHistory) {
      await fetchInventoryHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleSave = async () => {
    const total = parseInt(newTotal, 10);
    
    if (isNaN(total) || total < 0) {
      setError('Please enter a valid number (0 or greater)');
      return;
    }

    try {
      await updateTotalEggs(total, notes || undefined);
      setIsEditing(false);
      setNewTotal('');
      setNotes('');
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
        <div className="flex gap-2">
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
                {totalEggs}
              </div>
              <div className="text-sm text-text-secondary">
                eggs available in kitchen
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="total-eggs" className="block text-sm font-medium text-text-secondary mb-2">
              Total Eggs in Kitchen
            </label>
            <input
              id="total-eggs"
              type="number"
              min="0"
              value={newTotal}
              onChange={(e) => setNewTotal(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary"
              placeholder="Enter number of eggs"
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
            💡 This will set the total eggs available. Members track what they take from the kitchen.
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
                      <td className="py-3 px-4 text-sm text-text-primary text-right font-semibold">
                        {item.total_eggs}
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
