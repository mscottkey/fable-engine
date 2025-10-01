export interface Phase1Context {
  seed: any; // Campaign seed data
}

export interface Phase1Options {
  userId: string;
  gameId: string | null;
  seedId: string;
  context: Phase1Context;
  type?: 'initial' | 'regen' | 'remix';
  section?: string; // For regen: 'expandedSetting', 'notableLocations', etc.
  feedback?: string;
  remixBrief?: string;
  preserveNouns?: boolean;
  currentData?: any;
}
