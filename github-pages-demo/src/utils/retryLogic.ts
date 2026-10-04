/**
 * Retry logic with exponential backoff for critical operations
 */

import { NetworkError, DatabaseError } from './errorHandling';

/**
 * Configuration options for retry logic
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  shouldRetry: (error: unknown) => {
    // Retry on network errors and database errors
    if (error instanceof NetworkError || error instanceof DatabaseError) {
      return true;
    }
    
    // Retry on specific error messages
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('fetch') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')
      );
    }
    
    return false;
  },
  onRetry: () => {}, // No-op by default
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Add jitter (random value between 0 and 20% of delay)
  const jitter = exponentialDelay * 0.2 * Math.random();
  
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error if all retries fail
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}:`, error);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Try to execute the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const shouldRetry = config.shouldRetry(error);
      const hasRetriesLeft = attempt < config.maxRetries;
      
      if (!shouldRetry || !hasRetriesLeft) {
        // Don't retry, throw the error
        throw error;
      }
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay);
      
      // Call onRetry callback
      config.onRetry(attempt + 1, error);
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Wrapper for database operations with retry logic
 * 
 * @example
 * ```typescript
 * const data = await retryDatabaseOperation(async () => {
 *   const { data, error } = await supabase
 *     .from('meals')
 *     .select('*');
 *   
 *   if (error) throw new DatabaseError(error.message);
 *   return data;
 * });
 * ```
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      // Retry on database errors but not on validation errors
      if (error instanceof DatabaseError) {
        return true;
      }
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        // Don't retry on permission or validation errors
        if (
          message.includes('permission') ||
          message.includes('rls') ||
          message.includes('duplicate') ||
          message.includes('foreign key') ||
          message.includes('check constraint')
        ) {
          return false;
        }
        
        // Retry on connection/timeout errors
        return (
          message.includes('timeout') ||
          message.includes('connection') ||
          message.includes('network')
        );
      }
      
      return false;
    },
    ...options,
  });
}

/**
 * Wrapper for network operations with retry logic
 * 
 * @example
 * ```typescript
 * const response = await retryNetworkOperation(async () => {
 *   const res = await fetch('/api/endpoint');
 *   if (!res.ok) throw new NetworkError(`HTTP ${res.status}`);
 *   return res.json();
 * });
 * ```
 */
export async function retryNetworkOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      if (error instanceof NetworkError) {
        return true;
      }
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('fetch') ||
          message.includes('connection')
        );
      }
      
      return false;
    },
    ...options,
  });
}

/**
 * Create a retryable version of an async function
 * 
 * @example
 * ```typescript
 * const fetchDataWithRetry = createRetryableFunction(
 *   async (id: string) => {
 *     const { data, error } = await supabase
 *       .from('meals')
 *       .select('*')
 *       .eq('id', id)
 *       .single();
 *     
 *     if (error) throw new DatabaseError(error.message);
 *     return data;
 *   },
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * 
 * const meal = await fetchDataWithRetry('meal-id');
 * ```
 */
export function createRetryableFunction<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    return retryWithBackoff(() => fn(...args), options);
  };
}
