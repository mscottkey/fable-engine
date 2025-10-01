import type { Phase4Options } from './types';
import { generateInitial, generateRegenNode, generateRegenScene, generateRemix } from './handlers';

export async function generatePhase4Nodes(options: Phase4Options) {
  const { type = 'initial', generateMicroScene } = options;

  if (type === 'initial') {
    return generateInitial(options);
  }

  if (type === 'regen') {
    if (generateMicroScene) return generateRegenScene(options);
    return generateRegenNode(options);
  }

  return generateRemix(options);
}
