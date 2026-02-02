# Scripts

## Deploy Chat Features

Deploy chat enhancements including date dividers and automatic message cleanup.

### Usage

**Windows (PowerShell):**
```powershell
.\scripts\deploy-chat-features.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy-chat-features.sh
./scripts/deploy-chat-features.sh
```

### What it does

1. Deploys database migration for message cleanup function
2. Deploys Edge Function for scheduled cleanup
3. Provides setup instructions for GitHub Actions
4. Shows testing commands

### Post-deployment

After running the script:
1. Add GitHub Actions secrets (see output instructions)
2. Test the cleanup function manually
3. Monitor scheduled runs in GitHub Actions

See [CHAT_FEATURES.md](../docs/CHAT_FEATURES.md) for complete documentation.

---

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
