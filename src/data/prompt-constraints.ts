import { Genre } from './genres';
import type { DifficultyLabel } from '@/types/database';

export type PromptConstraints = {
  genre?: Genre;
  vibeHints: string[];
  tagHints: string[];
  namedNouns: string[];
  difficultyHint?: DifficultyLabel;
  requiredFragments: string[];
};

const VIBE_KEYWORDS = {
  'noir': ['noir', 'dark', 'gritty', 'shadowy', 'cynical'],
  'whimsical': ['whimsical', 'quirky', 'funny', 'lighthearted', 'comedic'],
  'grimdark': ['grimdark', 'brutal', 'harsh', 'unforgiving', 'bleak'],
  'neon': ['neon', 'bright', 'colorful', 'electric', 'vivid'],
  'mysterious': ['mysterious', 'enigmatic', 'cryptic', 'hidden', 'secret'],
  'heroic': ['heroic', 'noble', 'brave', 'valiant', 'epic'],
  'romantic': ['romantic', 'love', 'passion', 'relationship', 'courtly']
};

const TAG_KEYWORDS = {
  'heist': ['heist', 'robbery', 'steal', 'theft', 'burglary'],
  'investigation': ['investigation', 'detective', 'mystery', 'clues', 'solve'],
  'survival': ['survival', 'survive', 'wilderness', 'endure', 'harsh'],
  'intrigue': ['intrigue', 'politics', 'conspiracy', 'plot', 'scheme'],
  'exploration': ['exploration', 'discover', 'uncharted', 'journey', 'expedition'],
  'combat': ['combat', 'fight', 'battle', 'war', 'conflict'],
  'diplomacy': ['diplomacy', 'negotiate', 'peace', 'treaty', 'alliance'],
  'rescue': ['rescue', 'save', 'trapped', 'captive', 'hostage']
};

const DIFFICULTY_KEYWORDS = {
  'Easy': ['easy', 'simple', 'cozy', 'lighthearted', 'casual', 'relaxed'],
  'Hard': ['brutal', 'deadly', 'challenging', 'harsh', 'unforgiving', 'hardcore'],
  'Standard': ['standard', 'normal', 'balanced', 'moderate']
};

export function extractConstraintsFromPrompt(text: string): PromptConstraints {
  const lowerText = text.toLowerCase();
  const words = text.split(/\s+/);
  
  // Extract vibe hints
  const vibeHints: string[] = [];
  for (const [vibe, keywords] of Object.entries(VIBE_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      vibeHints.push(vibe);
    }
  }

  // Extract tag hints
  const tagHints: string[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      tagHints.push(tag);
    }
  }

  // Extract named nouns (capitalized phrases)
  const namedNouns: string[] = [];
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    const capitalizedPhrases = sentence.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    for (const phrase of capitalizedPhrases) {
      if (phrase.split(' ').length <= 3 && !phrase.match(/^(The|A|An|In|At|On|For|With|By)$/)) {
        namedNouns.push(phrase);
      }
    }
  }

  // Extract difficulty hint
  let difficultyHint: DifficultyLabel | undefined;
  for (const [difficulty, keywords] of Object.entries(DIFFICULTY_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      difficultyHint = difficulty as DifficultyLabel;
      break;
    }
  }

  // Extract required fragments (distinctive phrases)
  const requiredFragments: string[] = [];
  const phrases = text.match(/\b\w+\s+\w+(?:\s+\w+)?\b/g) || [];
  const distinctivePhrases = phrases
    .filter(phrase => 
      phrase.length > 10 && 
      phrase.length < 50 && 
      !phrase.toLowerCase().includes('want') &&
      !phrase.toLowerCase().includes('like') &&
      !phrase.toLowerCase().includes('adventure')
    )
    .slice(0, 3);
  
  requiredFragments.push(...distinctivePhrases);

  return {
    vibeHints: [...new Set(vibeHints)], // Remove duplicates
    tagHints: [...new Set(tagHints)],
    namedNouns: [...new Set(namedNouns.slice(0, 3))], // Max 3
    difficultyHint,
    requiredFragments: [...new Set(requiredFragments.slice(0, 2))] // Max 2
  };
}