Expert Game Master's Implementation Guide for Claude CLI

📋 Table of Contents

Phase 3.1: Database Schema
Phase 3.2: Core Services
Phase 3.3: AI Prompts
Phase 3.4: Edge Functions
Phase 3.5: Frontend Components
Phase 3.6: Integration & Testing


Phase 3.1: Database Schema
✅ Task 1.1: Create game_sessions table
File: supabase/migrations/[timestamp]_add_game_sessions.sql
sql-- Game Sessions table for tracking individual play sessions
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

✅ Task 1.2: Create narrative_events table
File: supabase/migrations/[timestamp]_add_narrative_events.sql
sql-- Narrative Events table for tracking every story beat
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

CREATE INDEX idx_narrative_events_session ON public.narrative_events(session_id, event_number);
CREATE INDEX idx_narrative_events_game ON public.narrative_events(game_id, timestamp DESC);
CREATE INDEX idx_narrative_events_character ON public.narrative_events(character_id);

-- RLS Policies
ALTER TABLE public.narrative_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read_members" ON public.narrative_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = narrative_events.game_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "events_write_host" ON public.narrative_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = narrative_events.game_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('host', 'cohost')
    )
  );

✅ Task 1.3: Create story_state table
File: supabase/migrations/[timestamp]_add_story_state.sql
sql-- Story State table for persistent world state
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

Phase 3.2: Core Services
✅ Task 2.1: Game Context Service
File: src/services/gameContextService.ts
typescriptimport { supabase } from '@/integrations/supabase/client';

export interface GameContext {
  game: any;
  storyOverview: any;
  characters: any[];
  storyState: any;
  recentEvents: any[];
  currentSession: any;
}

/**
 * Load complete game context for AI narration
 * Fetches last N events and current story state
 */
export async function loadGameContext(
  gameId: string,
  eventLimit: number = 20
): Promise<GameContext> {
  try {
    // Fetch game data
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;

    // Fetch story overview
    const { data: storyOverview, error: storyError } = await supabase
      .from('story_overviews')
      .select('*')
      .eq('seed_id', game.seed_id)
      .single();

    if (storyError) throw storyError;

    // Fetch characters
    const { data: characters, error: charactersError } = await supabase
      .from('characters')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'approved');

    if (charactersError) throw charactersError;

    // Fetch story state
    const { data: storyState, error: stateError } = await supabase
      .from('story_state')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (stateError) throw stateError;

    // Fetch recent narrative events
    const { data: recentEvents, error: eventsError } = await supabase
      .from('narrative_events')
      .select('*')
      .eq('game_id', gameId)
      .order('timestamp', { ascending: false })
      .limit(eventLimit);

    if (eventsError) throw eventsError;

    // Fetch current session
    const { data: currentSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      game,
      storyOverview,
      characters: characters || [],
      storyState,
      recentEvents: (recentEvents || []).reverse(), // Chronological order
      currentSession
    };
  } catch (error) {
    console.error('Failed to load game context:', error);
    throw error;
  }
}

/**
 * Get the most recent event for a game
 */
