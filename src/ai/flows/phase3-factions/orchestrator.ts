import type { Phase3Options } from './types';
import { generateInitial, generateRegen, generateRemix } from './handlers';

export async function generatePhase3Factions(options: Phase3Options) {
  const { type = 'initial' } = options;

  if (type === 'initial') return generateInitial(options);
  if (type === 'regen') return generateRegen(options);
  return generateRemix(options);
}
