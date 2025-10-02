-- Make story_overview_id nullable in character_lineups since story data lives in campaign_seeds
ALTER TABLE public.character_lineups
ALTER COLUMN story_overview_id DROP NOT NULL;
