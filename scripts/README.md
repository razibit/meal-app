# Scripts

## Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push notifications.

### Installation

First, install the web-push package:

```bash
npm install --save-dev web-push
```

### Generate Keys

Run the script to generate VAPID keys:

```bash
node scripts/generate-vapid-keys.js
```

### Configuration

1. **Frontend (.env file)**:
   - Add `VITE_VAPID_PUBLIC_KEY` to your `.env` file

2. **Backend (Supabase Edge Functions)**:
   - Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to your Supabase project secrets
   - Use the Supabase CLI: `supabase secrets set VAPID_PUBLIC_KEY=your_public_key`
   - Or use the Supabase Dashboard: Project Settings > Edge Functions > Secrets

### Alternative: Using web-push CLI

You can also generate keys using the web-push CLI directly:

```bash
npx web-push generate-vapid-keys
```

### Security Notes

- **Never commit VAPID private keys to version control**
- Store private keys securely in environment variables or secrets management
- The public key can be safely included in your frontend code
- Generate new keys for each environment (development, staging, production)
