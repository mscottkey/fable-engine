-- Fix the security issue with the function search path
CREATE OR REPLACE FUNCTION public.set_user_id_on_story_overview()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
