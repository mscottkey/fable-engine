Core Game Engine - Implementation Instructions
Overview
This document contains instructions for Claude CLI to implement the core gameplay engine that enables persistent, branching storytelling across multiple sessions.

📋 Task List for Claude CLI
Task 1: Database Schema - Add game_sessions table
Create migration file: supabase/migrations/[timestamp]_add_game_sessions.sql
Requirements:

Table: game_sessions
Columns:

id (uuid, primary key)
game_id (uuid, foreign key to games)
session_number (int, sequential)
started_at (timestamptz)
ended_at (timestamptz, nullable)
current_scene (text, nullable)
active_players (jsonb, array of user_ids)
status (text, 'active'|'paused'|'completed')
session_notes (text, nullable)
created_at and updated_at (timestamptz)


Indexes on game_id and (game_id, status)
RLS policies:

Read: Game members can view sessions
Write: Only host/cohost can create/update




Task 2: Database Schema - Add narrative_events table
Create migration file: supabase/migrations/[timestamp]_add_narrative_events.sql
Requirements:

Table: narrative_events
Columns:

id (uuid, primary key)
session_id (uuid, foreign key to game_sessions)
game_id (uuid, foreign key to games)
event_number (int, sequential within session)
timestamp (timestamptz)
event_type (text: 'narration'|'player_action'|'decision'|'consequence'|'combat'|'rest')
narration (text, nullable)
player_action (text, nullable)
character_id (uuid, nullable, foreign key to characters)
decision_prompt (text, nullable)
available_options (jsonb, array of option objects)
chosen_option (int, nullable)
consequences (jsonb, array of consequence strings)
affected_characters (uuid[], array)
affected_locations (text[], array)
world_changes (jsonb, key-value changes)
dice_rolls (jsonb, array of roll objects)
mechanical_results (jsonb, stress/aspects/etc)
gm_notes (text, hidden from players)
created_at (timestamptz)


Indexes on (session_id, event_number), (game_id, timestamp DESC), character_id
RLS policies:

Read: Game members can view events
Insert: Only host/cohost can create events




Task 3: Database Schema - Add story_state table
Create migration file: supabase/migrations/[timestamp]_add_story_state.sql
Requirements:

Table: story_state
Columns:

id (uuid, primary key)
game_id (uuid, unique, foreign key to games)
Story progression:

current_act (text, default 'Act 1')
current_act_number (int, default 1)
current_beat_id (text, nullable)
act_progress (text: 'beginning'|'middle'|'climax'|'resolution')


Beat tracking:

act_beats_completed (text[], array of beat IDs)
key_info_revealed (text[], array of key info strings)


World state:

completed_hooks (text[], array of hook titles)
active_hooks (jsonb, array of hook objects with status)
emerging_hooks (jsonb, new hooks created during play)
world_facts (jsonb, key-value established facts)
location_states (jsonb, per-location state)
faction_standings (jsonb, faction reputation/status)


Relationships:

npc_states (jsonb, per-NPC attitude/notes/last_seen)
character_relationships (jsonb, PC-to-PC bond tracking)


Session tracking:

sessions_played (int, default 0)
estimated_sessions_remaining (int, nullable)
campaign_resolution_approaching (boolean, default false)
final_act_triggered (boolean, default false)


Divergence tracking:

divergence_log (jsonb, array of off-rails incidents)
adapted_beats (jsonb, beats completed via unexpected means)


Player choices:

major_decisions (jsonb, array of impactful decision objects)


Meta:

last_updated (timestamptz)
updated_by (uuid, nullable, foreign key to users)




Unique index on game_id
RLS policies:

Read: Game members can view state
Write: Only host/cohost can update state


Trigger: initialize_story_state() function that auto-creates story_state when game is created

Initializes with Act 1, empty arrays, empty objects




Task 4: Service - Game Context Loader
Create file: src/services/gameContextService.ts
Requirements:

Export interface GameContext with fields:

game, storyOverview, characters, storyState, recentEvents, currentSession, currentBeat


Function: loadGameContext(gameId: string, eventLimit: number = 20): Promise<GameContext>

