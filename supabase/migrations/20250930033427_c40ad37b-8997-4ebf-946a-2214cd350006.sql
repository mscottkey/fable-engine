-- INVITES (game-level code/link)
CREATE TABLE IF NOT EXISTS public.game_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,          -- 6–8 uppercase alnum
  max_uses int NOT NULL DEFAULT 8,
  uses int NOT NULL DEFAULT 0,
  expires_at timestamptz,             -- nullable (no expiry)
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ON public.game_invites (game_id);

-- PARTY SLOTS (1 row per seat in the party)
CREATE TABLE IF NOT EXISTS public.party_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  index_in_party int NOT NULL,                     -- 0..N-1
  status text NOT NULL DEFAULT 'empty',            -- 'empty'|'reserved'|'ready'|'locked'
  reserved_by uuid REFERENCES auth.users(id),
  claimed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, index_in_party)
);
CREATE INDEX IF NOT EXISTS ON public.party_slots (game_id);

-- CHARACTER SEEDS (preferences per slot, filled by claimant)
CREATE TABLE IF NOT EXISTS public.character_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.party_slots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- core fields
  display_name text,
  pronouns text,
  archetype_prefs jsonb,            -- ranked list, e.g., ["Mystic","Face","Scout"]
  role_tags_interest jsonb,         -- ["Investigation","Support","Frontline"]
  tone_comfort jsonb,               -- {lines:["X"], veils:["Y"]}
  violence_comfort text,            -- 'low'|'med'|'high'
  complexity text,                  -- 'rules-light'|'standard'|'crunchy'
  mechanics_comfort text,           -- 'newbie'|'familiar'|'expert'
  concept text,                     -- 1–2 sentences
  must_have jsonb,                  -- ["ranger", "animal companion"]
  no_thanks jsonb,                  -- ["clown", "gross-out horror"]
  keep_name boolean NOT NULL DEFAULT false,
  tts_voice text,
  timezone text,
  -- audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ON public.character_seeds (game_id);
CREATE INDEX IF NOT EXISTS ON public.character_seeds (slot_id);

-- MEMBERSHIP (who's in the game; host is games.user_id or explicit host_id)
CREATE TABLE IF NOT EXISTS public.game_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'player',             -- 'host'|'player'|'cohost'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id)
);
CREATE INDEX IF NOT EXISTS ON public.game_members (game_id);

-- GAME SETTINGS (party size + lock state)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS party_size int,
  ADD COLUMN IF NOT EXISTS party_locked boolean NOT NULL DEFAULT false;

-- RLS
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_members ENABLE ROW LEVEL SECURITY;

-- Policies: members can read/write their game; host can manage all rows in that game.
DROP POLICY IF EXISTS "invites_read_by_members" ON public.game_invites;
CREATE POLICY "invites_read_by_members" ON public.game_invites
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=game_invites.game_id AND m.user_id=auth.uid()));
DROP POLICY IF EXISTS "invites_write_host" ON public.game_invites;
CREATE POLICY "invites_write_host" ON public.game_invites
  FOR ALL USING (EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=game_invites.game_id AND m.user_id=auth.uid() AND m.role IN ('host','cohost')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=game_invites.game_id AND m.user_id=auth.uid() AND m.role IN ('host','cohost')));

DROP POLICY IF EXISTS "slots_rw_members" ON public.party_slots;
CREATE POLICY "slots_rw_members" ON public.party_slots
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=party_slots.game_id AND m.user_id=auth.uid()));
DROP POLICY IF EXISTS "slots_claim_write" ON public.party_slots;
CREATE POLICY "slots_claim_write" ON public.party_slots
  FOR UPDATE USING (claimed_by=auth.uid() OR EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=party_slots.game_id AND m.user_id=auth.uid() AND m.role IN ('host','cohost')))
  WITH CHECK (true);
DROP POLICY IF EXISTS "slots_insert_host" ON public.party_slots;
CREATE POLICY "slots_insert_host" ON public.party_slots
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=party_slots.game_id AND m.user_id=auth.uid() AND m.role IN ('host','cohost')));

DROP POLICY IF EXISTS "seeds_rw_owner" ON public.character_seeds;
CREATE POLICY "seeds_rw_owner" ON public.character_seeds
  FOR SELECT USING (user_id=auth.uid() OR EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=character_seeds.game_id AND m.user_id=auth.uid() AND m.role IN ('host','cohost')));
DROP POLICY IF EXISTS "seeds_write_owner" ON public.character_seeds;
CREATE POLICY "seeds_write_owner" ON public.character_seeds
  FOR INSERT WITH CHECK (user_id=auth.uid());
DROP POLICY IF EXISTS "seeds_update_owner" ON public.character_seeds;
CREATE POLICY "seeds_update_owner" ON public.character_seeds
  FOR UPDATE USING (user_id=auth.uid() OR EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=character_seeds.game_id AND m.user_id=auth.uid() AND m.role IN ('host','cohost')))
  WITH CHECK (true);

DROP POLICY IF EXISTS "members_rw_self_host" ON public.game_members;
CREATE POLICY "members_rw_self_host" ON public.game_members
  FOR SELECT USING (user_id=auth.uid() OR EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=game_members.game_id AND m.user_id=auth.uid() AND m.role IN ('host','cohost')));
DROP POLICY IF EXISTS "members_insert_host" ON public.game_members;
CREATE POLICY "members_insert_host" ON public.game_members
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id=game_members.game_id AND m.user_id=auth.uid() AND m.role IN ('host','cohost')));

-- Create trigger for updating updated_at on character_seeds
DROP TRIGGER IF EXISTS update_character_seeds_updated_at ON public.character_seeds;
CREATE TRIGGER update_character_seeds_updated_at
  BEFORE UPDATE ON public.character_seeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
