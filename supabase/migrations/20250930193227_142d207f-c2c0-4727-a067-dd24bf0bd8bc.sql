-- Add game_id column to story_overviews table
ALTER TABLE public.story_overviews
ADD COLUMN game_id UUID REFERENCES public.games(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_story_overviews_game_id ON public.story_overviews(game_id);

-- Update RLS policies to allow access via game membership
DROP POLICY IF EXISTS "Users can view their own story overviews" ON public.story_overviews;
DROP POLICY IF EXISTS "Users can update their own story overviews" ON public.story_overviews;
DROP POLICY IF EXISTS "Users can delete their own story overviews" ON public.story_overviews;
DROP POLICY IF EXISTS "Users can create their own story overviews" ON public.story_overviews;

-- New policies: access via game membership OR user_id
CREATE POLICY "story_overviews_select_by_game_or_user"
ON public.story_overviews
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.game_members
    WHERE game_members.game_id = story_overviews.game_id
    AND game_members.user_id = auth.uid()
  )
);

CREATE POLICY "story_overviews_insert_own"
ON public.story_overviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "story_overviews_update_own_or_game_host"
ON public.story_overviews
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.game_members
    WHERE game_members.game_id = story_overviews.game_id
    AND game_members.user_id = auth.uid()
    AND game_members.role IN ('host', 'cohost')
  )
);

CREATE POLICY "story_overviews_delete_own"
ON public.story_overviews
FOR DELETE
USING (auth.uid() = user_id);