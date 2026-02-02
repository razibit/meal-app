# Chat Message Cleanup Edge Function

This edge function deletes chat messages older than 4 days.

## Deployment

```bash
supabase functions deploy cleanup-old-chats
```

## Manual Testing

```bash
curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/cleanup-old-chats' \
  --header 'Authorization: Bearer <anon-key>'
```

## Scheduled Execution

To run this function automatically every day, set up a cron job:

### Option 1: Using Supabase Cron (requires pg_cron extension)

Connect to your database as a superuser and run:

```sql
SELECT cron.schedule(
  'cleanup-old-chats',
  '0 2 * * *',  -- Every day at 2 AM
  $$SELECT net.http_post(
    url:='https://<project-ref>.supabase.co/functions/v1/cleanup-old-chats',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);
```

### Option 2: Using GitHub Actions

Create `.github/workflows/cleanup-chats.yml`:

```yaml
name: Cleanup Old Chat Messages
on:
  schedule:
    - cron: '0 2 * * *'  # Every day at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/cleanup-old-chats
```

### Option 3: Using Vercel Cron (if deployed on Vercel)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cleanup-chats",
    "schedule": "0 2 * * *"
  }]
}
```

Then create `api/cleanup-chats.ts` to call the edge function.
