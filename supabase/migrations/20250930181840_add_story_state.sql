-- Story State table for persistent world state
CREATE TABLE IF NOT EXISTS public.story_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,

  -- Story progression
  current_act text NOT NULL DEFAULT 'Act 1',
  act_progress text, -- 'beginning'|'middle'|'climax'|'resolution'

  -- Hook tracking
  completed_hooks text[], -- Hook titles that are resolved
  active_hooks jsonb, -- [{title, status, progress_notes}]
  emerging_hooks jsonb, -- New hooks created during play

  -- World state
  world_facts jsonb, -- {key: value} established facts
  location_states jsonb, -- {location_name: {status, notes, changes}}
  faction_standings jsonb, -- {faction: {reputation, status, notes}}

  -- Relationships
  npc_states jsonb, -- {npc_name: {status, attitude, notes, last_seen}}
  character_relationships jsonb, -- {char1_char2: {bond_strength, notes}}

  -- Player choices
  major_decisions jsonb, -- [{event_id, decision, timestamp, consequences}]

  -- Meta
  last_updated timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX idx_story_state_game ON public.story_state(game_id);

-- RLS Policies
ALTER TABLE public.story_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "state_read_members" ON public.story_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = story_state.game_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "state_write_host" ON public.story_state
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = story_state.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('host', 'cohost')
    )
  );

-- Initialize story_state when game is created
CREATE OR REPLACE FUNCTION initialize_story_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.story_state (game_id, current_act, active_hooks, world_facts)
  VALUES (
    NEW.id,
    'Act 1',
    '[]'::jsonb,
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_game_created
  AFTER INSERT ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION initialize_story_state();