Fetches game data
Fetches story overview via seed_id
Fetches approved characters for game
Fetches story_state
Fetches last N narrative_events (ordered by timestamp DESC, then reversed)
Fetches active session (if exists)
Returns complete context object


Function: getLastEvent(gameId: string)

Returns most recent narrative event


Function: getSessionEvents(sessionId: string)

Returns all events for a session, ordered by event_number


Function: loadCurrentBeat(gameId: string): Promise<any>

Gets current_beat_id from story_state
Fetches campaign_structure from story_overview
Finds and returns the beat object matching current_beat_id


Proper error handling with console.error logs


Task 5: Service - Session Management
Create file: src/services/sessionService.ts
Requirements:

Function: startSession(gameId: string): Promise<string>

Gets authenticated user
Calculates next session_number (finds max + 1)
Creates new game_session with status 'active'
If session_number === 1, calls generateOpeningScene()
Returns session ID


Function: resumeSession(gameId: string): Promise<{ session: any, recap: string } | null>

Finds active session for game
If none exists, returns null
If exists, generates recap and returns both


Function: pauseSession(sessionId: string): Promise<void>

Updates session status to 'paused'
Sets ended_at timestamp


Function: endSession(sessionId: string): Promise<void>

Updates session status to 'completed'
Sets ended_at timestamp


Function: generateSessionRecap(sessionId: string): Promise<string>

Fetches last 10 events from session
If no events, returns "You're at the start of your adventure"
Otherwise calls AI flow to generate recap (create separate flow for this)


Private function: generateOpeningScene(gameId: string, sessionId: string)

Loads game context
Calls AI flow to generate opening narration
Creates first narrative_event (event_number: 0) with opening narration




Task 6: Service - Narrative Engine
Create file: src/services/narrativeEngine.ts
Requirements:

Export interface NarrativeTurn with fields:

narration (string)
consequences (string[])
decisionPoint (object with prompt and options array)
stateChanges (object with worldFacts, locationStates, npcStates, characterRelationships, key_info_revealed, beat_completed, act_transition)
diceRolls (optional array)
gmNotes (string)


Main function: narrateTurn(gameId, sessionId, playerAction, characterId): Promise<NarrativeTurn>

Loads full game context including current beat
Calls AI flow for narration (pass context + current beat)
Saves narrative_event to database
Calls helper functions:

trackKeyInformationRevealed()
checkBeatCompletion()
checkActTransition()
updateStoryState()


Returns narrative


Helper: trackKeyInformationRevealed(gameId, narrative)

If narrative.stateChanges.key_info_revealed exists
Appends new key info to story_state.key_info_revealed array


Helper: checkBeatCompletion(gameId, narrative)

If narrative.stateChanges.beat_completed exists
Fetches campaign_structure to find next beat
Updates story_state: adds to act_beats_completed, sets current_beat_id to next


Helper: checkActTransition(gameId, narrative)

If narrative.stateChanges.act_transition exists
Fetches next act from campaign_structure
Updates story_state: new act_number, act title, first beat of new act, resets completed beats


Helper: updateStoryState(gameId, stateChanges)

Merges stateChanges into existing story_state (worldFacts, locationStates, etc.)
Uses JSON merging for nested objects


Helper: updateSessionTracking(gameId, sessionNumber)

Updates sessions_played count
Calculates estimated_sessions_remaining


Function: recordPlayerDecision(eventId, optionIndex)

Updates narrative_event with chosen_option value




Task 7: AI Flow - Intent Detection
Create file: src/ai/flows/detectIntent.ts
Requirements:

Export type IntentAnalysis with:

severity: 'normal' | 'minor-divergence' | 'major-divergence' | 'campaign-breaking'
confidence: number (0-1)
detectedIntent: string
reasoning: string
warningMessage?: string
suggestedAlternatives?: string[]
shouldWarn: boolean


Define Zod schema IntentAnalysisSchema matching above type
System prompt explaining classification levels:

NORMAL: Aligns with beat
MINOR-DIVERGENCE: Unexpected but workable
MAJOR-DIVERGENCE: Completely different direction
CAMPAIGN-BREAKING: Would end campaign


