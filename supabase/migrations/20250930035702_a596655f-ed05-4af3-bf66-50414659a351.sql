-- Fix RLS policy for story_overviews to automatically set user_id
DROP POLICY "Users can create their own story overviews" ON public.story_overviews;

CREATE POLICY "Users can create their own story overviews" 
ON public.story_overviews 
FOR INSERT 
WITH CHECK (true);

-- Add a trigger to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_user_id_on_story_overview()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_id_story_overview_trigger
  BEFORE INSERT ON public.story_overviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id_on_story_overview();