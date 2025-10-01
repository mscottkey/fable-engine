import type { Phase6Options } from './types';
import { generateInitial, generateRegen, generateRemix } from './handlers';

export async function generatePhase6Resolutions(options: Phase6Options) {
  const { type = 'initial' } = options;

  if (type === 'initial') return generateInitial(options);
  if (type === 'regen') return generateRegen(options);
  return generateRemix(options);
}

export default generatePhase6Resolutions;
