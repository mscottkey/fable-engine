export interface Phase4Context {
  overview: any;
  factions: any;
}

export interface Phase4Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase4Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string;
  feedback?: string;
  remixBrief?: string;
  preserveNouns?: boolean;
  currentData?: any;
  generateMicroScene?: boolean;
}
