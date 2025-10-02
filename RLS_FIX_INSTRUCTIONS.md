# RLS Infinite Recursion Fix Instructions

## Problem Summary
The database has infinite recursion errors when querying the `games` table. This is caused by:

1. **Multiple conflicting RLS policies** on the `games` table from various migrations
2. **SECURITY DEFINER functions** that query the `games` table, triggering RLS checks that create circular dependencies
3. **Trigger functions** calling `auth.uid()` which can cause issues during row-level security evaluation

## Solution
Apply these migrations in order through your Supabase SQL Editor:

### Step 1: Apply comprehensive RLS fix
Run the SQL in: `supabase/migrations/20251002000001_comprehensive_rls_fix.sql`

This migration:
- Drops ALL existing games policies (clean slate)
- Fixes `can_transition_game_state()` function to properly bypass RLS
- Fixes trigger function to remove problematic `auth.uid()` call
- Creates 5 simple, non-recursive policies for games table

### Step 2: Apply RLS audit
Run the SQL in: `supabase/migrations/20251002000002_rls_audit_and_fix.sql`

This migration:
- Ensures all tables have appropriate RLS policies
- Adds missing policies for `ai_events`, `model_pricing`, `story_overviews`, `character_seeds`
- Handles `campaigns` and `campaign_seeds` tables if they exist

## Verification
After applying, test that:
1. You can query games: `SELECT * FROM games WHERE user_id = auth.uid()`
2. No infinite recursion errors in browser console
3. Dashboard loads properly

## RLS Policy Summary

All database tables now have RLS enabled with these access patterns:

### Owner-based access
- `profiles`: Users can only access their own profile
- `campaign_seeds`: Users can only access seeds they created
- `games`: Users can access games they own OR are members of
- `character_seeds`: Users can only access their own seeds

### Game-member based access (requires membership in game_members OR being the game owner)
- `game_invites`
- `party_slots`
- `characters`
- `character_lineups`
- `story_overviews`
- `factions`
- `story_nodes`
- `campaign_arcs`
- `resolutions`
- `game_sessions`
- `narrative_events`
- `story_state`
- `generation_jobs`

### Public read access (authenticated users only)
- `ai_events`
- `model_pricing`

## Key Rules for Future Migrations

1. **Never create SECURITY DEFINER functions that query the same table they're used in RLS policies for**
2. **Keep RLS policies simple** - only query related tables (like `game_members`), never the table being protected
3. **Don't call `auth.uid()` in triggers** - set values at the application layer instead
4. **Always test RLS changes locally** before deploying to production
