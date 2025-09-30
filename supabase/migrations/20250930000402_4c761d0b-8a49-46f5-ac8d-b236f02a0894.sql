-- Create story_overviews table for persisting approved story overviews
CREATE TABLE public.story_overviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seed_id UUID NOT NULL,
  name TEXT NOT NULL,
  expanded_setting TEXT NOT NULL,
  notable_locations JSONB NOT NULL DEFAULT '[]',
  tone_manifesto JSONB NOT NULL DEFAULT '{}',
  story_hooks JSONB NOT NULL DEFAULT '[]',
  core_conflict TEXT NOT NULL,
  session_zero JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.story_overviews ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own story overviews" 
ON public.story_overviews 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own story overviews" 
ON public.story_overviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own story overviews" 
ON public.story_overviews 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own story overviews" 
ON public.story_overviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_story_overviews_updated_at
BEFORE UPDATE ON public.story_overviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();