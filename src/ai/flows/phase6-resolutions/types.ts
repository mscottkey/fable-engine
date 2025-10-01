export interface Phase6Context {
  overview: any;
  factions: any;
  nodes: any;
  arcs: any;
}

export interface Phase6Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase6Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string;
  feedback?: string;
  remixBrief?: string;
  currentData?: any;
}
