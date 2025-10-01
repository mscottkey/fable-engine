export interface CharacterSeed {
  index: number;
  mode: 'respect' | 'suggest' | 'decide';
  displayName?: string;
  pronouns?: string;
  archetypePrefs?: string[];
  roleTagsInterest?: string[];
  toneComfort?: Record<string, number>;
  violenceComfort?: string;
  complexity?: string;
  mechanicsComfort?: string;
  concept?: string;
  mustHave?: string[];
  noThanks?: string[];
  keepName?: boolean;
}

export interface Phase2Context {
  overview: any; // Story overview from Phase 1
  seeds: CharacterSeed[];
  gameId: string;
}

export interface Phase2Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase2Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string; // For regen: character index or 'bonds'
  feedback?: string;
  remixBrief?: string;
  currentData?: any;
}
