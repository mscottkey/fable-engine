#!/bin/bash
# Setup script for local Supabase development

set -e

export PATH="$HOME/.local/bin:$PATH"

echo "=== Supabase Local Development Setup ==="
echo ""
echo "Step 1: Make sure you have SUPABASE_ACCESS_TOKEN set"
echo "Get it from: https://supabase.com/dashboard/account/tokens"
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is not set"
  echo "Run: export SUPABASE_ACCESS_TOKEN=<your-token>"
  exit 1
fi

echo "✓ Access token is set"
echo ""

echo "Step 2: Linking to project shgmmhniyaxpfrvdicim"
echo "You'll need your database password from:"
echo "https://supabase.com/dashboard/project/shgmmhniyaxpfrvdicim/settings/database"
echo ""
supabase link --project-ref shgmmhniyaxpfrvdicim

echo ""
echo "Step 3: Pushing database migrations"
supabase db push

echo ""
echo "Step 4: Deploying edge functions"
echo "NOTE: Edge functions will deploy but won't work without LOVABLE_API_KEY"
echo "Set it later in Lovable dashboard for production"
echo ""
supabase functions deploy

echo ""
echo "✓ Setup complete!"
echo ""
echo "Your local dev environment now points to:"
echo "- URL: https://shgmmhniyaxpfrvdicim.supabase.co"
echo "- All migrations applied"
echo "- Edge functions deployed (but need API key to function)"
echo ""
echo "To test the build worked, check:"
echo "supabase functions list"
echo ""
echo "Start dev server: npm run dev"
