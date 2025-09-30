-- Add status tracking to campaign_seeds for story generation
ALTER TABLE public.campaign_seeds 
ADD COLUMN generation_status text DEFAULT 'seed_created'::text;

-- Add story overview data storage for resumption
ALTER TABLE public.campaign_seeds 
ADD COLUMN story_overview_draft jsonb DEFAULT NULL;

-- Add generation attempt tracking
ALTER TABLE public.campaign_seeds 
ADD COLUMN generation_attempts integer DEFAULT 0;

-- Add last generation attempt timestamp
ALTER TABLE public.campaign_seeds 
ADD COLUMN last_generation_at timestamp with time zone DEFAULT NULL;

-- Create index for status queries
CREATE INDEX idx_campaign_seeds_generation_status ON public.campaign_seeds (generation_status);

-- Update existing records to have the default status
UPDATE public.campaign_seeds 
SET generation_status = 'seed_created' 
WHERE generation_status IS NULL;