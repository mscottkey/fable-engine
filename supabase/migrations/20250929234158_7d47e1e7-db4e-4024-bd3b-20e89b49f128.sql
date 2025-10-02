-- Create model_pricing table for AI provider pricing
CREATE TABLE public.model_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_rate DECIMAL(10,6) NOT NULL, -- per 1000 tokens
  output_rate DECIMAL(10,6) NOT NULL, -- per 1000 tokens
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient pricing lookups
CREATE INDEX IF NOT EXISTS idx_model_pricing_lookup ON public.model_pricing (provider, model, effective_from DESC);

-- Create ai_events table for usage logging
CREATE TABLE public.ai_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_id UUID NULL,
  seed_id UUID NULL,
  feature TEXT NOT NULL,
  phase TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  pricing_id UUID NULL REFERENCES public.model_pricing(id),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  prompt_chars INTEGER NOT NULL DEFAULT 0,
  completion_chars INTEGER NOT NULL DEFAULT 0,
  prompt_hash TEXT NOT NULL,
  completion_hash TEXT NOT NULL,
  response_mode TEXT NOT NULL, -- 'json' | 'freeform'
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  retry_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER NULL,
  error_code TEXT NULL,
  status TEXT NOT NULL, -- 'success' | 'error'
  cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;

-- Model pricing policies (read-only for authenticated users)
CREATE POLICY "model_pricing_select_all" 
ON public.model_pricing 
FOR SELECT 
TO authenticated 
USING (true);

-- AI events policies (users can only insert/select their own events)
CREATE POLICY "ai_events_insert_own" 
ON public.ai_events 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_events_select_own" 
ON public.ai_events 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Insert some initial pricing data for current models
INSERT INTO public.model_pricing (provider, model, input_rate, output_rate, effective_from) VALUES
('google', 'gemini-2.5-pro', 0.001250, 0.005000, '2024-01-01'::timestamp),
('google', 'gemini-2.5-flash', 0.000075, 0.000300, '2024-01-01'::timestamp),
('google', 'gemini-2.5-flash-lite', 0.000037, 0.000150, '2024-01-01'::timestamp),
('openai', 'gpt-5', 0.005000, 0.015000, '2024-01-01'::timestamp),
('openai', 'gpt-5-mini', 0.000150, 0.000600, '2024-01-01'::timestamp),
('openai', 'gpt-5-nano', 0.000025, 0.000100, '2024-01-01'::timestamp);
