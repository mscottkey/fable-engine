import type { Phase5Options } from './types';
import { generateInitial, generateRegen, generateRemix } from './handlers';

export async function generatePhase5Arcs(options: Phase5Options) {
  const { type = 'initial' } = options;

  if (type === 'initial') return generateInitial(options);
  if (type === 'regen') return generateRegen(options);
  return generateRemix(options);
}
