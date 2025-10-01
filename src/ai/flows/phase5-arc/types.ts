export interface Phase5Context {
  overview: any;
  factions: any;
  nodes: any;
}

export interface Phase5Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase5Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string;
  feedback?: string;
  remixBrief?: string;
  currentData?: any;
}
