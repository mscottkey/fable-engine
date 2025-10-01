import type { Phase2Options } from './types';
import { generateInitial, generateRegen, generateRemix } from './handlers';

export async function generatePhase2Characters(options: Phase2Options) {
  const { type = 'initial' } = options;

  if (type === 'initial') return generateInitial(options);
  if (type === 'regen') return generateRegen(options);
  return generateRemix(options);
}
