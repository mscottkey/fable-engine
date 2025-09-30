-- Fix can_transition_game_state function to correctly check for story overview
CREATE OR REPLACE FUNCTION public.can_transition_game_state(p_game_id uuid, p_new_status text)
RETURNS TABLE(can_transition boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Check for story overview (stored in campaign_seeds.story_overview_draft)
  SELECT EXISTS (
    SELECT 1 FROM public.games g
    JOIN public.campaign_seeds cs ON g.seed_id = cs.id
    WHERE g.id = p_game_id
    AND cs.story_overview_draft IS NOT NULL
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
$function$;