Function: detectIntent({ playerAction, currentBeat, storyState, characterName, recentEvents })

Builds user prompt with context (beat goal, approaches, recent events)
Calls callLlm() with:

System + user prompts
Temperature: 0.3 (consistent classification)
Max tokens: 500 (small response)
Policy: prefer fast models (gemini-2.0-flash-exp, gpt-4o-mini)


Parses JSON response (strip markdown if present)
Validates with Zod schema
Adds shouldWarn: true if severity is major or campaign-breaking
Returns IntentAnalysis


Error handling: On failure, return safe fallback (severity: 'normal', shouldWarn: false)


Task 8: AI Flow - Narrative Turn
Create file: src/ai/flows/narrateTurn.ts
Requirements:

Export type NarrativeTurn matching schema from Task 6
Define Zod schema NarrativeTurnSchema with all nested objects
System prompt file: Load from src/ai/prompts/gm/system.v1.md (create this)
User prompt template: Use src/ai/prompts/gm/narrate-turn.v1.hbs (create this)
Function: narrateTurn({ playerAction, characterId, context })

Finds acting character from context.characters
Loads system prompt from file
Renders user prompt template with all context data
Calls callLlm() with:

System + user prompts
Temperature: 0.7 (creative narration)
Max tokens: 2000 (detailed response)
Policy: prefer quality models (gemini-2.0-flash-exp, gpt-4o)


Parses JSON response (strip markdown)
Validates with Zod schema
Returns NarrativeTurn


Error handling: Log errors, throw with descriptive message


Task 9: AI Flow - Session Recap
Create file: src/ai/flows/generateRecap.ts
Requirements:

Export type SessionRecap with field: recap (string)
Simple system prompt: "You are a Game Master creating a session recap. Summarize key events in 3-5 paragraphs, highlighting: key moments, character development, plot progress, and cliffhangers."
Function: generateRecap({ events })

Builds user prompt with list of events (player actions, narrations, consequences)
Calls callLlm() with fast model
Returns recap string


Keep it simple - just narrative summary, no complex JSON


Task 10: AI Flow - Opening Scene
Create file: src/ai/flows/generateOpening.ts
Requirements:

Export type OpeningScene with fields: narration (string), options (array of option objects)
System prompt: "You are a Game Master starting a new campaign. Create an opening scene that: (1) Sets atmosphere and tone, (2) Introduces setting vividly, (3) Presents immediate hook, (4) Offers 3-4 initial action options. Return JSON with 'narration' and 'options' fields."
Function: generateOpening({ storyOverview, characters })

Builds user prompt with genre, setting, tone, hooks, character concepts
Calls callLlm() for opening scene
Parses JSON response
Returns OpeningScene


Options should be simple: {label, description} objects


Task 11: AI Prompt - GM System Prompt
Create file: src/ai/prompts/gm/system.v1.md
Requirements:
Full markdown file with sections:

Role: Expert AI Game Master running Fate Core game
Core Responsibilities: Narrate scenes (2-4 paragraphs), present choices (3-4 options), track consequences, maintain continuity, enable branching
Context Received: Story overview, story state, recent events (20), characters, player action
Output Requirements: Strict JSON structure with all required fields (narration, consequences, decisionPoint, stateChanges, diceRolls, gmNotes)
Branching Rules: Every option must be viable, consequences matter, multiple solutions exist, failure is interesting, build on past events
Fate Core Mechanics: Aspects, skills (+0 to +4), Fate dice (4dF), stress, compels
Tone & Atmosphere: Match campaign's pace/danger/morality/scale levers
Continuity Management: Check worldFacts before establishing new facts, reference npcStates, track characterRelationships, update locationStates
Campaign Structure & Pacing:

Track progress toward beats (check act_beats_completed/remaining)
Advance acts when completion criteria met
Build toward climax (escalate when 75% beats done)
Recognize end game (Act 3 mostly complete)
Session count awareness (accelerate if running long)


Beat Completion Signals: How to mark beat_completed, act_transition, endgame_approaching in stateChanges
Never Railroad: Beats guide but don't force; multiple paths to same goal valid
Off-Rails Handling:

