#!/bin/bash

# Test storage access with service role key
source .env

echo "Testing storage access..."
echo "URL: https://shgmmhniyaxpfrvdicim.supabase.co/storage/v1/object/prompts/phase1-story/system.v1.md"
echo ""

curl -s "https://shgmmhniyaxpfrvdicim.supabase.co/storage/v1/object/prompts/phase1-story/system.v1.md" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" | head -20
