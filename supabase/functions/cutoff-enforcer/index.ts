import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Cutoff times in UTC+6 (configurable via environment variables)
const MORNING_CUTOFF_HOUR = parseInt(Deno.env.get('MORNING_CUTOFF_HOUR') || '8', 10);
const NIGHT_CUTOFF_HOUR = parseInt(Deno.env.get('NIGHT_CUTOFF_HOUR') || '16', 10);
const TIMEZONE_OFFSET = 6 * 60; // UTC+6 in minutes

type MealPeriod = 'morning' | 'night';

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
  return period === 'morning'
    ? currentHour >= MORNING_CUTOFF_HOUR
    : currentHour >= NIGHT_CUTOFF_HOUR;
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
      const cutoffTime = period === 'morning' ? '8:00 AM' : '4:00 PM';

      // Only post a violation when the user attempts to change *today's* meal.
      // Future dates are allowed and should not generate violations.
      const todayStr = formatDate(getCurrentTimeInTimezone());
      const shouldPostViolation = mealDate === todayStr;
      
      // Post violation message to chat
      if (shouldPostViolation) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Get member name
        const { data: member } = await supabase
          .from('members')
          .select('name')
          .eq('id', memberId)
          .single();

        if (member) {
          const violationMessage = `${member.name} has ${action === 'add' ? 'added' : 'removed'} their ${period} meal after ${cutoffTime}`;
          
          await supabase.from('chats').insert({
            sender_id: memberId,
            message: violationMessage,
            is_violation: true,
          });
        }
      }

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
