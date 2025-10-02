# Supabase Local Development Setup

## Step 1: Install Supabase CLI

**Linux/WSL:**
```bash
# Download and install Supabase CLI
curl -fsSL https://github.com/supabase/cli/releases/download/v2.48.3/supabase_2.48.3_linux_amd64.deb -o /tmp/supabase.deb
sudo dpkg -i /tmp/supabase.deb
supabase --version
```

**Alternative (using npm):**
```bash
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate with Supabase.

## Step 3: Link to Your Existing Project

Your current project ID is: `drqbvxrouedaohmwfvdj`

```bash
supabase link --project-ref drqbvxrouedaohmwfvdj
```

When prompted, enter your database password (you can find this in the Supabase dashboard).

## Step 4: Set Edge Function Secrets

```bash
# Set the LOVABLE_API_KEY for edge functions
supabase secrets set LOVABLE_API_KEY=<your-lovable-api-key>

# Optional: Set AI logging salt
supabase secrets set AI_LOG_SALT=<random-hex-string>
```

## Step 5: Deploy All Edge Functions

```bash
# Deploy all edge functions at once
supabase functions deploy

# Or deploy individually:
supabase functions deploy generate-phase1
supabase functions deploy generate-phase2
supabase functions deploy generate-phase3
supabase functions deploy generate-phase4
supabase functions deploy generate-phase5
supabase functions deploy generate-phase6
supabase functions deploy detect-intent
supabase functions deploy ip-sanitizer
supabase functions deploy narrate-turn
supabase functions deploy generate-recap
supabase functions deploy generate-opening
```

## Step 6: Verify Deployment

```bash
# List all deployed functions
supabase functions list

# Test a function
curl -X OPTIONS https://drqbvxrouedaohmwfvdj.supabase.co/functions/v1/generate-phase2 \
  -H "Access-Control-Request-Method: POST" \
  -v
```

## Step 7: (Optional) Run Edge Functions Locally

For faster development, you can run edge functions locally:

```bash
# Start local Supabase (requires Docker)
supabase start

# In another terminal, serve functions locally
supabase functions serve --env-file .env.local

# Your functions will be available at:
# http://localhost:54321/functions/v1/<function-name>
```

## Troubleshooting

### Issue: "Project not found"
- Make sure you're logged in: `supabase login`
- Check project ref is correct in config.toml

### Issue: "Database password required"
- Get password from: https://supabase.com/dashboard/project/drqbvxrouedaohmwfvdj/settings/database
- Or reset it in the dashboard

### Issue: Functions still returning CORS errors
- Verify secrets are set: `supabase secrets list`
- Check function logs: `supabase functions logs <function-name>`
- Ensure config.toml has `verify_jwt = false` for each function

## Next Steps

After successful deployment:
1. Test character generation in the app
2. Check function logs for any errors
3. Monitor AI usage in the database (ai_events table)
