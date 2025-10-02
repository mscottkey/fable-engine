# Local Development with Personal Supabase Project

## Project IDs

- **Production (Lovable)**: `drqbvxrouedaohmwfvdj` (in config.toml)
- **Your Test Project**: `shgmmhniyaxpfrvdicim` (for local testing)

**Important**: The `config.toml` file now points to Lovable's production project. When you link to your test project locally, it creates a `.supabase/` directory (gitignored) that overrides this for local operations.

## Quick Setup

### Option 1: Automated Script

```bash
# 1. Get access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=<your-token>

# 2. Run the setup script
./setup-local-supabase.sh
```

### Option 2: Manual Setup

**1. Get Access Token**
```bash
# Go to: https://supabase.com/dashboard/account/tokens
# Create a new token, then:
export SUPABASE_ACCESS_TOKEN=<your-token>
export PATH="$HOME/.local/bin:$PATH"
```

**2. Link to Your Test Project**
```bash
supabase link --project-ref shgmmhniyaxpfrvdicim
```
This creates a `.supabase/` directory (gitignored) that stores your local project link, overriding the production project ID in `config.toml`.

You'll be prompted for your database password. Get it from:
https://supabase.com/dashboard/project/shgmmhniyaxpfrvdicim/settings/database

**Note**: The committed `config.toml` points to Lovable's production project (`drqbvxrouedaohmwfvdj`). Your local link to the test project persists in `.supabase/` and won't be committed to git.

**3. Apply All Migrations**
```bash
supabase db push
```

This will run all migrations in `supabase/migrations/` against your database.

**4. Set Edge Function Secrets**
```bash
# You'll need a Lovable API key for AI calls
supabase secrets set LOVABLE_API_KEY=<your-lovable-api-key>

# Optional: for AI logging
supabase secrets set AI_LOG_SALT=$(openssl rand -hex 32)
```

**5. Deploy Edge Functions**
```bash
# Deploy all at once
supabase functions deploy

# Or deploy individually to test:
supabase functions deploy generate-phase1
supabase functions deploy generate-phase2
# ... etc
```

**6. Verify Deployment**
```bash
# List all functions
supabase functions list

# Test a function
curl -X OPTIONS https://shgmmhniyaxpfrvdicim.supabase.co/functions/v1/generate-phase2 \
  -H "Access-Control-Request-Method: POST" \
  -v
```

## Environment Files

- `.env.local` - Points to your personal Supabase project (for local dev)
- `.env` - Points to Lovable's Supabase project (for production)

Vite will use `.env.local` when running `npm run dev`.

## Running the App

```bash
npm run dev
```

The app will connect to your personal Supabase instance at `https://shgmmhniyaxpfrvdicim.supabase.co`

## Keeping Migrations in Sync

When you add new migrations:

1. Create migration file: `supabase migration new my_feature`
2. Write SQL in the generated file
3. Apply to your dev project: `supabase db push`
4. Commit the migration file to git
5. Lovable will apply it to production automatically

## Troubleshooting

### "Project not linked"
Run: `supabase link --project-ref shgmmhniyaxpfrvdicim`

### Edge functions return 401/403
Check secrets: `supabase secrets list`

### Edge functions return CORS errors
Verify config.toml has `verify_jwt = false` for each function

### "Cannot find module" in edge functions
Make sure `_shared/` directory is being deployed with functions

### Check function logs
```bash
supabase functions logs generate-phase2 --follow
```

## Next Steps

Once everything is deployed:
1. Test character generation flow
2. Test story generation flow
3. Monitor `ai_events` table for AI usage
4. Check function logs for errors
