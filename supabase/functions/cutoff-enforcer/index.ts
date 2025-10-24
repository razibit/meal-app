import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Cutoff times in UTC+6
const MORNING_CUTOFF_HOUR = 7; // 7:00 AM
const NIGHT_CUTOFF_HOUR = 18; // 6:00 PM
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

/**
 * Check if cutoff time has passed for a given period
 */
function isCutoffPassed(period: MealPeriod): boolean {
  const now = getCurrentTimeInTimezone();
  const currentHour = now.getHours();

  if (period === 'morning') {
    return currentHour >= MORNING_CUTOFF_HOUR;
  } else {
    return currentHour >= NIGHT_CUTOFF_HOUR;
  }
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
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if cutoff has passed
    const cutoffPassed = isCutoffPassed(period);
    
    if (cutoffPassed) {
      const cutoffTime = period === 'morning' ? '7:00 AM' : '6:00 PM';
      
      // Post violation message to chat
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

      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot ${action} ${period} meal after ${cutoffTime}`,
          cutoffPassed: true,
        } as ResponseBody),
        {
          status: 403,
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