Use "Yes-And" framework
Honor creative actions, show consequences
Introduce complications that tie back to story
Offer paths back without forcing
Recovery strategies: consequence loop, hidden connection, perspective shift, ally intervention, adaptation


Never Do / Always Do lists


Task 12: AI Prompt - Narrate Turn Template
Create file: src/ai/prompts/gm/narrate-turn.v1.hbs
Requirements:
Handlebars template with sections:

Story Context: Genre, setting, current act, tone
Active Story Hooks: List with status/progress
World State: List of world_facts
NPCs in Play: List with attitude/notes
Party: Each character with name, pronouns, concept, aspects, stress
Recent Events: Last 10 turns with turn number, action, narration, consequences
Last Decision Point: If exists, show prompt and options
Current Beat Structure:

Beat ID, title, description, challenge type
Setup text
Key information to reveal (mark which are revealed vs not)
Possible approaches
NPCs involved
Locations involved
Success/failure/partial outcomes
Leads to (next beats)


Campaign Progress: Current act X/3, beats completed/remaining, sessions played, estimated remaining
Off-Rails Detection: If flagged, show severity, reason, suggested recovery strategy
Current Player Action: Character name and action text
Your Task: Instructions to narrate outcome, reveal key info as appropriate, move toward outcomes, signal beat completion when done, stay flexible

