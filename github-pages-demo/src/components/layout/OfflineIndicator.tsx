import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show when offline (offline queueing has been removed)
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
      <div
        className="rounded-lg shadow-lg p-3 flex items-center gap-3 bg-yellow-50 border border-yellow-200"
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
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
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium text-yellow-800"
          >
            You are offline
          </p>
          <p className="text-xs text-yellow-600">Changes require an internet connection.</p>
        </div>
      </div>
    </div>
  );
}
