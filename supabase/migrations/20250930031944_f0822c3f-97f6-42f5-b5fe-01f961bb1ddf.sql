-- Add soft delete support to games table
ALTER TABLE public.games 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance when filtering out deleted games
CREATE INDEX idx_games_deleted_at ON public.games (deleted_at) WHERE deleted_at IS NOT NULL;

-- Add soft delete support to campaign_seeds table as well
ALTER TABLE public.campaign_seeds 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for campaign_seeds
CREATE INDEX idx_campaign_seeds_deleted_at ON public.campaign_seeds (deleted_at) WHERE deleted_at IS NOT NULL;