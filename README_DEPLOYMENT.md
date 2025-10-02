# Development & Deployment Workflow

## Your Current Setup

- **Personal Dev Supabase**: `shgmmhniyaxpfrvdicim` (configured in `.env.local`)
- **Lovable Production Supabase**: `drqbvxrouedaohmwfvdj` (configured in `.env`)
- **Local uses**: `.env.local` (your personal project)
- **Vite build uses**: `.env` (Lovable's project)

## Development Workflow

### 1. Deploy to Your Personal Supabase (Testing)

```bash
# Get token from: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=<your-token>
export PATH="$HOME/.local/bin:$PATH"

# Link and deploy
supabase link --project-ref shgmmhniyaxpfrvdicim
supabase db push
supabase functions deploy

# Check deployment
supabase functions list
```

**What happens:**
- ✅ All 44 migrations applied to your database
- ✅ All 13 edge functions deployed
- ⚠️  Functions will deploy but return errors at runtime (no API key - that's OK!)
- ✅ You've verified everything **builds** correctly

### 2. Test Locally

```bash
npm run dev
```

Your app connects to `https://shgmmhniyaxpfrvdicim.supabase.co`

**Expected behavior:**
- Database queries work ✅
- Edge function calls will fail with "LOVABLE_API_KEY not configured" ⚠️
- That's fine! You're just testing the deployment process

### 3. Push to Lovable (Production)

```bash
git add .
git commit -m "Your changes"
git push
```

**What Lovable does automatically:**
1. Pulls your code
2. Runs migrations on `drqbvxrouedaohmwfvdj`
3. Deploys edge functions
4. Uses **their** LOVABLE_API_KEY (configured in their dashboard)
5. Edge functions work! ✅

## Key Points

1. **You don't need a Lovable API key for local dev**
   - Edge functions will deploy but won't work
   - That's fine - you're just testing the build process

2. **Lovable has the API key configured**
   - When you push to Lovable, functions work there
   - Their Supabase dashboard has `LOVABLE_API_KEY` secret set

3. **Migrations stay in sync**
   - Write migration: `supabase migration new my_feature`
   - Apply locally: `supabase db push`
   - Commit to git: `git add supabase/migrations && git commit`
   - Push: `git push`
   - Lovable auto-applies to production

## Files Modified

- ✅ `.env.local` - Points to your personal Supabase
- ✅ `supabase/config.toml` - Updated project_id
- ✅ TypeScript errors fixed in 5 files
- ✅ Edge functions ready to deploy

## Quick Commands

```bash
# Deploy everything to your dev project
./setup-local-supabase.sh

# Or manually:
export SUPABASE_ACCESS_TOKEN=<token>
supabase link --project-ref shgmmhniyaxpfrvdicim
supabase db push
supabase functions deploy

# Check deployment
supabase functions list

# View logs
supabase functions logs generate-phase2

# Run local dev
npm run dev

# Build for production
npm run build

# Push to Lovable
git push
```

## Troubleshooting

**Edge functions return "LOVABLE_API_KEY not configured"**
- Expected! You don't have the key locally
- They'll work when deployed to Lovable

**"Migration already applied"**
- Good! Means your DB is in sync

**CORS errors**
- Check `supabase/config.toml` has `verify_jwt = false`
- Restart dev server after changes

**Can't authenticate**
- Your project uses email/password auth
- Create account in app or via Supabase dashboard
