-- Migration: Add beat/act tracking fields to story_state
-- Phase 3.6: Beat and Act Progression Tracking

ALTER TABLE story_state
ADD COLUMN IF NOT EXISTS current_act_number int DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_beat_id text,
ADD COLUMN IF NOT EXISTS act_progress text DEFAULT 'early',
ADD COLUMN IF NOT EXISTS act_beats_completed text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS key_info_revealed text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sessions_played int DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_sessions_remaining int,
ADD COLUMN IF NOT EXISTS campaign_resolution_approaching boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS final_act_triggered boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS divergence_log jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS adapted_beats jsonb DEFAULT '{}'::jsonb;

-- Add comment explaining beat tracking
COMMENT ON COLUMN story_state.current_act_number IS 'Current act in the 3-act campaign structure (1-3)';
COMMENT ON COLUMN story_state.current_beat_id IS 'ID of the current story beat being played';
COMMENT ON COLUMN story_state.act_progress IS 'Progress through current act: early, mid, late';
COMMENT ON COLUMN story_state.act_beats_completed IS 'Array of beat IDs completed in current act';
COMMENT ON COLUMN story_state.key_info_revealed IS 'Array of key information pieces revealed to players';
COMMENT ON COLUMN story_state.sessions_played IS 'Total number of sessions played in this campaign';
COMMENT ON COLUMN story_state.estimated_sessions_remaining IS 'AI estimate of remaining sessions';
COMMENT ON COLUMN story_state.campaign_resolution_approaching IS 'Flag indicating campaign is nearing conclusion';
COMMENT ON COLUMN story_state.final_act_triggered IS 'Flag indicating final act has begun';
COMMENT ON COLUMN story_state.divergence_log IS 'Log of player divergences from planned beats';
COMMENT ON COLUMN story_state.adapted_beats IS 'Modified beat structures due to player choices';