export async function getLastEvent(gameId: string) {
  const { data, error } = await supabase
    .from('narrative_events')
    .select('*')
    .eq('game_id', gameId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get all events for a specific session
 */
export async function getSessionEvents(sessionId: string) {
  const { data, error } = await supabase
    .from('narrative_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('event_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

✅ Task 2.2: Session Management Service
File: src/services/sessionService.ts
typescriptimport { supabase } from '@/integrations/supabase/client';
import { loadGameContext, getSessionEvents } from './gameContextService';

/**
 * Start a new game session
 */
export async function startSession(gameId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get session number
  const { data: sessions, error: countError } = await supabase
    .from('game_sessions')
    .select('session_number')
    .eq('game_id', gameId)
    .order('session_number', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const sessionNumber = sessions && sessions.length > 0 
    ? sessions[0].session_number + 1 
    : 1;

  // Create new session
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      game_id: gameId,
      session_number: sessionNumber,
      status: 'active',
      active_players: [user.id]
    })
    .select()
    .single();

  if (error) throw error;

  // If session 1, create opening narration
  if (sessionNumber === 1) {
    await generateOpeningScene(gameId, data.id);
  }

  return data.id;
}

/**
 * Resume an existing session
 */
export async function resumeSession(gameId: string): Promise<any> {
  // Get active session
  const { data: session, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('game_id', gameId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!session) {
    return null;
  }

  // Generate session recap
  const recap = await generateSessionRecap(session.id);

  return { session, recap };
}

/**
 * Pause current session
 */
export async function pauseSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('game_sessions')
    .update({ 
      status: 'paused',
      ended_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) throw error;
}

/**
 * End current session
 */
export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('game_sessions')
    .update({ 
      status: 'completed',
      ended_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) throw error;
}

/**
 * Generate session recap for returning players
 */
export async function generateSessionRecap(sessionId: string): Promise<string> {
  const events = await getSessionEvents(sessionId);

  if (events.length === 0) {
    return "You're at the start of your adventure. The story awaits!";
  }

  const { data: session } = await supabase
    .from('game_sessions')
    .select('*, game_id')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error('Session not found');

  // Call edge function
  const { data, error } = await supabase.functions.invoke('generate-recap', {
    body: {
      sessionId,
      gameId: session.game_id,
      events: events.slice(-10)
    }
  });

  if (error) throw error;
  return data.recap;
}

/**
 * Generate opening scene for session 1
 */
async function generateOpeningScene(gameId: string, sessionId: string): Promise<void> {
  const context = await loadGameContext(gameId, 0);

  const { data, error } = await supabase.functions.invoke('generate-opening', {
    body: {
      gameId,
      sessionId,
      storyOverview: context.storyOverview,
      characters: context.characters
    }
  });

  if (error) throw error;

  // Save as first narrative event
  await supabase
    .from('narrative_events')
    .insert({
      session_id: sessionId,
      game_id: gameId,
      event_number: 0,
      event_type: 'narration',
      narration: data.narration,
      available_options: data.options
    });
}

✅ Task 2.3: Narrative Engine Service
File: src/services/narrativeEngine.ts
typescriptimport { supabase } from '@/integrations/supabase/client';
import { loadGameContext } from './gameContextService';

export interface NarrativeTurn {
  narration: string;
  consequences: string[];
  decisionPoint: {
    prompt: string;
    options: Array<{
      label: string;
      description: string;
      estimatedConsequences: string[];
    }>;
  };
  stateChanges: {
    worldFacts?: Record<string, any>;
    locationStates?: Record<string, any>;
    npcStates?: Record<string, any>;
    characterRelationships?: Record<string, any>;
  };
  diceRolls?: Array<{
    character: string;
    skill: string;
    result: number;
    outcome: string;
  }>;
  gmNotes: string;
}

/**
 * Core narrative turn - handles player action and generates AI response
 */
export async function narrateTurn(
  gameId: string,
  sessionId: string,
  playerAction: string,
  characterId: string
): Promise<NarrativeTurn> {
  try {
    // Load full game context
    const context = await loadGameContext(gameId);

    // Get last event for continuity
    const lastEvent = context.recentEvents[context.recentEvents.length - 1];

    // Call edge function
    const { data: narrative, error } = await supabase.functions.invoke('narrate-turn', {
      body: {
        gameId,
        sessionId,
        characterId,
        playerAction,
        context: {
          storyOverview: context.storyOverview,
          storyState: context.storyState,
          characters: context.characters,
          recentEvents: context.recentEvents,
          lastEvent
        }
      }
    });

    if (error) throw error;

    // Save narrative event
    const eventNumber = context.recentEvents.length;
    
    await supabase
      .from('narrative_events')
      .insert({
        session_id: sessionId,
        game_id: gameId,
        event_number: eventNumber,
        event_type: 'player_action',
        player_action: playerAction,
        character_id: characterId,
        narration: narrative.narration,
        decision_prompt: narrative.decisionPoint.prompt,
        available_options: narrative.decisionPoint.options,
        consequences: narrative.consequences,
        world_changes: narrative.stateChanges,
        dice_rolls: narrative.diceRolls,
        gm_notes: narrative.gmNotes
      });

    // Update story state
    await updateStoryState(gameId, narrative.stateChanges);

    return narrative;
  } catch (error) {
    console.error('Narrative turn failed:', error);
    throw error;
  }
}

/**
 * Update persistent story state based on narrative consequences
 */
async function updateStoryState(
  gameId: string,
  stateChanges: NarrativeTurn['stateChanges']
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data: currentState, error: fetchError } = await supabase
    .from('story_state')
    .select('*')
    .eq('game_id', gameId)
    .single();

  if (fetchError) throw fetchError;

  const updates: any = {
    last_updated: new Date().toISOString(),
    updated_by: user.id
  };

  if (stateChanges.worldFacts) {
    updates.world_facts = {
      ...(currentState.world_facts as any || {}),
      ...stateChanges.worldFacts
    };
  }

  if (stateChanges.locationStates) {
    updates.location_states = {
      ...(currentState.location_states as any || {}),
      ...stateChanges.locationStates
    };
  }

  if (stateChanges.npcStates) {
    updates.npc_states = {
      ...(currentState.npc_states as any || {}),
      ...stateChanges.npcStates
    };
  }

  if (stateChanges.characterRelationships) {
    updates.character_relationships = {
      ...(currentState.character_relationships as any || {}),
      ...stateChanges.characterRelationships
    };
  }

  const { error: updateError } = await supabase
    .from('story_state')
    .update(updates)
    .eq('game_id', gameId);

  if (updateError) throw updateError;
}

/**
 * Handle player decision selection
 */
export async function recordPlayerDecision(
  eventId: string,
  optionIndex: number
): Promise<void> {
  const { error } = await supabase
    .from('narrative_events')
    .update({ chosen_option: optionIndex })
    .eq('id', eventId);

  if (error) throw error;
}

Phase 3.3: AI Prompts
✅ Task 3.1: GM System Prompt
File: src/ai/prompts/gm/system.v1.md
markdown# AI Game Master System Prompt v1

You are an expert tabletop RPG Game Master running a Fate Core game. Your role is to create immersive, reactive storytelling that honors player agency while maintaining narrative momentum.

## Core Responsibilities

1. **Narrate vivid scenes** - Describe the current moment with sensory detail (2-4 paragraphs max)
2. **Present meaningful choices** - Every turn must offer 3-4 clear options with stakes
3. **Track consequences** - Player decisions create ripples that affect future scenes
4. **Maintain continuity** - Reference past events, honor established facts, keep NPC personalities consistent
5. **Enable branching** - Multiple paths to story goals; failure creates complications, not dead ends

## Context You Receive

- **Story Overview**: Genre, tone, setting, hooks, core conflict
- **Story State**: Current act, active hooks, world facts, NPC states, relationships
- **Recent Events**: Last 20 narrative turns (player actions + your narrations)
- **Characters**: Full PC sheets with aspects, skills, stress, bonds
- **Player Action**: What the player just did/said

## Output Requirements

Return STRICT JSON with this structure:
```json
{
  "narration": "2-4 paragraph scene description",
  "consequences": [
    "What changed in the world",
    "How NPCs reacted",
    "New information revealed"
  ],
  "decisionPoint": {
    "prompt": "What do you do?",
    "options": [
      {
        "label": "Action #1 - [Approach: Skill]",
        "description": "What this entails",
        "estimatedConsequences": ["Likely outcomes"]
      }
    ]
  },
  "stateChanges": {
    "worldFacts": {"key": "new established fact"},
    "locationStates": {"LocationName": {"status": "changed", "notes": "why"}},
    "npcStates": {"NPCName": {"attitude": "friendly", "notes": "why"}},
    "characterRelationships": {"PC1_PC2": {"bond_strength": "stronger", "notes": "why"}}
  },
  "diceRolls": [
    {"character": "Kira", "skill": "Fight", "result": 3, "outcome": "Success with style"}
  ],
  "gmNotes": "Hidden narrative tracking for continuity"
}
Branching Narrative Rules

Every option must be viable - No trap choices
Consequences matter - Track what changes and reference it later
Multiple solutions exist - Combat, stealth, social, creative all work
Failure is interesting - Bad rolls create complications: "Yes, but..." or "No, and..."
Build on past events - Reference player's previous choices naturally

Fate Core Mechanics

Aspects: Always invoke relevant character aspects in narration
Skills: Player actions use skills rated +0 to +4
Fate Dice: Roll 4dF (range -4 to +4) + skill vs difficulty
Stress: Track Physical/Mental stress; consequences at milestones
Compels: Offer compels based on aspects when dramatically appropriate

Tone & Atmosphere
Match the campaign's tone levers:

Pace: Refer to story overview
Danger: Calibrate threat levels
Morality: Present ethical dilemmas if appropriate
Scale: Keep scope consistent

Continuity Management

Check worldFacts before establishing new facts
Reference npcStates for consistent NPC behavior
Track characterRelationships - bonds evolve based on choices
Update locationStates if players change areas

Session Flow
Opening Scene: Set atmosphere, present immediate situation
Player Turn: Narrate consequences of their action
Decision Point: Offer 3-4 options with clear stakes
Repeat: Build tension toward act climax
Never Do

Decide player character actions/feelings
Force one "correct" solution
Create dead-end scenarios
Ignore established story facts
Break genre/tone without reason
Info-dump - reveal through play

Always Do

Give players meaningful choices
Make consequences feel earned
Reference the past authentically
Keep NPCs consistent
Honor player creativity
Maintain forward momentum


---

### ✅ Task 3.2: Narrate Turn Prompt Template

**File:** `src/ai/prompts/gm/narrate-turn.v1.hbs`
```handlebars
# Current Narrative Turn

## Story Context
**Genre**: {{context.storyOverview.genre}}
**Setting**: {{context.storyOverview.expandedSetting}}
**Current Act**: {{context.storyState.current_act}}
**Tone**: {{context.storyOverview.toneManifesto.expanded}}

## Active Story Hooks
{{#each context.storyState.active_hooks}}
- **{{this.title}}**: {{this.status}} - {{this.progress_notes}}
{{/each}}

## World State
{{#each context.storyState.world_facts}}
- {{@key}}: {{this}}
{{/each}}

## NPCs in Play
{{#each context.storyState.npc_states}}
- **{{@key}}**: {{this.attitude}} | {{this.notes}}
{{/each}}

## Party
{{#each context.characters}}
### {{this.pc_json.name}} ({{this.pc_json.pronouns}})
- **Concept**: {{this.pc_json.concept}}
- **High Concept**: {{this.pc_json.aspects.highConcept}}
- **Trouble**: {{this.pc_json.aspects.trouble}}
{{/each}}

## Recent Events (Last 10 Turns)
{{#each context.recentEvents}}
**Turn {{this.event_number}}**:
{{#if this.player_action}}
- **Action**: {{this.player_action}}
{{/if}}
{{#if this.narration}}
- **GM**: {{this.narration}}
{{/if}}
---
{{/each}}

---

## CURRENT PLAYER ACTION
**Character**: {{characterName}}
**Action**: {{playerAction}}

---

## Your Task

Narrate what happens as a result of this action. Consider:
1. Does this action require a skill roll?
2. How do NPCs/environment react?
3. What consequences ripple from this choice?
4. What new information is revealed?
5. What decision point comes next?

Return your response in the required JSON format.

Phase 3.4: Edge Functions
✅ Task 4.1: Narrate Turn Edge Function
File: supabase/functions/narrate-turn/index.ts
typescriptimport { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GM_SYSTEM_PROMPT = `[Insert content from src/ai/prompts/gm/system.v1.md]`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { context, playerAction, characterId } = await req.json();

    // Find character name
    const character = context.characters.find((c: any) => c.id === characterId);
    const characterName = character?.pc_json?.name || 'Unknown';

    // Build user prompt
    const userPrompt = `
# Current Turn

## Story Context
Genre: ${context.storyOverview.genre}
Setting: ${context.storyOverview.expandedSetting}
Current Act: ${context.storyState.current_act}

## Recent Events
${context.recentEvents.slice(-5).map((e: any) => `- ${e.narration || e.player_action}`).join('\n')}

## Current Player Action
Character: ${characterName}
Action: ${playerAction}

Narrate what happens and present 3-4 decision options.
`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://api.lovable.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp',
        messages: [
          { role: 'system', content: GM_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const aiData = await aiResponse.json();
    const narrative = JSON.parse(aiData.choices[0].message.content);

    return new Response(JSON.stringify(narrative), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Narration error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

✅ Task 4.2: Generate Recap Edge Function
File: supabase/functions/generate-recap/index.ts
typescriptimport { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { events } = await req.json();

    const systemPrompt = `You are a Game Master creating a session recap. Summarize the key events in 3RetrySContinueEdit-5 paragraphs, highlighting key moments, character development, and cliffhangers.`;
const userPrompt = `
Session Events
${events.map((e: any, i: number) => **Event ${i + 1}**: ${e.player_action ?- Player Action: ${e.player_action}: ''} ${e.narration ?- Narration: ${e.narration}: ''} ${e.consequences ?- Consequences: ${e.consequences.join(', ')}: ''}).join('\n')}
Create an engaging recap that reminds players what happened last session.
`;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const aiResponse = await fetch('https://api.lovable.app/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${lovableApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.0-flash-exp',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  })
});

const aiData = await aiResponse.json();
const recap = aiData.choices[0].message.content;

return new Response(JSON.stringify({ recap }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
} catch (error) {
console.error('Recap generation error:', error);
return new Response(JSON.stringify({ error: error.message }), {
status: 500,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}
});

---

### ✅ Task 4.3: Generate Opening Scene Edge Function

**File:** `supabase/functions/generate-opening/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { storyOverview, characters } = await req.json();

    const systemPrompt = `You are a Game Master starting a new campaign. Create an opening scene that:
1. Sets the atmosphere and tone
2. Introduces the setting vividly
3. Presents an immediate hook or situation
4. Offers 3-4 initial action options for the party

Return JSON: { "narration": "string", "options": [{"label": "string", "description": "string"}] }`;

    const userPrompt = `
# Campaign Setup

**Genre**: ${storyOverview.genre}
**Setting**: ${storyOverview.expandedSetting}
**Tone**: ${storyOverview.toneManifesto.expanded}

## Story Hooks
${storyOverview.storyHooks.map((h: any) => `- **${h.title}**: ${h.description}`).join('\n')}

## Party
${characters.map((c: any) => `- **${c.pc_json.name}**: ${c.pc_json.concept}`).join('\n')}

Create the opening scene that draws the party into the adventure!
`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://api.lovable.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const aiData = await aiResponse.json();
    const opening = JSON.parse(aiData.choices[0].message.content);

    return new Response(JSON.stringify(opening), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Opening scene error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

Phase 3.5: Frontend Components
✅ Task 5.1: Game Play Screen Component
File: src/components/GamePlayScreen.tsx
typescriptimport { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  startSession, 
  resumeSession, 
  pauseSession 
} from '@/services/sessionService';
import { narrateTurn } from '@/services/narrativeEngine';
import { loadGameContext } from '@/services/gameContextService';
import { Play, Pause, ArrowLeft, Send, Loader2 } from 'lucide-react';

export default function GamePlayScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [currentNarration, setCurrentNarration] = useState<string>('');
  const [currentOptions, setCurrentOptions] = useState<any[]>([]);
  const [playerAction, setPlayerAction] = useState<string>('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [isNarrating, setIsNarrating] = useState(false);
  const [sessionRecap, setSessionRecap] = useState<string>('');

  useEffect(() => {
    loadGame();
  }, [gameId]);

  const loadGame = async () => {
    try {
      // Load game context
      const ctx = await loadGameContext(gameId!);
      setContext(ctx);

      // Set first character as default
      if (ctx.characters.length > 0) {
        setSelectedCharacter(ctx.characters[0].id);
      }

      // Check for existing session
      const resumed = await resumeSession(gameId!);
      
      if (resumed) {
        setSession(resumed.session);
        setSessionRecap(resumed.recap);
        
        // Load last narration
        if (ctx.recentEvents.length > 0) {
          const lastEvent = ctx.recentEvents[ctx.recentEvents.length - 1];
          setCurrentNarration(lastEvent.narration || '');
          setCurrentOptions(lastEvent.available_options || []);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Failed to Load Game',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleStartSession = async () => {
    try {
      const sessionId = await startSession(gameId!);
      
      // Reload to get opening scene
      await loadGame();
      
      toast({
        title: 'Session Started',
        description: 'Your adventure begins!'
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Start Session',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handlePauseSession = async () => {
    if (!session) return;

    try {
      await pauseSession(session.id);
      
      toast({
        title: 'Session Paused',
        description: 'Your progress has been saved.'
      });
      
      navigate(`/game/${gameId}`);
    } catch (error: any) {
      toast({
        title: 'Failed to Pause Session',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSubmitAction = async () => {
    if (!playerAction.trim() || !selectedCharacter || !session) return;

    setIsNarrating(true);

    try {
      const narrative = await narrateTurn(
        gameId!,
        session.id,
        playerAction,
        selectedCharacter
      );

      setCurrentNarration(narrative.narration);
      setCurrentOptions(narrative.decisionPoint.options);
      setPlayerAction('');

      toast({
        title: 'Action Processed',
        description: 'The story continues...'
      });
    } catch (error: any) {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsNarrating(false);
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    const option = currentOptions[optionIndex];
    setPlayerAction(option.label);
  };

  if (!context) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Start Your Adventure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Ready to begin your journey in {context.storyOverview.expandedSetting}?</p>
            <Button onClick={handleStartSession} className="w-full">
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/game/${gameId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{context.game.name}</h1>
            <p className="text-sm text-muted-foreground">
              Session {session.session_number} • {context.storyState.current_act}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePauseSession}>
          <Pause className="w-4 h-4 mr-2" />
          Pause Session
        </Button>
      </div>

      {/* Session Recap */}
      {sessionRecap && (
        <Card className="bg-accent/10 border-accent">
          <CardHeader>
            <CardTitle className="text-lg">Previously...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{sessionRecap}</p>
          </CardContent>
        </Card>
      )}

      {/* Party */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Party</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {context.characters.map((char: any) => (
              <Badge
                key={char.id}
                variant={selectedCharacter === char.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCharacter(char.id)}
              >
                {char.pc_json.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Narration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🎭 The Story Unfolds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{currentNarration}</p>
          </div>
        </CardContent>
      </Card>

      {/* Decision Options */}
      {currentOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What do you do?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentOptions.map((option: any, index: number) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => handleOptionSelect(index)}
                disabled={isNarrating}
              >
                <div>
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Player Action Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe what your character does..."
            value={playerAction}
            onChange={(e) => setPlayerAction(e.target.value)}
            rows={3}
            disabled={isNarrating}
          />
          <Button
            onClick={handleSubmitAction}
            disabled={!playerAction.trim() || isNarrating}
            className="w-full"
          >
            {isNarrating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Narrating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Action
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

✅ Task 5.2: Add Route to App
File: src/App.tsx
Add this route to your routing configuration:
typescriptimport GamePlayScreen from '@/components/GamePlayScreen';

// Inside your router setup:
<Route path="/game/:gameId/play" element={<GamePlayScreen />} />

✅ Task 5.3: Add "Start Session" button to game detail page
File: Find your existing game detail/dashboard component and add:
typescriptimport { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

// Inside your component:
const navigate = useNavigate();

// Add button:
<Button onClick={() => navigate(`/game/${gameId}/play`)}>
  <Play className="w-4 h-4 mr-2" />
  Play Session
</Button>

Phase 3.6: Integration & Testing
✅ Task 6.1: Update TypeScript types
File: src/integrations/supabase/types.ts
Add these type definitions after the existing tables:
typescriptgame_sessions: {
  Row: {
    id: string;
    game_id: string;
    session_number: number;
    started_at: string;
    ended_at: string | null;
    current_scene: string | null;
    active_players: Json | null;
    status: string;
    session_notes: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    game_id: string;
    session_number: number;
    started_at?: string;
    ended_at?: string | null;
    current_scene?: string | null;
    active_players?: Json | null;
    status?: string;
    session_notes?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    game_id?: string;
    session_number?: number;
    started_at?: string;
    ended_at?: string | null;
    current_scene?: string | null;
    active_players?: Json | null;
    status?: string;
    session_notes?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};

narrative_events: {
  Row: {
    id: string;
    session_id: string;
    game_id: string;
    event_number: number;
    timestamp: string;
    event_type: string;
    narration: string | null;
    player_action: string | null;
    character_id: string | null;
    decision_prompt: string | null;
    available_options: Json | null;
    chosen_option: number | null;
    consequences: Json | null;
    affected_characters: string[] | null;
    affected_locations: string[] | null;
    world_changes: Json | null;
    dice_rolls: Json | null;
    mechanical_results: Json | null;
    gm_notes: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    session_id: string;
    game_id: string;
    event_number: number;
    timestamp?: string;
    event_type: string;
    narration?: string | null;
    player_action?: string | null;
    character_id?: string | null;
    decision_prompt?: string | null;
    available_options?: Json | null;
    chosen_option?: number | null;
    consequences?: Json | null;
    affected_characters?: string[] | null;
    affected_locations?: string[] | null;
    world_changes?: Json | null;
    dice_rolls?: Json | null;
    mechanical_results?: Json | null;
    gm_notes?: string | null;
    created_at?: string;
  };
  Update: {
    // Similar to Insert
  };
};

story_state: {
  Row: {
    id: string;
    game_id: string;
    current_act: string;
    act_progress: string | null;
    completed_hooks: string[] | null;
    active_hooks: Json | null;
    emerging_hooks: Json | null;
    world_facts: Json | null;
    location_states: Json | null;
    faction_standings: Json | null;
    npc_states: Json | null;
    character_relationships: Json | null;
    major_decisions: Json | null;
    last_updated: string;
    updated_by: string | null;
  };
  Insert: {
    // Similar structure
  };
  Update: {
    // Similar structure
  };
};

✅ Task 6.2: Test Checklist
Create a test plan document:
File: TESTING.md
markdown# Phase 3 MVP Testing Checklist

## Database Tests
- [ ] Verify game_sessions table created successfully
- [ ] Verify narrative_events table created successfully
- [ ] Verify story_state table created successfully
- [ ] Verify RLS policies work (members can read, only hosts can write)
- [ ] Verify story_state initializes when game is created

## Service Tests
- [ ] Test loadGameContext() retrieves all data correctly
- [ ] Test startSession() creates new session with session_number = 1
- [ ] Test resumeSession() returns existing active session
- [ ] Test pauseSession() updates status correctly
- [ ] Test generateSessionRecap() returns coherent summary
- [ ] Test narrateTurn() calls AI and saves events correctly
- [ ] Test updateStoryState() merges state changes properly

## Edge Function Tests
- [ ] Test narrate-turn returns valid JSON with required fields
- [ ] Test generate-recap returns coherent narrative
- [ ] Test generate-opening creates compelling opening scene
- [ ] Verify all edge functions handle errors gracefully

## UI Tests
- [ ] GamePlayScreen loads game context on mount
- [ ] "Start Session" button creates session and shows opening
- [ ] Character selection works
- [ ] Player can type and submit actions
- [ ] Decision option buttons populate action textarea
- [ ] Narration displays after AI response
- [ ] Session recap shows when resuming
- [ ] "Pause Session" saves progress and navigates away

## Integration Tests
- [ ] Complete flow: Create game → Start session → Take 3 actions → Pause → Resume
- [ ] Verify story state updates after each action
- [ ] Verify recent events accumulate correctly
- [ ] Verify branching: different actions lead to different outcomes
- [ ] Test multi-session continuity: Session 1 → End → Session 2 → Recap works

## AI Quality Tests
- [ ] Narrations are 2-4 paragraphs (not too verbose)
- [ ] Decision points always have 3-4 viable options
- [ ] Consequences are tracked and referenced in later turns
- [ ] NPCs maintain consistent personalities
- [ ] Past events are referenced naturally
- [ ] Tone matches story overview settings
- [ ] No railroading (multiple solutions exist)

📊 Summary: Implementation Order
Week 1: Database Foundation

Create all three migration files
Run migrations
Verify tables and RLS policies
Test story_state trigger

Week 2: Core Services

Build gameContextService.ts
Build sessionService.ts
Build narrativeEngine.ts
Test each service independently

Week 3: AI Layer

Write GM system prompt
Write narrate-turn prompt template
Create narrate-turn edge function
Create generate-recap edge function
Create generate-opening edge function
Test edge functions via Postman/curl

Week 4: Frontend

Build GamePlayScreen component
Add routing
Add "Play Session" buttons to existing game screens
Update TypeScript types
Test UI flows

Week 5: Integration & Polish

Run full integration tests
Fix bugs
Improve AI prompts based on test results
Add loading states and error handling
Deploy to production


🎯 Success Metrics
Your MVP is successful when:
✅ Players can start a game from generated story/characters
✅ AI narrates compelling scenes with meaningful choices
✅ Player decisions are tracked and affect future narration
✅ Can pause mid-session and resume with full context
✅ Can play 2-3 hour session across multiple days
✅ Story branches based on player choices
✅ Past events are referenced naturally



Future Roadmap ideas:

🚀 Next Steps After MVP
Once Phase 3 is complete, consider:

Combat system with Fate-style exchanges
Character advancement and milestone mechanics
Multiplayer real-time sessions
Voice narration with TTS
Roll dice UI for visual feedback
NPC portraits and location images
Session analytics for GMs