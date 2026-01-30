import { useEffect, useState } from 'react';
import { timeService } from '../../services/timeService';

interface TimeSyncStatus {
  synced: boolean;
  stale: boolean;
  lastSync: Date | null;
  offset: number;
}

export function TimeSyncIndicator() {
  const [status, setStatus] = useState<TimeSyncStatus>(timeService.getSyncStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Update status every 10 seconds
    const interval = setInterval(() => {
      setStatus(timeService.getSyncStatus());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Only show indicator if sync is stale or hasn't happened yet
  if (status.synced && !status.stale) {
    return null;
  }

  const getStatusColor = () => {
    if (!status.synced) return 'yellow';
    if (status.stale) return 'orange';
    return 'green';
  };

  const getStatusMessage = () => {
    if (!status.synced) return 'Time sync pending...';
    if (status.stale) return 'Time sync is stale';
    return 'Time synced';
  };

  const color = getStatusColor();
  const bgColor = color === 'yellow' ? 'bg-yellow-50' : color === 'orange' ? 'bg-orange-50' : 'bg-green-50';
  const borderColor = color === 'yellow' ? 'border-yellow-200' : color === 'orange' ? 'border-orange-200' : 'border-green-200';
  const textColor = color === 'yellow' ? 'text-yellow-800' : color === 'orange' ? 'text-orange-800' : 'text-green-800';
  const iconColor = color === 'yellow' ? 'text-yellow-600' : color === 'orange' ? 'text-orange-600' : 'text-green-600';

  return (
    <div className="fixed top-16 right-4 z-40">
      <div
        className={`rounded-lg shadow-lg p-3 flex items-center gap-3 ${bgColor} border ${borderColor} cursor-pointer transition-all hover:shadow-xl`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 ${iconColor} ${!status.synced ? 'animate-pulse' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${textColor}`}>
            {getStatusMessage()}
          </p>
          {showDetails && status.lastSync && (
            <div className={`text-xs ${textColor} mt-1 space-y-1`}>
              <p>Offset: {status.offset}ms</p>
              <p>Last sync: {new Date(status.lastSync).toLocaleTimeString()}</p>
              <p className="text-xs opacity-75">Click to dismiss</p>
            </div>
          )}
        </div>

        {/* Collapse/Expand Icon */}
        {!showDetails && (
          <div className="flex-shrink-0">
            <svg
              className={`w-4 h-4 ${iconColor}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
