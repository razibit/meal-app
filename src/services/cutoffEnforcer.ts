import { supabase } from './supabase';
import { MealPeriod } from '../utils/cutoffChecker';

interface CutoffValidationResponse {
  success: boolean;
  error?: string;
  cutoffPassed?: boolean;
}

/**
 * Validate meal action against server-side cutoff enforcement
 */
export async function validateMealAction(
  action: 'add' | 'remove',
  memberId: string,
  mealDate: string,
  period: MealPeriod
): Promise<CutoffValidationResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('cutoff-enforcer', {
      body: {
        action,
        memberId,
        mealDate,
        period,
      },
    });

    if (error) {
      throw error;
    }

    return data as CutoffValidationResponse;
  } catch (error) {
    console.error('Error validating meal action:', error);

    // Make CORS / Edge Function connectivity failures obvious.
    // These should not be treated as a cutoff violation.
    const err = error as { name?: string; message?: string };
    const message = typeof err?.message === 'string' ? err.message : '';
    const isFunctionsFetchError = err?.name === 'FunctionsFetchError' || message.includes('Failed to send a request');

    return {
      success: false,
      error: isFunctionsFetchError
        ? 'Cutoff validation service unreachable (Edge Function/CORS). Deploy the function and allow browser preflight.'
        : (error instanceof Error ? error.message : 'Failed to validate action'),
    };
  }
}
