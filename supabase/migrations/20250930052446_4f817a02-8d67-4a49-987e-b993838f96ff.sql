-- Add foreign key constraints to ensure proper relationships between all story generation tables

-- Add foreign key constraints to story_overviews
ALTER TABLE public.story_overviews 
ADD CONSTRAINT fk_story_overviews_seed_id 
FOREIGN KEY (seed_id) REFERENCES public.campaign_seeds(id) ON DELETE CASCADE;

ALTER TABLE public.story_overviews 
ADD CONSTRAINT fk_story_overviews_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints to games
ALTER TABLE public.games 
ADD CONSTRAINT fk_games_seed_id 
FOREIGN KEY (seed_id) REFERENCES public.campaign_seeds(id) ON DELETE CASCADE;

ALTER TABLE public.games 
ADD CONSTRAINT fk_games_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints to game_members
ALTER TABLE public.game_members 
ADD CONSTRAINT fk_game_members_game_id 
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE public.game_members 
ADD CONSTRAINT fk_game_members_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints to party_slots
ALTER TABLE public.party_slots 
ADD CONSTRAINT fk_party_slots_game_id 
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE public.party_slots 
ADD CONSTRAINT fk_party_slots_claimed_by 
FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.party_slots 
ADD CONSTRAINT fk_party_slots_reserved_by 
FOREIGN KEY (reserved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add foreign key constraints to character_seeds
ALTER TABLE public.character_seeds 
ADD CONSTRAINT fk_character_seeds_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.character_seeds 
ADD CONSTRAINT fk_character_seeds_game_id 
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE public.character_seeds 
ADD CONSTRAINT fk_character_seeds_slot_id 
FOREIGN KEY (slot_id) REFERENCES public.party_slots(id) ON DELETE CASCADE;

-- Add foreign key constraints to characters
ALTER TABLE public.characters 
ADD CONSTRAINT fk_characters_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.characters 
ADD CONSTRAINT fk_characters_game_id 
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE public.characters 
ADD CONSTRAINT fk_characters_seed_id 
FOREIGN KEY (seed_id) REFERENCES public.character_seeds(id) ON DELETE CASCADE;

ALTER TABLE public.characters 
ADD CONSTRAINT fk_characters_slot_id 
FOREIGN KEY (slot_id) REFERENCES public.party_slots(id) ON DELETE CASCADE;

-- Add foreign key constraints to character_lineups
ALTER TABLE public.character_lineups 
ADD CONSTRAINT fk_character_lineups_game_id 
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE public.character_lineups 
ADD CONSTRAINT fk_character_lineups_seed_id 
FOREIGN KEY (seed_id) REFERENCES public.campaign_seeds(id) ON DELETE CASCADE;

ALTER TABLE public.character_lineups 
ADD CONSTRAINT fk_character_lineups_story_overview_id 
FOREIGN KEY (story_overview_id) REFERENCES public.story_overviews(id) ON DELETE CASCADE;

-- Add foreign key constraints to ai_events
ALTER TABLE public.ai_events 
ADD CONSTRAINT fk_ai_events_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ai_events 
ADD CONSTRAINT fk_ai_events_game_id 
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;

ALTER TABLE public.ai_events 
ADD CONSTRAINT fk_ai_events_seed_id 
FOREIGN KEY (seed_id) REFERENCES public.campaign_seeds(id) ON DELETE SET NULL;

-- Add foreign key constraints to game_invites
ALTER TABLE public.game_invites 
ADD CONSTRAINT fk_game_invites_game_id 
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

-- Add foreign key constraint to campaign_seeds
ALTER TABLE public.campaign_seeds 
ADD CONSTRAINT fk_campaign_seeds_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;