#!/bin/bash

# Test generate-phase1 edge function directly
source .env

# Get a valid auth token (you'll need to replace this with your actual token)
# You can get it from your browser's developer tools after logging in
# Look for the Authorization header in any API request

# For now, let's use the anon key (won't work for authenticated endpoints)
# You need to get a real JWT token from your browser

echo "Testing generate-phase1 edge function..."
echo ""
echo "You need to get an auth token from your browser:"
echo "1. Open DevTools (F12)"
echo "2. Go to Network tab"
echo "3. Make any API request in the app"
echo "4. Look for 'Authorization: Bearer eyJhbG...' header"
echo "5. Copy the token (everything after 'Bearer ')"
echo ""
read -p "Paste your auth token here: " AUTH_TOKEN

# Create a test campaign seed first
SEED_ID="test-seed-$(date +%s)"

echo ""
echo "Request body:"
cat << EOF
{
  "seedId": "$SEED_ID",
  "type": "initial"
}
EOF

echo ""
echo "Calling edge function..."
curl -v "https://shgmmhniyaxpfrvdicim.supabase.co/functions/v1/generate-phase1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -d "{
    \"seedId\": \"42e8d689-f835-4719-9c59-a21f350db29f\",
    \"type\": \"initial\"
  }"
