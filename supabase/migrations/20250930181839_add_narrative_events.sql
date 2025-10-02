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
