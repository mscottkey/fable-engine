-- Clean up duplicate foreign key constraints and establish best practices

-- Drop the manually added constraint (keep the auto-generated one)
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS fk_games_seed_id;

-- Check for other duplicates and clean them up
-- Drop other manually added constraints that might conflict
ALTER TABLE public.story_overviews DROP CONSTRAINT IF EXISTS fk_story_overviews_seed_id;
ALTER TABLE public.story_overviews DROP CONSTRAINT IF EXISTS fk_story_overviews_user_id;
ALTER TABLE public.game_members DROP CONSTRAINT IF EXISTS fk_game_members_game_id;
ALTER TABLE public.game_members DROP CONSTRAINT IF EXISTS fk_game_members_user_id;
ALTER TABLE public.party_slots DROP CONSTRAINT IF EXISTS fk_party_slots_game_id;
ALTER TABLE public.party_slots DROP CONSTRAINT IF EXISTS fk_party_slots_claimed_by;
ALTER TABLE public.party_slots DROP CONSTRAINT IF EXISTS fk_party_slots_reserved_by;
ALTER TABLE public.character_seeds DROP CONSTRAINT IF EXISTS fk_character_seeds_user_id;
ALTER TABLE public.character_seeds DROP CONSTRAINT IF EXISTS fk_character_seeds_game_id;
ALTER TABLE public.character_seeds DROP CONSTRAINT IF EXISTS fk_character_seeds_slot_id;
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS fk_characters_user_id;
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS fk_characters_game_id;
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS fk_characters_seed_id;
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS fk_characters_slot_id;
ALTER TABLE public.character_lineups DROP CONSTRAINT IF EXISTS fk_character_lineups_game_id;
ALTER TABLE public.character_lineups DROP CONSTRAINT IF EXISTS fk_character_lineups_seed_id;
ALTER TABLE public.character_lineups DROP CONSTRAINT IF EXISTS fk_character_lineups_story_overview_id;
ALTER TABLE public.ai_events DROP CONSTRAINT IF EXISTS fk_ai_events_user_id;
ALTER TABLE public.ai_events DROP CONSTRAINT IF EXISTS fk_ai_events_game_id;
ALTER TABLE public.ai_events DROP CONSTRAINT IF EXISTS fk_ai_events_seed_id;
ALTER TABLE public.game_invites DROP CONSTRAINT IF EXISTS fk_game_invites_game_id;
ALTER TABLE public.campaign_seeds DROP CONSTRAINT IF EXISTS fk_campaign_seeds_user_id;
