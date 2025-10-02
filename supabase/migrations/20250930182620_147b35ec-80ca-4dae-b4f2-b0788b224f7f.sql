-- Migration: Fix generation_status to have a proper default

-- Drop the existing constraint
ALTER TABLE public.campaign_seeds 
DROP CONSTRAINT IF EXISTS campaign_seeds_generation_status_check;

-- Set a default value for generation_status
ALTER TABLE public.campaign_seeds 
ALTER COLUMN generation_status SET DEFAULT 'draft';

-- Update any existing NULL values
UPDATE public.campaign_seeds 
SET generation_status = 'draft' 
WHERE generation_status IS NULL;

-- Make the column NOT NULL
ALTER TABLE public.campaign_seeds 
ALTER COLUMN generation_status SET NOT NULL;

-- Re-add the constraint with all valid values
ALTER TABLE public.campaign_seeds 
ADD CONSTRAINT campaign_seeds_generation_status_check 
CHECK (generation_status IN (
  'draft',
  'story_generating',
  'story_generated',
  'story_approved',
  'story_failed',
  'abandoned'
));

-- Add helpful comment
COMMENT ON COLUMN public.campaign_seeds.generation_status IS 
'Tracks the lifecycle of campaign seed: draft → story_generating → story_generated → story_approved';
