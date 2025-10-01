export interface Phase3Context {
  overview: any;
  lineup: any;
}

export interface Phase3Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase3Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string;
  feedback?: string;
  remixBrief?: string;
  preserveNouns?: boolean;
  currentData?: any;
}
