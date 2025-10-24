# Cutoff Enforcer Edge Function

This Supabase Edge Function enforces meal registration cutoff times on the server side.

## Purpose

Validates meal registration changes (add/remove) against cutoff times to prevent client-side manipulation. When a cutoff violation occurs, it posts a violation message to the chat.

## Cutoff Times (UTC+6)

- **Morning meals**: 7:00 AM
- **Night meals**: 6:00 PM

## Request Format

```json
{
  "action": "add" | "remove",
  "memberId": "uuid",
  "mealDate": "YYYY-MM-DD",
  "period": "morning" | "night"
}
```

## Response Format

### Success (cutoff not passed)
```json
{
  "success": true,
  "cutoffPassed": false
}
```

### Error (cutoff passed)
```json
{
  "success": false,
  "error": "Cannot add morning meal after 7:00 AM",
  "cutoffPassed": true
}
```

## Deployment

Deploy this function using the Supabase CLI:

```bash
supabase functions deploy cutoff-enforcer
```

## Environment Variables Required

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

These are automatically provided by Supabase when deploying Edge Functions.

## Usage

The function is called automatically by the meal store before performing add/remove operations:

```typescript
const validation = await validateMealAction('add', memberId, date, period);
if (!validation.success) {
  throw new Error(validation.error);
}
```
