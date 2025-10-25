import { useEffect, useState } from 'react';
import { offlineQueue, QueueStatus } from '../../services/offlineQueue';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('idle');
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to queue status changes
    const unsubscribe = offlineQueue.subscribe((status, length) => {
      setQueueStatus(status);
      setQueueLength(length);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Don't show anything if online and queue is empty
  if (isOnline && queueLength === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
      <div
        className={`rounded-lg shadow-lg p-3 flex items-center gap-3 ${
          !isOnline
            ? 'bg-yellow-50 border border-yellow-200'
            : queueStatus === 'processing'
            ? 'bg-blue-50 border border-blue-200'
            : queueStatus === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-green-50 border border-green-200'
        }`}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {!isOnline ? (
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          ) : queueStatus === 'processing' ? (
            <svg
              className="w-5 h-5 text-blue-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : queueStatus === 'error' ? (
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              !isOnline
                ? 'text-yellow-800'
                : queueStatus === 'processing'
                ? 'text-blue-800'
                : queueStatus === 'error'
                ? 'text-red-800'
                : 'text-green-800'
            }`}
          >
            {!isOnline
              ? 'You are offline'
              : queueStatus === 'processing'
              ? 'Syncing changes...'
              : queueStatus === 'error'
              ? 'Sync failed'
              : 'All changes synced'}
          </p>
          {queueLength > 0 && (
            <p
              className={`text-xs ${
                !isOnline
                  ? 'text-yellow-600'
                  : queueStatus === 'processing'
                  ? 'text-blue-600'
                  : queueStatus === 'error'
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {queueLength} {queueLength === 1 ? 'action' : 'actions'} pending
            </p>
          )}
        </div>

        {/* Retry Button (only show on error) */}
        {queueStatus === 'error' && queueLength > 0 && (
          <button
            onClick={() => offlineQueue.processQueue()}
            className="flex-shrink-0 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
