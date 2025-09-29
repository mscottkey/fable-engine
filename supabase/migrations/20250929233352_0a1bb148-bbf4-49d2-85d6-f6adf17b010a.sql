-- Add columns for IP sanitization tracking
ALTER TABLE public.campaign_seeds 
ADD COLUMN original_user_prompt text,
ADD COLUMN sanitized_user_prompt text,
ADD COLUMN sanitization_report jsonb;