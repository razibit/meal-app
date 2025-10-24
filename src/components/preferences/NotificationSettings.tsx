import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  showTestNotification,
  type NotificationPermissionStatus,
} from '../../services/notifications';

export function NotificationSettings() {
  const user = useAuthStore((state) => state.user);
  const [permission, setPermission] = useState<NotificationPermissionStatus>(getNotificationPermission());
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if notifications are enabled
    const checkPermission = () => {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);
      setEnabled(currentPermission === 'granted');
    };

    checkPermission();

    // Listen for permission changes
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      if (enabled) {
        // Disable notifications
        const success = await unsubscribeFromPush(user.id);
        if (success) {
          setEnabled(false);
        } else {
          throw new Error('Failed to disable notifications');
        }
      } else {
        // Enable notifications
        const granted = await requestNotificationPermission();
        if (granted) {
          const subscribed = await subscribeToPush(user.id);
          if (subscribed) {
            setEnabled(true);
            setPermission('granted');
            
            // Show test notification
            try {
              await showTestNotification();
            } catch (err) {
              console.error('Failed to show test notification:', err);
            }
          } else {
            throw new Error('Failed to subscribe to notifications');
          }
        } else {
          setPermission(getNotificationPermission());
          throw new Error('Notification permission denied');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update notification settings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = () => {
    switch (permission) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Blocked';
      case 'default':
        return 'Not enabled';
      case 'unsupported':
        return 'Not supported';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (permission) {
      case 'granted':
        return 'text-success';
      case 'denied':
        return 'text-error';
      case 'default':
        return 'text-text-secondary';
      case 'unsupported':
        return 'text-text-tertiary';
      default:
        return 'text-text-secondary';
    }
  };

  if (!isNotificationSupported()) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Notifications</h3>
        <div className="p-4 bg-bg-secondary rounded-lg">
          <p className="text-sm text-text-secondary">
            Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Notifications</h3>

      <div className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
          <div>
            <p className="text-sm font-medium text-text-primary">Status</p>
            <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            permission === 'granted' ? 'bg-success' : 
            permission === 'denied' ? 'bg-error' : 
            'bg-text-tertiary'
          }`} />
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary">
          Enable notifications to receive alerts when someone mentions you in chat.
        </p>

        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          disabled={loading || permission === 'denied'}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
            enabled
              ? 'bg-error text-white hover:bg-error/90'
              : 'bg-primary text-white hover:bg-primary-dark'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Processing...' : enabled ? 'Disable Notifications' : 'Enable Notifications'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Instructions for blocked permissions */}
        {permission === 'denied' && (
          <div className="p-4 bg-bg-secondary rounded-lg space-y-2">
            <p className="text-sm font-medium text-text-primary">Notifications are blocked</p>
            <p className="text-sm text-text-secondary">
              To enable notifications, you need to allow them in your browser settings:
            </p>
            <ol className="text-sm text-text-secondary list-decimal list-inside space-y-1 ml-2">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Notifications" in the permissions list</li>
              <li>Change the setting to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}

        {/* Additional info */}
        {permission === 'granted' && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ You will receive notifications when mentioned in chat
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
