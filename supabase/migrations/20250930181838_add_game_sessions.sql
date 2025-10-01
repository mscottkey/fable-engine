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

CREATE INDEX idx_game_sessions_game_id ON public.game_sessions(game_id);
CREATE INDEX idx_game_sessions_status ON public.game_sessions(game_id, status);

-- RLS Policies
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_read_members" ON public.game_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = game_sessions.game_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "sessions_write_host" ON public.game_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m
      WHERE m.game_id = game_sessions.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('host', 'cohost')
    )
  );
