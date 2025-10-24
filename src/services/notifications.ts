/**
 * Web Push Notifications Service
 * Handles browser notification permissions and push subscriptions
 */

import { supabase } from './supabase';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if notifications are supported in the browser
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Show a test notification
 */
export async function showTestNotification(): Promise<void> {
  if (getNotificationPermission() !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Mess Meal Management', {
      body: 'Notifications are enabled! You will receive alerts when mentioned in chat.',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'test-notification',
    });
  } catch (error) {
    console.error('Error showing test notification:', error);
    throw error;
  }
}

/**
 * Convert base64 URL-safe string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.error('Push notifications not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        return false;
      }

      // Subscribe to push manager
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    // Save subscription to database
    const subscriptionData = {
      member_id: userId,
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth'))
    };

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Error saving push subscription:', error);
      return false;
    }

    console.log('Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      
      // Delete subscription from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('member_id', userId);

      if (error) {
        console.error('Error deleting push subscription:', error);
        return false;
      }

      console.log('Successfully unsubscribed from push notifications');
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}
