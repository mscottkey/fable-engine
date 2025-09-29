-- Add columns for custom prompt support
ALTER TABLE public.campaign_seeds 
ADD COLUMN source_type text DEFAULT 'curated_scenario',
ADD COLUMN user_prompt text,
ADD COLUMN constraints jsonb;