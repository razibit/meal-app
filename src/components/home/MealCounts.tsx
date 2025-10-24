import { MealCount } from '../../types';

interface MealCountsProps {
  counts: MealCount;
  onShowParticipants: () => void;
}

function MealCounts({ counts, onShowParticipants }: MealCountsProps) {
  return (
    <div className="mb-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Meal Counts</h3>
          <button
            onClick={onShowParticipants}
            className="text-blue-500 hover:text-blue-400 transition-colors"
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
            className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-650 transition-colors"
          >
            <div className="text-2xl font-bold text-white mb-1">
              {counts.boiledRice}
            </div>
            <div className="text-sm text-gray-400">Boiled Rice</div>
          </div>

          {/* Atop Rice Count */}
          <div
            onClick={onShowParticipants}
            className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-650 transition-colors"
          >
            <div className="text-2xl font-bold text-white mb-1">
              {counts.atopRice}
            </div>
            <div className="text-sm text-gray-400">Atop Rice</div>
          </div>

          {/* Total Count */}
          <div
            onClick={onShowParticipants}
            className="bg-blue-600 rounded-lg p-4 cursor-pointer hover:bg-blue-700 transition-colors"
          >
            <div className="text-2xl font-bold text-white mb-1">
              {counts.total}
            </div>
            <div className="text-sm text-blue-100">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MealCounts;
