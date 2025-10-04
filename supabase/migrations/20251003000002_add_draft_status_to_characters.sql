-- Migration: Add 'draft' status to characters table
-- Date: 2025-10-03
-- Purpose: Allow characters to be saved as drafts before approval

-- Drop existing constraint
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS characters_status_check;

-- Add new constraint with 'draft' included
ALTER TABLE public.characters ADD CONSTRAINT characters_status_check
  CHECK (status IN ('pending', 'generated', 'draft', 'approved', 'rejected'));

-- Add comment explaining the status values
COMMENT ON COLUMN public.characters.status IS 'Character lifecycle status: pending (invited), generated (AI created), draft (pre-approval), approved (finalized), rejected (not used)';
