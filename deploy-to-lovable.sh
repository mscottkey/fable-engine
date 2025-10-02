#!/bin/bash
# Deploy edge functions to Lovable's production Supabase

set -e

export PATH="$HOME/.local/bin:$PATH"

echo "=== Deploying Edge Functions to Lovable Production ==="
echo ""
echo "Project: drqbvxrouedaohmwfvdj (Lovable)"
echo ""

# Check for access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is not set"
  echo "Get it from: https://supabase.com/dashboard/account/tokens"
  echo "Run: export SUPABASE_ACCESS_TOKEN=<your-token>"
  exit 1
fi

# Link to Lovable's project
echo "Step 1: Linking to Lovable's Supabase project..."
supabase link --project-ref drqbvxrouedaohmwfvdj

echo ""
echo "Step 2: Deploying all edge functions..."
supabase functions deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your edge functions are now deployed to:"
echo "https://drqbvxrouedaohmwfvdj.supabase.co/functions/v1/"
echo ""
echo "Test with:"
echo "curl -X OPTIONS https://drqbvxrouedaohmwfvdj.supabase.co/functions/v1/generate-phase2 -v"
