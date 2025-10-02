# Quick Deployment Guide

## Prerequisites
1. Get Supabase access token: https://supabase.com/dashboard/account/tokens
2. Get your database password: https://supabase.com/dashboard/project/shgmmhniyaxpfrvdicim/settings/database

## Deploy Everything

```bash
# 1. Set access token
export SUPABASE_ACCESS_TOKEN=<paste-token-here>
export PATH="$HOME/.local/bin:$PATH"

# 2. Link to your project
supabase link --project-ref shgmmhniyaxpfrvdicim
# Enter your DB password when prompted

# 3. Apply all migrations (44 files)
supabase db push

# 4. Deploy all edge functions
supabase functions deploy

# 5. Verify deployment
supabase functions list
```

## What Gets Deployed

**Database:**
- All 44 migrations from `supabase/migrations/`
- Tables: profiles, campaign_seeds, games, characters, factions, story_nodes, campaign_arcs, resolutions, etc.
- RLS policies
- Triggers and functions

**Edge Functions:**
- generate-phase1 (story overview)
- generate-phase2 (characters)
- generate-phase3 (factions)
- generate-phase4 (story nodes)
- generate-phase5 (campaign arcs)
- generate-phase6 (resolutions)
- detect-intent (player intent)
- ip-sanitizer (content safety)
- narrate-turn (gameplay)
- generate-recap (session recap)
- generate-opening (campaign opening)
- generate-story (legacy)
- generate-characters (legacy)

## Testing

After deployment, your app running `npm run dev` will use:
- Database: `https://shgmmhniyaxpfrvdicim.supabase.co`
- Edge functions: `https://shgmmhniyaxpfrvdicim.supabase.co/functions/v1/`

The edge functions will deploy successfully but won't work until you set API keys (that's fine for testing deployment).

## Then Push to Lovable

Once you verify everything builds and deploys:

```bash
git add .
git commit -m "Fixed TypeScript errors and edge function structure"
git push
```

Lovable will automatically:
1. Deploy to their Supabase instance
2. Apply migrations
3. Deploy edge functions
4. Use their own LOVABLE_API_KEY

## Troubleshooting

**"Project not found"**
- Check you're logged in: `supabase login --token $SUPABASE_ACCESS_TOKEN`

**"Migration already applied"**
- That's fine! It means migrations are in sync

**Edge function deployment fails**
- Check logs: `supabase functions logs <function-name>`
- Verify imports work: Edge functions use Deno, not Node.js

**Check specific function**
```bash
supabase functions logs generate-phase2 --follow
```
