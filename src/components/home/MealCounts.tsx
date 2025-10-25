import { MealCount } from '../../types';

interface MealCountsProps {
  counts: MealCount;
  onShowParticipants: () => void;
}

function MealCounts({ counts, onShowParticipants }: MealCountsProps) {
  return (
    <div className="mb-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Meal Counts</h3>
          <button
            onClick={onShowParticipants}
            className="text-primary hover:text-primary-light transition-colors min-w-touch min-h-touch flex items-center justify-center"
            aria-label="View participants"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Boiled Rice Count */}
          <div
            onClick={onShowParticipants}
            className="bg-bg-tertiary rounded-lg p-4 cursor-pointer hover:bg-bg-secondary transition-colors min-h-touch"
          >
            <div className="text-2xl font-bold text-text-primary mb-1">
              {counts.boiledRice}
            </div>
            <div className="text-sm text-text-secondary">Boiled Rice</div>
          </div>

          {/* Atop Rice Count */}
          <div
            onClick={onShowParticipants}
            className="bg-bg-tertiary rounded-lg p-4 cursor-pointer hover:bg-bg-secondary transition-colors min-h-touch"
          >
            <div className="text-2xl font-bold text-text-primary mb-1">
              {counts.atopRice}
            </div>
            <div className="text-sm text-text-secondary">Atop Rice</div>
          </div>

          {/* Total Count */}
          <div
            onClick={onShowParticipants}
            className="bg-primary rounded-lg p-4 cursor-pointer hover:bg-primary-dark transition-colors min-h-touch"
          >
            <div className="text-2xl font-bold text-white mb-1">
              {counts.total}
            </div>
            <div className="text-sm text-white opacity-90">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MealCounts;
