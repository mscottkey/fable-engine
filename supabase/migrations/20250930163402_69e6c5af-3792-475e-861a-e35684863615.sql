-- Migration: Production-grade foundation improvements
-- File: supabase/migrations/20250930093000_production_foundation.sql

-- ============================================================================
-- 1. Add idempotency_keys table for preventing duplicate operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text PRIMARY KEY,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_idempotency_expires ON public.idempotency_keys (expires_at);

-- Auto-cleanup expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < now();
END;
$$;

-- ============================================================================
-- 2. Update game status enum to match state machine
-- ============================================================================
DO $$ 
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_status_check;
  
  -- Add new constraint with all valid states
  ALTER TABLE public.games ADD CONSTRAINT games_status_check 
  CHECK (status IN (
    'draft',
    'story_review',
    'lobby',
    'characters',
    'char_review',
    'playing',
    'paused',
    'completed',
    'abandoned'
  ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. Update party_slots status enum
-- ============================================================================
DO $$ 
BEGIN
  ALTER TABLE public.party_slots DROP CONSTRAINT IF EXISTS party_slots_status_check;
  
  ALTER TABLE public.party_slots ADD CONSTRAINT party_slots_status_check 
  CHECK (status IN ('empty', 'reserved', 'ready', 'locked'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. Update characters status enum
-- ============================================================================
DO $$ 
BEGIN
  ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS characters_status_check;
  
  ALTER TABLE public.characters ADD CONSTRAINT characters_status_check 
  CHECK (status IN ('pending', 'generated', 'approved', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. Update campaign_seeds generation_status enum
-- ============================================================================
DO $$ 
BEGIN
  ALTER TABLE public.campaign_seeds DROP CONSTRAINT IF EXISTS campaign_seeds_generation_status_check;
  
  ALTER TABLE public.campaign_seeds ADD CONSTRAINT campaign_seeds_generation_status_check 
  CHECK (generation_status IN (
    'draft',
    'story_generating',
    'story_generated',
    'story_approved',
    'abandoned'
  ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 6. Add audit columns for better tracking
-- ============================================================================
ALTER TABLE public.games 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.party_slots 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz DEFAULT now();

ALTER TABLE public.characters 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz DEFAULT now();

-- ============================================================================
-- 7. Create trigger to update timestamps automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_and_status_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Track status changes
  IF TG_TABLE_NAME = 'games' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_changed_at = now();
    NEW.status_changed_by = auth.uid();
  END IF;
  
  IF TG_TABLE_NAME IN ('party_slots', 'characters') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_changed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers
DROP TRIGGER IF EXISTS games_update_timestamp ON public.games;
CREATE TRIGGER games_update_timestamp
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp_and_status_change();

DROP TRIGGER IF EXISTS party_slots_update_timestamp ON public.party_slots;
CREATE TRIGGER party_slots_update_timestamp
  BEFORE UPDATE ON public.party_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp_and_status_change();

DROP TRIGGER IF EXISTS characters_update_timestamp ON public.characters;
CREATE TRIGGER characters_update_timestamp
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp_and_status_change();

-- ============================================================================
-- 8. Fix foreign key from characters to campaign_seeds (not character_seeds)
-- ============================================================================
ALTER TABLE public.characters 
  DROP CONSTRAINT IF EXISTS characters_seed_id_fkey;

ALTER TABLE public.characters 
  DROP CONSTRAINT IF EXISTS fk_characters_seed_id;

-- Add correct foreign key reference
ALTER TABLE public.characters 
  ADD CONSTRAINT characters_seed_id_fkey 
  FOREIGN KEY (seed_id) 
  REFERENCES public.campaign_seeds(id) 
  ON DELETE CASCADE;

-- ============================================================================
-- 9. Add generation_job table to track long-running operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  progress int DEFAULT 0,
  current_stage text,
  result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT generation_jobs_status_check CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  CONSTRAINT generation_jobs_progress_check CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_generation_jobs_game_status ON public.generation_jobs (game_id, status);
CREATE INDEX idx_generation_jobs_created ON public.generation_jobs (created_at DESC);

-- RLS for generation_jobs
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generation_jobs_read_members" ON public.generation_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = generation_jobs.game_id 
      AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. Add indexes for common queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_games_status_user ON public.games (user_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_games_updated_at ON public.games (updated_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_party_slots_game_status ON public.party_slots (game_id, status);

CREATE INDEX IF NOT EXISTS idx_characters_game_status ON public.characters (game_id, status);

CREATE INDEX IF NOT EXISTS idx_character_lineups_game_created ON public.character_lineups (game_id, created_at DESC);

-- ============================================================================
-- 11. Create helper functions for state validation
-- ============================================================================

-- Function to check if game can transition to new state
CREATE OR REPLACE FUNCTION can_transition_game_state(
  p_game_id uuid,
  p_new_status text
)
RETURNS TABLE (
  can_transition boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_ready_slots int;
  v_has_story boolean;
  v_has_characters boolean;
BEGIN
  -- Get current game status
  SELECT status INTO v_current_status
  FROM public.games
  WHERE id = p_game_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'Game not found';
    RETURN;
  END IF;
  
  -- Count ready slots
  SELECT COUNT(*) INTO v_ready_slots
  FROM public.party_slots
  WHERE game_id = p_game_id
  AND status IN ('ready', 'locked');
  
  -- Check for story
  SELECT EXISTS (
    SELECT 1 FROM public.story_overviews
    WHERE game_id = p_game_id
    LIMIT 1
  ) INTO v_has_story;
  
  -- Check for approved characters
  SELECT EXISTS (
    SELECT 1 FROM public.characters
    WHERE game_id = p_game_id
    AND status = 'approved'
    LIMIT 1
  ) INTO v_has_characters;
  
  -- Validate state requirements based on target status
  CASE p_new_status
    WHEN 'characters' THEN
      IF v_ready_slots < 1 THEN
        RETURN QUERY SELECT false, 'Requires at least 1 ready player';
        RETURN;
      END IF;
      IF NOT v_has_story THEN
        RETURN QUERY SELECT false, 'Story overview must be approved';
        RETURN;
      END IF;
      
    WHEN 'char_review' THEN
      IF v_ready_slots < 1 THEN
        RETURN QUERY SELECT false, 'Requires at least 1 ready player';
        RETURN;
      END IF;
      IF NOT v_has_story THEN
        RETURN QUERY SELECT false, 'Story overview must be approved';
        RETURN;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.characters WHERE game_id = p_game_id LIMIT 1
      ) THEN
        RETURN QUERY SELECT false, 'Characters must be generated';
        RETURN;
      END IF;
      
    WHEN 'playing' THEN
      IF v_ready_slots < 1 THEN
        RETURN QUERY SELECT false, 'Requires at least 1 ready player';
        RETURN;
      END IF;
      IF NOT v_has_story THEN
        RETURN QUERY SELECT false, 'Story overview must be approved';
        RETURN;
      END IF;
      IF NOT v_has_characters THEN
        RETURN QUERY SELECT false, 'Characters must be approved';
        RETURN;
      END IF;
  END CASE;
  
  -- All checks passed
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ============================================================================
-- 12. Create function to safely transition game state
-- ============================================================================
CREATE OR REPLACE FUNCTION transition_game_state(
  p_game_id uuid,
  p_new_status text,
  p_skip_validation boolean DEFAULT false
)
RETURNS TABLE (
  success boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_can_transition boolean;
  v_error_msg text;
BEGIN
  -- Validate transition unless skipped
  IF NOT p_skip_validation THEN
    SELECT ct.can_transition, ct.error_message
    INTO v_can_transition, v_error_msg
    FROM can_transition_game_state(p_game_id, p_new_status) ct;
    
    IF NOT v_can_transition THEN
      RETURN QUERY SELECT false, v_error_msg;
      RETURN;
    END IF;
  END IF;
  
  -- Perform the update
  UPDATE public.games
  SET 
    status = p_new_status,
    updated_at = now(),
    status_changed_at = now(),
    status_changed_by = auth.uid()
  WHERE id = p_game_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Game not found';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ============================================================================
-- 13. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE public.idempotency_keys IS 
  'Stores idempotency keys to prevent duplicate operations during retries';

COMMENT ON TABLE public.generation_jobs IS 
  'Tracks long-running AI generation jobs with progress and status';

COMMENT ON FUNCTION can_transition_game_state IS 
  'Validates whether a game can transition to a new state based on requirements';

COMMENT ON FUNCTION transition_game_state IS 
  'Safely transitions a game to a new state with validation';

COMMENT ON COLUMN public.games.status_changed_at IS 
  'Timestamp of last status change for audit trail';

COMMENT ON COLUMN public.games.status_changed_by IS 
  'User who triggered the last status change';

-- ============================================================================
-- 14. Grant necessary permissions
-- ============================================================================
GRANT SELECT ON public.generation_jobs TO authenticated;
GRANT INSERT ON public.generation_jobs TO authenticated;
GRANT UPDATE ON public.generation_jobs TO authenticated;