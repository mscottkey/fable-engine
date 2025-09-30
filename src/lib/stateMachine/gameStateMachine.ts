// src/lib/stateMachine/gameStateMachine.ts

/**
 * Production-grade state machine for game lifecycle management
 * Ensures only valid state transitions occur and provides clear error messages
 */

export type GameStatus = 
  | 'draft'           // Story being created
  | 'story_review'    // Story awaiting approval
  | 'lobby'           // Players joining and setting up characters
  | 'characters'      // AI generating character lineup
  | 'char_review'     // Characters awaiting approval
  | 'playing'         // Active game session
  | 'paused'          // Game temporarily paused
  | 'completed'       // Game finished
  | 'abandoned';      // Game abandoned/deleted

export type PartySlotStatus =
  | 'empty'           // Available for claiming
  | 'reserved'        // User claimed but hasn't filled seed
  | 'ready'           // Seed completed, ready for generation
  | 'locked';         // Party locked, no more changes

export type CharacterStatus =
  | 'pending'         // Awaiting generation
  | 'generated'       // AI generated, not reviewed
  | 'approved'        // Player approved
  | 'rejected';       // Player rejected, needs regen

export type CampaignSeedStatus =
  | 'draft'           // User creating seed
  | 'story_generating'// AI generating story
  | 'story_generated' // Story created, awaiting review
  | 'story_approved'  // Story approved, game created
  | 'abandoned';      // Seed abandoned

// State transition definitions
const GAME_STATE_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  draft: ['story_review', 'abandoned'],
  story_review: ['lobby', 'draft', 'abandoned'],
  lobby: ['characters', 'abandoned'],
  characters: ['char_review', 'lobby', 'abandoned'],
  char_review: ['playing', 'characters', 'abandoned'],
  playing: ['paused', 'completed', 'abandoned'],
  paused: ['playing', 'completed', 'abandoned'],
  completed: [],
  abandoned: []
};

const SLOT_STATE_TRANSITIONS: Record<PartySlotStatus, PartySlotStatus[]> = {
  empty: ['reserved'],
  reserved: ['ready', 'empty'],
  ready: ['locked', 'reserved'],
  locked: []
};

const CHARACTER_STATE_TRANSITIONS: Record<CharacterStatus, CharacterStatus[]> = {
  pending: ['generated'],
  generated: ['approved', 'rejected'],
  approved: [],
  rejected: ['generated']
};

const SEED_STATE_TRANSITIONS: Record<CampaignSeedStatus, CampaignSeedStatus[]> = {
  draft: ['story_generating', 'abandoned'],
  story_generating: ['story_generated', 'draft', 'abandoned'],
  story_generated: ['story_approved', 'story_generating', 'abandoned'],
  story_approved: [],
  abandoned: []
};

// Error classes
export class InvalidStateTransitionError extends Error {
  constructor(
    public entityType: string,
    public currentState: string,
    public attemptedState: string,
    public allowedStates: string[]
  ) {
    super(
      `Invalid ${entityType} state transition: Cannot go from '${currentState}' to '${attemptedState}'. ` +
      `Allowed transitions: ${allowedStates.join(', ')}`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

// Validation functions
export function validateGameTransition(from: GameStatus, to: GameStatus): void {
  const allowed = GAME_STATE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new InvalidStateTransitionError('game', from, to, allowed);
  }
}

export function validateSlotTransition(from: PartySlotStatus, to: PartySlotStatus): void {
  const allowed = SLOT_STATE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new InvalidStateTransitionError('slot', from, to, allowed);
  }
}

export function validateCharacterTransition(from: CharacterStatus, to: CharacterStatus): void {
  const allowed = CHARACTER_STATE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new InvalidStateTransitionError('character', from, to, allowed);
  }
}

export function validateSeedTransition(from: CampaignSeedStatus, to: CampaignSeedStatus): void {
  const allowed = SEED_STATE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new InvalidStateTransitionError('seed', from, to, allowed);
  }
}

// Helper functions
export function canTransitionGame(from: GameStatus, to: GameStatus): boolean {
  const allowed = GAME_STATE_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function canTransitionSlot(from: PartySlotStatus, to: PartySlotStatus): boolean {
  const allowed = SLOT_STATE_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function getGameStatusLabel(status: GameStatus): string {
  const labels: Record<GameStatus, string> = {
    draft: 'Creating Story',
    story_review: 'Reviewing Story',
    lobby: 'In Lobby',
    characters: 'Generating Characters',
    char_review: 'Reviewing Characters',
    playing: 'In Session',
    paused: 'Paused',
    completed: 'Completed',
    abandoned: 'Abandoned'
  };
  return labels[status];
}

export function isGameActive(status: GameStatus): boolean {
  return ['lobby', 'characters', 'char_review', 'playing', 'paused'].includes(status);
}

export function isGameInSetup(status: GameStatus): boolean {
  return ['draft', 'story_review', 'lobby', 'characters', 'char_review'].includes(status);
}

export function canPlayersJoin(status: GameStatus): boolean {
  return status === 'lobby';
}

export function canModifyCharacterSeeds(status: GameStatus): boolean {
  return status === 'lobby';
}

export function canStartCharacterGeneration(status: GameStatus): boolean {
  return status === 'lobby';
}

export function canApproveCharacters(status: GameStatus): boolean {
  return status === 'char_review';
}

// State requirements validation
export interface GameStateRequirements {
  minReadySlots?: number;
  maxReadySlots?: number;
  mustHaveStory?: boolean;
  mustHaveCharacters?: boolean;
}

export function validateStateRequirements(
  targetState: GameStatus,
  requirements: {
    readySlotsCount: number;
    hasStory: boolean;
    hasCharacters: boolean;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const stateRequirements: Record<GameStatus, GameStateRequirements> = {
    draft: {},
    story_review: { mustHaveStory: false },
    lobby: { mustHaveStory: true },
    characters: { minReadySlots: 1, mustHaveStory: true },
    char_review: { minReadySlots: 1, mustHaveStory: true, mustHaveCharacters: true },
    playing: { minReadySlots: 1, mustHaveStory: true, mustHaveCharacters: true },
    paused: { minReadySlots: 1, mustHaveStory: true, mustHaveCharacters: true },
    completed: {},
    abandoned: {}
  };
  
  const reqs = stateRequirements[targetState];
  
  if (reqs.minReadySlots !== undefined && requirements.readySlotsCount < reqs.minReadySlots) {
    errors.push(`Requires at least ${reqs.minReadySlots} ready player(s)`);
  }
  
  if (reqs.maxReadySlots !== undefined && requirements.readySlotsCount > reqs.maxReadySlots) {
    errors.push(`Cannot have more than ${reqs.maxReadySlots} players`);
  }
  
  if (reqs.mustHaveStory && !requirements.hasStory) {
    errors.push('Story overview must be approved');
  }
  
  if (reqs.mustHaveCharacters && !requirements.hasCharacters) {
    errors.push('Characters must be generated and approved');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}