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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate action',
    };
  }
}
