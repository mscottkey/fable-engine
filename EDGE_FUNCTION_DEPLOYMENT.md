# Edge Function Deployment Status

## Current Issue
CORS errors when calling `generate-phase2` and other new edge functions because **Lovable has not deployed them yet**.

## What Was Done
✅ Created 7 new edge functions:
- `generate-phase1` - Story overview generation
- `generate-phase2` - Character generation
- `generate-phase3` - Factions & clocks
- `generate-phase4` - Story nodes
- `generate-phase5` - Campaign arcs
- `generate-phase6` - Resolutions
- `detect-intent` - Player intent classification

✅ Created shared utilities in `_shared/`:
- `cors.ts` - CORS headers with proper methods
- `prompts.ts` - File-based prompt loading
- `templates.ts` - Handlebars rendering
- `llm.ts` - Server-side LLM calls
- `schemas.ts` - Zod validation
- `logger.ts` - AI usage logging

✅ Updated `supabase/config.toml` to register all functions with `verify_jwt = false`

✅ Updated all client code to call edge functions instead of local flows

✅ Deleted deprecated code (`src/ai/flows/`, `src/ai/llm.ts`, `supabase/functions/ai-gateway/`)

## What Lovable Needs to Deploy

When you **commit and push**, Lovable should:

1. **Deploy the 7 new edge functions** to Supabase
2. **Deploy the `_shared` directory** with all utilities and prompts
3. **Apply the updated `config.toml`** configuration
4. **Set the environment variable**: `LOVABLE_API_KEY` in Supabase edge function secrets

## Environment Variables Required

The edge functions need this secret configured in Supabase:
```
LOVABLE_API_KEY=<your-lovable-api-key>
```

Optional (for AI logging):
```
AI_LOG_SALT=<random-hex-string>
```

## How to Verify Deployment

After deployment, check:
1. ✅ Functions exist: `https://drqbvxrouedaohmwfvdj.supabase.co/functions/v1/generate-phase2`
2. ✅ OPTIONS request returns 200 OK with CORS headers
3. ✅ POST request with Authorization header works

## Test Edge Function Manually

```bash
# Test OPTIONS (CORS preflight)
curl -X OPTIONS https://drqbvxrouedaohmwfvdj.supabase.co/functions/v1/generate-phase2 \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -v

# Should return 200 OK with CORS headers
```

## Fallback: Use Old Functions Temporarily

If deployment is taking time, you can temporarily revert the client calls to use the old functions:
- `generate-story` (was Phase 1)
- `generate-characters` (was Phase 2)

But the new architecture is better and should be deployed ASAP.

## Architecture Benefits

The new edge function architecture provides:
- ✅ **Secure API keys** (server-side only)
- ✅ **Separation of concerns** (prompts separate from logic)
- ✅ **Smaller client bundle** (no AI orchestration code in browser)
- ✅ **Server-side validation** (Zod schemas on edge)
- ✅ **Centralized logging** (all AI calls tracked)
- ✅ **Rate limiting possible** (server-side controls)