Use Handlebars syntax: {{variable}}, {{#each array}}, {{#if condition}}

Task 13: UI Component - Intent Warning Dialog
Create file: src/components/IntentWarningDialog.tsx
Requirements:

React component using shadcn/ui Dialog
Props: isOpen, analysis (IntentAnalysis), playerAction, onConfirm, onCancel, onRevise
Display:

Icon based on severity (AlertTriangle for campaign-breaking, Lightbulb for major)
Title based on severity
Warning message from analysis
Show player's action in muted box
Show detected intent in muted box
Collapsible "Alternative Approaches" section with clickable suggestions


Buttons:

Confirm button (red/destructive for campaign-breaking, default for major)
Cancel button (outline)
Clicking alternative calls onRevise(alternativeText)


Styling: Use design system colors, responsive layout


Task 14: UI Component - Game Play Screen
Create file: src/components/GamePlayScreen.tsx
Requirements:

React component for main gameplay interface
State management:

session, context, currentNarration, currentOptions
playerAction, selectedCharacter, isNarrating
sessionRecap, intentAnalysis, showIntentWarning, pendingAction


On mount: Call loadGame() which loads context and checks for existing session
If no session: Show "Start Session" button
If session exists: Show full play interface
Interface sections:

Header: Game name, session number, act, Back/Pause buttons
Session Recap (if exists): Card with "Previously..." content
Party: Badge list of characters (clickable to select active character)
Current Narration: Card with narrative text (prose formatting)
Decision Options: Card with button list (if options exist)
Player Action Input: Textarea + Submit button


Action submission flow:

Call detectPlayerIntent() with context
If shouldWarn, show IntentWarningDialog
If confirmed or not warned, call narrateTurn() via executeAction()
Update UI with new narration and options


Intent Warning Dialog: Integrate IntentWarningDialog component with handlers
Loading states: Show spinner when narrating
Error handling: Toast notifications for errors


Task 15: Update Phase 1 Schema - Campaign Structure
Update file: src/ai/schemas/phase1.ts (or wherever Phase 1 story schema is)
Requirements:
Add campaignStructure object to StoryOverview schema with:

estimatedSessions (number): Total expected sessions
totalBeats (number): Count of all beats
acts (array): Each act object contains:

actNumber (number)
title (string)
description (string)
goal (string)
estimatedSessions (number)
beats (array): Each beat object contains:

id (string): e.g. "act1-beat1"
title (string)
description (string)
setup (string): How beat begins
possibleApproaches (string[]): Ways to tackle it
keyInformation (string[]): Must learn
npcsInvolved (string[])
locationsInvolved (string[])
challengeType (string)
estimatedScenes (number)
successOutcomes (string[])
failureOutcomes (string[])
partialOutcomes (string[])
leadsTo (string[]): Next beat IDs
optional (boolean)


climax (object):

title (string)
description (string)
trigger (string)
scene (string)




endGameConditions (object):

primaryVictory (object): condition, outcome
alternativeEndings (array): condition, outcome objects
failureConditions (array): condition, outcome objects


flexibilityNotes (string)

Update Phase 1 AI prompts to generate this structure (3 acts, 2-3 beats per act minimum)

Task 16: Update Phase 1 Prompts - Generate Campaign Structure
Update Phase 1 system and user prompts to include:
System prompt addition:

Instructions to generate complete 3-act campaign structure
Each act should have 2-4 beats
Each beat needs all required fields (setup, approaches, key info, outcomes)
Beats should flow logically (leadsTo connections)
Act 1: Investigation/setup (25-30% of campaign)
Act 2: Rising action/complications (40-50% of campaign)
Act 3: Climax/resolution (20-30% of campaign)

User prompt addition:

Request: "Generate a complete campaign structure with 3 acts and detailed beats"
Emphasize: "Each beat must have clear goals but flexible paths"
Remind: "This is a map, not a script - GMs improvise the journey"


Task 17: Update App Routing
Update file: src/App.tsx (or routing config)
Requirements:

Add route: /game/:gameId/play → GamePlayScreen component
Import GamePlayScreen
Ensure route is protected (requires auth)


Task 18: Add Play Button to Game Dashboard
Find existing game detail/dashboard component
Requirements:

Add "Play Session" or "Start Session" button
Button should navigate to /game/:gameId/play
Use Play icon from lucide-react
Position prominently in game actions area


Task 19: Update TypeScript Types
Update file: src/integrations/supabase/types.ts
Requirements:
Add type definitions for new tables:

game_sessions: Row, Insert, Update types with all columns
narrative_events: Row, Insert, Update types with all columns
story_state: Row, Insert, Update types with all columns
Relationships: Foreign key references where applicable


Task 20: Create Testing Checklist
Create file: TESTING.md
Requirements:
Markdown document with checklists for:

Database Tests: Tables created, RLS works, triggers work
Service Tests: Each function in gameContextService, sessionService, narrativeEngine
AI Flow Tests: Intent detection, narration, recap, opening
UI Tests: GamePlayScreen loads, actions submit, dialogs work
Integration Tests: Full game flow from start to multiple turns
AI Quality Tests: Narration quality, beat tracking, act transitions


📐 Implementation Order
Recommend this sequence:
Week 1: Foundation

Tasks 1-3: Database schema (can run in parallel)
Task 4: Game context service
Task 19: TypeScript types

Week 2: Core Logic

Task 5: Session service
Task 6: Narrative engine
Task 7: Intent detection flow
Task 8: Narrative turn flow

Week 3: AI & Content

Task 9-10: Recap and opening flows
Task 11-12: GM prompts (critical for quality)
Tasks 15-16: Phase 1 updates for campaign structure

Week 4: UI

Task 13: Intent warning dialog
Task 14: Game play screen
Tasks 17-18: Routing and navigation

Week 5: Testing

Task 20: Testing checklist
Run full integration tests
Fix bugs and iterate on prompts


🎯 Success Criteria
After implementation, you should be able to:

✅ Start a new game session from a generated story
✅ See opening narration with 3-4 decision options
✅ Submit player actions and get AI narration responses
✅ See decisions tracked in narrative_events table
✅ Have story_state update with consequences
✅ Pause session and resume later with recap
✅ Play across multiple sessions with continuity
✅ See beats complete and acts transition automatically
✅ Get warnings for off-rails actions before they execute
✅ Complete a full campaign from Act 1 to Act 3 resolution


💡 Notes for Claude CLI

All database work should include proper error handling
All services should use try/catch with console.error
All AI flows should have fallback behavior on errors
UI components should use shadcn/ui components consistently
Follow existing code style and patterns in the project
Use TypeScript strictly (no any types without good reason)
Add JSDoc comments to public functions
Test each piece before moving to next task

The goal is a working MVP where players can actually play a multi-session branching campaign with AI narration! 🎲✨