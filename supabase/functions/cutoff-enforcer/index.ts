import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Cutoff times in UTC+6 (configurable via environment variables)
const BREAKFAST_CUTOFF_HOUR = parseInt(Deno.env.get('BREAKFAST_CUTOFF_HOUR') || '8', 10);
const LUNCH_CUTOFF_HOUR = parseInt(Deno.env.get('LUNCH_CUTOFF_HOUR') || '12', 10);
const DINNER_CUTOFF_HOUR = parseInt(Deno.env.get('DINNER_CUTOFF_HOUR') || '18', 10);
const TIMEZONE_OFFSET = 6 * 60; // UTC+6 in minutes

type MealPeriod = 'breakfast' | 'lunch' | 'dinner';

interface RequestBody {
  action: 'add' | 'remove';
  memberId: string;
  mealDate: string;
  period: MealPeriod;
}

interface ResponseBody {
  success: boolean;
  error?: string;
  cutoffPassed?: boolean;
}

/**
 * Get current time in UTC+6 timezone
 */
function getCurrentTimeInTimezone(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + TIMEZONE_OFFSET * 60000);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if cutoff time has passed for a given period and meal date.
 *
 * Rules:
 * - For future dates, cutoff is never considered passed.
 * - For past dates, cutoff is always considered passed.
 * - For today, compare current hour against cutoff hour.
 */
function isCutoffPassed(period: MealPeriod, mealDate: string): boolean {
  const now = getCurrentTimeInTimezone();
  const todayStr = formatDate(now);

  // mealDate is expected as YYYY-MM-DD
  if (mealDate > todayStr) return false;
  if (mealDate < todayStr) return true;

  const currentHour = now.getHours();
  const cutoffHour = period === 'breakfast'
    ? BREAKFAST_CUTOFF_HOUR
    : period === 'lunch'
      ? LUNCH_CUTOFF_HOUR
      : DINNER_CUTOFF_HOUR;
  return currentHour >= cutoffHour;
}

function getCutoffLabel(period: MealPeriod): string {
  if (period === 'breakfast') return '8:00 AM';
  if (period === 'lunch') return '12:00 PM';
  return '6:00 PM';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { action, memberId, mealDate, period }: RequestBody = await req.json();

    // Validate input
    if (!action || !memberId || !mealDate || !period) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Check if cutoff has passed
    const cutoffPassed = isCutoffPassed(period, mealDate);
    
    if (cutoffPassed) {
      const cutoffTime = getCutoffLabel(period);

      // Only post a violation when the user attempts to change *today's* meal.
      // Future dates are allowed and should not generate violations.
      const todayStr = formatDate(getCurrentTimeInTimezone());
      const shouldPostViolation = mealDate === todayStr;
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot ${action} ${period} meal after ${cutoffTime}`,
          cutoffPassed: true,
        } as ResponseBody),
        {
          // IMPORTANT: return 200 so supabase-js does not throw FunctionsHttpError.
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Cutoff not passed, allow the operation
    return new Response(
      JSON.stringify({
        success: true,
        cutoffPassed: false,
      } as ResponseBody),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in cutoff-enforcer:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as ResponseBody),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
