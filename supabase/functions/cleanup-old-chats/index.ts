// @ts-ignore - Deno imports work in Supabase Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore - Deno imports work in Supabase Edge Functions runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key (bypass RLS)
    // @ts-ignore - Deno global available in Supabase Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-ignore - Deno global available in Supabase Edge Functions
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the database function to delete old messages
    const { data, error } = await supabase.rpc('delete_old_chat_messages')

    if (error) {
      console.error('Error deleting old chat messages:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const deletedCount = data || 0
    console.log(`Successfully deleted ${deletedCount} old chat messages`)

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} messages older than 30 days`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
