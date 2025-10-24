import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import web-push for Deno
// Note: Using npm: specifier for Deno to import from npm
import webpush from 'npm:web-push@3.6.6';

interface RequestBody {
  chatId: string;
  mentionedUserIds: string[];
  message: string;
  senderName: string;
}

interface PushSubscription {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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
    const { mentionedUserIds, message, senderName }: RequestBody = await req.json();

    // Validate input
    if (!mentionedUserIds || !Array.isArray(mentionedUserIds) || mentionedUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get push subscriptions for mentioned users
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('member_id', mentionedUserIds);

    if (fetchError) {
      console.error('Error fetching push subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch subscriptions' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active subscriptions found' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Configure VAPID details
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@messmeal.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'VAPID keys not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Truncate message for notification
    const truncatedMessage = message.length > 100 ? message.substring(0, 97) + '...' : message;

    // Send notifications to all subscriptions
    const notificationPromises = subscriptions.map(async (sub: PushSubscription) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = JSON.stringify({
        title: `${senderName} mentioned you`,
        body: truncatedMessage,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        url: '/chat',
        tag: 'chat-mention',
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        console.log(`Notification sent to user ${sub.member_id}`);
        return { success: true, memberId: sub.member_id };
      } catch (error: any) {
        console.error(`Error sending notification to user ${sub.member_id}:`, error);

        // Remove invalid subscription (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing invalid subscription for user ${sub.member_id}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }

        return { success: false, memberId: sub.member_id, error: error.message };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} notifications, ${failureCount} failed`,
        results,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
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
