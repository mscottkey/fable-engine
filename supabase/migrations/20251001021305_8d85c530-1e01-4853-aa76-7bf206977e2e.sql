-- Game Sessions table for tracking individual play sessions
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  session_number int NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  current_scene text,
  active_players jsonb, -- array of user_ids currently in session
  status text NOT NULL DEFAULT 'active', -- 'active'|'paused'|'completed'
  session_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON public.game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(game_id, status);

-- RLS Policies
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_read_members" ON public.game_sessions;
CREATE POLICY "sessions_read_members" ON public.game_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = game_sessions.game_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sessions_write_host" ON public.game_sessions;
CREATE POLICY "sessions_write_host" ON public.game_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = game_sessions.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('host', 'cohost')
    )
  );

-- Narrative Events table for tracking every story beat
CREATE TABLE IF NOT EXISTS public.narrative_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  event_number int NOT NULL, -- sequential within session
  timestamp timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL, -- 'narration'|'player_action'|'decision'|'consequence'|'combat'|'rest'

  -- Core content
  narration text, -- AI-generated narrative
  player_action text, -- What player(s) did
  character_id uuid REFERENCES public.characters(id), -- Which PC acted

  -- Branching data
  decision_prompt text,
  available_options jsonb, -- [{label, description, consequences}]
  chosen_option int,

  -- Consequences & state changes
  consequences jsonb, -- [{description, type, affected_entities}]
  affected_characters uuid[], -- Character IDs affected
  affected_locations text[], -- Location names affected
  world_changes jsonb, -- {key: value} changes to world state

  -- Metadata
  dice_rolls jsonb, -- [{character, skill, result, outcome}]
  mechanical_results jsonb, -- stress dealt, aspects created, etc.
  gm_notes text, -- Hidden notes for AI continuity

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_narrative_events_session ON public.narrative_events(session_id, event_number);
CREATE INDEX IF NOT EXISTS idx_narrative_events_game ON public.narrative_events(game_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_narrative_events_character ON public.narrative_events(character_id);

-- RLS Policies
ALTER TABLE public.narrative_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_read_members" ON public.narrative_events;
CREATE POLICY "events_read_members" ON public.narrative_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = narrative_events.game_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "events_write_host" ON public.narrative_events;
CREATE POLICY "events_write_host" ON public.narrative_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = narrative_events.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('host', 'cohost')
    )
  );

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_state_game ON public.story_state(game_id);

-- RLS Policies
ALTER TABLE public.story_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "state_read_members" ON public.story_state;
CREATE POLICY "state_read_members" ON public.story_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = story_state.game_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "state_write_host" ON public.story_state;
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

DROP TRIGGER IF EXISTS on_game_created ON public.games;
CREATE TRIGGER on_game_created
  AFTER INSERT ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION initialize_story_state();
