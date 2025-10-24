# Testing Cutoff Violation Tracking

This guide explains how to test the post-cutoff violation tracking feature.

## Feature Overview

When a member tries to add or remove a meal after the cutoff time:
1. The Edge Function validates the request
2. If cutoff has passed, it posts a violation message to chat
3. The violation message appears in red in the chat interface
4. The meal operation is rejected with an error

## Testing Steps

### 1. Deploy the Edge Function

```bash
supabase functions deploy cutoff-enforcer
```

### 2. Test Before Cutoff (Should Succeed)

**Morning meal before 7:00 AM:**
- Try to add/remove a morning meal before 7:00 AM
- The operation should succeed
- No violation message should appear in chat

**Night meal before 6:00 PM:**
- Try to add/remove a night meal before 6:00 PM
- The operation should succeed
- No violation message should appear in chat

### 3. Test After Cutoff (Should Create Violation)

**Morning meal after 7:00 AM:**
1. Wait until after 7:00 AM (UTC+6)
2. Try to add or remove a morning meal
3. Expected results:
   - Operation is rejected with error message
   - A red violation message appears in chat
   - Message format: "[Name] has added/removed their morning meal after 7:00 AM"

**Night meal after 6:00 PM:**
1. Wait until after 6:00 PM (UTC+6)
2. Try to add or remove a night meal
3. Expected results:
   - Operation is rejected with error message
   - A red violation message appears in chat
   - Message format: "[Name] has added/removed their night meal after 6:00 PM"

### 4. Verify Violation Message Display

In the Chat tab, violation messages should:
- Have a red background (`bg-error/10`)
- Have a red border (`border-error`)
- Have red text (`text-error`)
- Display the timestamp
- Be visible to all members in real-time

## Manual Testing with Supabase CLI

You can test the Edge Function directly:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/cutoff-enforcer' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "add",
    "memberId": "user-uuid",
    "mealDate": "2025-10-24",
    "period": "morning"
  }'
```

## Troubleshooting

### Violation message not appearing in chat
- Check that the Edge Function has access to `SUPABASE_SERVICE_ROLE_KEY`
- Verify the chat real-time subscription is active
- Check browser console for errors

### Wrong timezone
- The function uses UTC+6 timezone
- Verify your system time is correct
- Check the Edge Function logs for timezone calculations

### Message not displayed in red
- Verify the `is_violation` flag is set to `true` in the database
- Check the ChatMessages component styling
- Ensure Tailwind CSS is properly configured

## Database Verification

Check violation messages in the database:

```sql
SELECT 
  c.id,
  m.name as sender_name,
  c.message,
  c.is_violation,
  c.created_at
FROM chats c
JOIN members m ON m.id = c.sender_id
WHERE c.is_violation = true
ORDER BY c.created_at DESC;
```

## Requirements Verified

- ✓ Requirement 11.1: Server-side cutoff validation
- ✓ Requirement 11.2: Morning meal cutoff at 7:00 AM
- ✓ Requirement 11.3: Night meal cutoff at 6:00 PM
- ✓ Requirement 4.1: Violation messages posted to chat
- ✓ Requirement 4.2: Violation messages formatted correctly
- ✓ Requirement 4.3: Violation messages displayed in red
