/**
 * Generate VAPID keys for Web Push notifications
 * Run with: node scripts/generate-vapid-keys.js
 */

import { generateVAPIDKeys } from 'web-push';

const vapidKeys = generateVAPIDKeys();

console.log('\n=== VAPID Keys Generated ===\n');
console.log('Add these to your .env file:\n');
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`\nAdd this to your Supabase Edge Function secrets:\n`);
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n============================\n');
