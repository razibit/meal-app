/**
 * Custom error types for the Mess Meal Management System
 */

/**
 * Error thrown when a meal action is attempted after the cutoff time
 */
export class CutoffError extends Error {
  constructor(period: 'morning' | 'night') {
    const cutoffTime = period === 'morning' ? '7:00 AM' : '6:00 PM';
    super(`Cannot modify ${period} meal after ${cutoffTime} cutoff`);
    this.name = 'CutoffError';
  }
}

/**
 * Error thrown when a network operation fails
 */
export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when authentication fails or user is not authenticated
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'User not authenticated') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when a database operation fails
 */
export class DatabaseError extends Error {
  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Type for error toast options
 */
export interface ErrorToastOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  dismissible?: boolean;
}

/**
 * Handle errors and provide user-friendly messages
 */
export function handleError(error: unknown): string {
  if (error instanceof CutoffError) {
    return error.message;
  }
  
  if (error instanceof NetworkError) {
    return 'Network connection failed. Please check your internet connection.';
  }
  
  if (error instanceof AuthenticationError) {
    // Authentication errors are often actionable (e.g. invalid credentials,
    // user already registered, email not confirmed). Preserve the message.
    return error.message;
  }
  
  if (error instanceof DatabaseError) {
    return 'Failed to save changes. Please try again.';
  }
  
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Handle specific Supabase/PostgreSQL errors
    if (error.message.includes('duplicate key')) {
      return 'This entry already exists.';
    }
    
    if (error.message.includes('foreign key')) {
      return 'Invalid reference. Please refresh and try again.';
    }
    
    if (error.message.includes('not found')) {
      return 'The requested item was not found.';
    }
    
    if (error.message.includes('permission denied') || error.message.includes('RLS')) {
      return 'You do not have permission to perform this action.';
    }
    
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    // Return the original error message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes('Error:')) {
      return error.message;
    }
  }
  
  // Generic fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Toast notification state management
 */
let toastContainer: HTMLDivElement | null = null;
let toastIdCounter = 0;

/**
 * Initialize toast container if it doesn't exist
 */
function initToastContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 400px;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show an error toast notification to the user
 */
export function showErrorToast(
  message: string,
  options: ErrorToastOptions = {}
): void {
  const {
    duration = 5000,
    position = 'top-right',
    dismissible = true,
  } = options;

  const container = initToastContainer();
  const toastId = `toast-${toastIdCounter++}`;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.style.cssText = `
    background-color: #F44336;
    color: white;
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add message
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  messageSpan.style.cssText = 'flex: 1; font-size: 0.875rem;';
  toast.appendChild(messageSpan);
  
  // Add dismiss button if dismissible
  if (dismissible) {
    const dismissButton = document.createElement('button');
    dismissButton.innerHTML = '&times;';
    dismissButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.8;
      transition: opacity 0.2s;
    `;
    dismissButton.onmouseover = () => dismissButton.style.opacity = '1';
    dismissButton.onmouseout = () => dismissButton.style.opacity = '0.8';
    dismissButton.onclick = () => removeToast(toastId);
    toast.appendChild(dismissButton);
  }
  
  // Add animation styles if not already added
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Position container based on options
  updateContainerPosition(container, position);
  
  // Add toast to container
  container.appendChild(toast);
  
  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => removeToast(toastId), duration);
  }
}

/**
 * Update toast container position
 */
function updateContainerPosition(
  container: HTMLDivElement,
  position: string
): void {
  // Reset all position styles
  container.style.top = '';
  container.style.bottom = '';
  container.style.left = '';
  container.style.right = '';
  
  switch (position) {
    case 'top':
      container.style.top = '1rem';
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
      break;
    case 'top-left':
      container.style.top = '1rem';
      container.style.left = '1rem';
      break;
    case 'top-right':
      container.style.top = '1rem';
      container.style.right = '1rem';
      break;
    case 'bottom':
      container.style.bottom = '1rem';
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
      break;
    case 'bottom-left':
      container.style.bottom = '1rem';
      container.style.left = '1rem';
      break;
    case 'bottom-right':
      container.style.bottom = '1rem';
      container.style.right = '1rem';
      break;
    default:
      container.style.top = '1rem';
      container.style.right = '1rem';
  }
}

/**
 * Remove a toast notification
 */
function removeToast(toastId: string): void {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      toast.remove();
      
      // Clean up container if empty
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
        toastContainer = null;
      }
    }, 300);
  }
}

/**
 * Show a success toast notification
 */
export function showSuccessToast(
  message: string,
  options: ErrorToastOptions = {}
): void {
  const {
    duration = 3000,
    position = 'top-right',
    dismissible = true,
  } = options;

  const container = initToastContainer();
  const toastId = `toast-${toastIdCounter++}`;
  
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.style.cssText = `
    background-color: #4CAF50;
    color: white;
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  messageSpan.style.cssText = 'flex: 1; font-size: 0.875rem;';
  toast.appendChild(messageSpan);
  
  if (dismissible) {
    const dismissButton = document.createElement('button');
    dismissButton.innerHTML = '&times;';
    dismissButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.8;
      transition: opacity 0.2s;
    `;
    dismissButton.onmouseover = () => dismissButton.style.opacity = '1';
    dismissButton.onmouseout = () => dismissButton.style.opacity = '0.8';
    dismissButton.onclick = () => removeToast(toastId);
    toast.appendChild(dismissButton);
  }
  
  updateContainerPosition(container, position);
  container.appendChild(toast);
  
  if (duration > 0) {
    setTimeout(() => removeToast(toastId), duration);
  }
}
