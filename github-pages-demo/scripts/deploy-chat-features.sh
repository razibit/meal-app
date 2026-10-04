#!/bin/bash

# Chat Features Deployment Script
# This script helps set up the automated chat message cleanup feature

set -e

echo "🚀 Chat Features Deployment Script"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first:${NC}"
    echo "   npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Step 1: Deploy database migration
echo "📦 Step 1: Deploying database migration..."
echo "----------------------------------------"
if supabase db push; then
    echo -e "${GREEN}✅ Migration deployed successfully${NC}"
else
    echo -e "${RED}❌ Migration deployment failed${NC}"
    exit 1
fi
echo ""

# Step 2: Deploy Edge Function
echo "📦 Step 2: Deploying Edge Function..."
echo "----------------------------------------"
if supabase functions deploy cleanup-old-chats; then
    echo -e "${GREEN}✅ Edge Function deployed successfully${NC}"
else
    echo -e "${RED}❌ Edge Function deployment failed${NC}"
    exit 1
fi
echo ""

# Step 3: GitHub Actions setup instructions
echo "📦 Step 3: GitHub Actions Setup"
echo "----------------------------------------"
echo -e "${YELLOW}To enable automated cleanup, add these secrets to your GitHub repository:${NC}"
echo ""
echo "1. Go to: Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "2. Add these secrets:"
echo "   - Name: SUPABASE_PROJECT_REF"
echo "     Value: Your Supabase project reference (from project URL)"
echo ""
echo "   - Name: SUPABASE_SERVICE_ROLE_KEY"
echo "     Value: Your service role key (from Supabase Dashboard → Settings → API)"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Keep your service role key secret!${NC}"
echo ""

# Step 4: Test the function
echo "📦 Step 4: Testing the cleanup function"
echo "----------------------------------------"
echo -e "${YELLOW}Testing database function...${NC}"
SUPABASE_PROJECT_REF=$(supabase status | grep "API URL" | awk '{print $3}' | sed 's|https://||' | sed 's|\.supabase\.co||')
echo "Project Reference: $SUPABASE_PROJECT_REF"
echo ""
echo "To manually test the Edge Function, run:"
echo ""
echo "curl -X POST \\"
echo "  -H \"Authorization: Bearer YOUR_SERVICE_ROLE_KEY\" \\"
echo "  https://$SUPABASE_PROJECT_REF.supabase.co/functions/v1/cleanup-old-chats"
echo ""

# Summary
echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "Next steps:"
echo "1. ✅ Date dividers are now active in the chat UI"
echo "2. ⏰ Set up GitHub Actions secrets for automated cleanup"
echo "3. 🧪 Test the cleanup function manually (see command above)"
echo "4. 📊 Monitor GitHub Actions for scheduled runs (daily at 2 AM UTC)"
echo ""
echo "Documentation: docs/CHAT_FEATURES.md"
echo ""
