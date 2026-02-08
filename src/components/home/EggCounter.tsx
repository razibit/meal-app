import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEggStore } from '../../stores/eggStore';

interface EggCounterProps {
  date: string;
}

function EggCounter({ date }: EggCounterProps) {
  const { user } = useAuthStore();
  const { getUserEggQuantity, updateEggQuantity, availableEggs, loading } = useEggStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(0);

  const currentQuantity = user ? getUserEggQuantity(user.id, date) : 0;

  const handleStartEdit = () => {
    setTempQuantity(currentQuantity);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempQuantity(0);
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate that we're not taking more than available
    if (tempQuantity > availableEggs) {
      console.error(`Cannot take ${tempQuantity} eggs when only ${availableEggs} are available`);
      return;
    }
    
    try {
      await updateEggQuantity(user.id, date, tempQuantity);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save egg quantity:', error);
    }
  };

  const increment = () => {
    setTempQuantity((prev) => Math.min(prev + 1, Math.min(50, availableEggs)));
  };

  const decrement = () => {
    setTempQuantity((prev) => Math.max(prev - 1, 0));
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-bg-tertiary/70 px-3 py-1">
        <span className="text-base font-bold text-green-600">{availableEggs}</span>
        <span className="text-sm font-medium text-text-secondary">🥚</span>
        <button
          onClick={decrement}
          disabled={loading || tempQuantity === 0}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-bg-primary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease eggs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-base md:text-lg font-semibold text-text-primary tabular-nums min-w-[2ch] text-center">
          {tempQuantity}
        </span>
        <button
          onClick={increment}
          disabled={loading || tempQuantity >= availableEggs || tempQuantity >= 50}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-bg-primary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase eggs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <div className="flex gap-1 ml-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-3 py-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className="inline-flex items-center gap-2 rounded-full bg-bg-tertiary/70 px-3 py-1 hover:bg-bg-tertiary transition-colors cursor-pointer"
      aria-label={`Available: ${availableEggs} eggs. You have taken: ${currentQuantity}. Click to edit`}
    >
      <span className="text-base font-bold text-green-600">{availableEggs}</span>
      <span className="text-sm">🥚</span>
      <span className="text-base md:text-lg font-semibold text-text-primary tabular-nums">
        {currentQuantity}
      </span>
    </button>
  );
}

export default EggCounter;
