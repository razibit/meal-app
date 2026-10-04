# Chat Features Deployment Script (PowerShell)
# This script helps set up the automated chat message cleanup feature

$ErrorActionPreference = "Stop"

Write-Host "🚀 Chat Features Deployment Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 1: Deploy database migration
Write-Host "📦 Step 1: Deploying database migration..." -ForegroundColor Cyan
Write-Host "----------------------------------------"
try {
    supabase db push
    Write-Host "✅ Migration deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Deploy Edge Function
Write-Host "📦 Step 2: Deploying Edge Function..." -ForegroundColor Cyan
Write-Host "----------------------------------------"
try {
    supabase functions deploy cleanup-old-chats
    Write-Host "✅ Edge Function deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Edge Function deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: GitHub Actions setup instructions
Write-Host "📦 Step 3: GitHub Actions Setup" -ForegroundColor Cyan
Write-Host "----------------------------------------"
Write-Host "To enable automated cleanup, add these secrets to your GitHub repository:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: Settings → Secrets and variables → Actions → New repository secret"
Write-Host ""
Write-Host "2. Add these secrets:"
Write-Host "   - Name: SUPABASE_PROJECT_REF"
Write-Host "     Value: Your Supabase project reference (from project URL)"
Write-Host ""
Write-Host "   - Name: SUPABASE_SERVICE_ROLE_KEY"
Write-Host "     Value: Your service role key (from Supabase Dashboard → Settings → API)"
Write-Host ""
Write-Host "⚠️  IMPORTANT: Keep your service role key secret!" -ForegroundColor Yellow
Write-Host ""

# Step 4: Test the function
Write-Host "📦 Step 4: Testing the cleanup function" -ForegroundColor Cyan
Write-Host "----------------------------------------"
Write-Host "Testing database function..." -ForegroundColor Yellow
$statusOutput = supabase status | Select-String "API URL"
if ($statusOutput) {
    $apiUrl = $statusOutput -replace ".*API URL: ", ""
    $projectRef = $apiUrl -replace "https://", "" -replace "\.supabase\.co", ""
    Write-Host "Project Reference: $projectRef"
    Write-Host ""
    Write-Host "To manually test the Edge Function, run:"
    Write-Host ""
    Write-Host "curl -X POST ``" -ForegroundColor Gray
    Write-Host "  -H `"Authorization: Bearer YOUR_SERVICE_ROLE_KEY`" ``" -ForegroundColor Gray
    Write-Host "  https://$projectRef.supabase.co/functions/v1/cleanup-old-chats" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "======================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. ✅ Date dividers are now active in the chat UI" -ForegroundColor Green
Write-Host "2. ⏰ Set up GitHub Actions secrets for automated cleanup" -ForegroundColor Yellow
Write-Host "3. 🧪 Test the cleanup function manually (see command above)" -ForegroundColor Yellow
Write-Host "4. 📊 Monitor GitHub Actions for scheduled runs (daily at 2 AM UTC)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Documentation: docs/CHAT_FEATURES.md"
Write-Host ""
