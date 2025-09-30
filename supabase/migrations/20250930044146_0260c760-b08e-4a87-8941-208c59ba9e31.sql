-- Extend profiles table with user preference defaults
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_timezone TEXT,
ADD COLUMN IF NOT EXISTS default_complexity TEXT,
ADD COLUMN IF NOT EXISTS default_mechanics_comfort TEXT,
ADD COLUMN IF NOT EXISTS default_violence_comfort TEXT,
ADD COLUMN IF NOT EXISTS default_archetype_prefs JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS default_role_tags_interest JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_tone_comfort JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS default_must_have JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_no_thanks JSONB DEFAULT '[]';

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, default_pronouns)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    ''
  );
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;