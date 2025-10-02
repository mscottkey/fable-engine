-- Fix security linter warnings from production_foundation migration

-- ============================================================================
-- 1. Enable RLS on idempotency_keys table
-- ============================================================================
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Only system/backend should access idempotency keys
-- Users should not directly access this table
DROP POLICY IF EXISTS "idempotency_keys_no_direct_access" ON public.idempotency_keys;
CREATE POLICY "idempotency_keys_no_direct_access" ON public.idempotency_keys
  FOR ALL USING (false);

-- ============================================================================
-- 2. Add SET search_path to functions missing it
-- ============================================================================

-- Fix cleanup_expired_idempotency_keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < now();
END;
$$;

-- Fix can_transition_game_state
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
SET search_path = public
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

-- Fix transition_game_state
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
SET search_path = public
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
