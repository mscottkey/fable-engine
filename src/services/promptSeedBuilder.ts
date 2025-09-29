import type { Genre } from '@/data/genres';
import type { PromptConstraints } from '@/data/prompt-constraints';
import type { CampaignSeedData, DifficultyLabel } from '@/types/database';

interface BuildSeedFromPromptParams {
  userText: string;
  genre: Genre;
  constraints: PromptConstraints;
  seed?: number;
}

// Extended location templates with bias support
const LOCATION_TEMPLATES = {
  'Fantasy': [
    'Enchanted Grove', 'Dragon\'s Lair', 'Wizard\'s Tower', 'Ancient Ruins', 'Mystical Lake',
    'Royal Court', 'Forbidden Library', 'Crystal Caverns', 'Floating Islands', 'Sacred Temple'
  ],
  'Sci-Fi': [
    'Research Lab', 'Cargo Bay', 'Command Center', 'Engine Room', 'Observation Deck',
    'Hydroponics Bay', 'Medical Ward', 'Shuttle Hangar', 'Data Core', 'Reactor Chamber'
  ],
  'Modern': [
    'Corporate Office', 'City Park', 'Shopping Mall', 'Coffee Shop', 'University Library',
    'Police Station', 'Hospital', 'News Studio', 'Art Gallery', 'Sports Arena'
  ],
  'Horror': [
    'Basement Morgue', 'Attic Storage', 'Garden Maze', 'Old Chapel', 'Forgotten Cellar',
    'Abandoned Asylum', 'Haunted Cemetery', 'Dark Forest', 'Cursed Manor', 'Secret Catacombs'
  ],
  'Historical': [
    'Royal Court', 'Market Square', 'Blacksmith Shop', 'Tavern', 'City Gates',
    'Cathedral', 'Harbor', 'Guild Hall', 'Castle Keep', 'Village Green'
  ],
  'Post-Apocalyptic': [
    'Scrap Yard', 'Supply Cache', 'Radio Tower', 'Shelter Entrance', 'Trading Post',
    'Abandoned Mall', 'Water Purifier', 'Rooftop Garden', 'Underground Tunnel', 'Fuel Depot'
  ],
  'Space Opera': [
    'Bridge', 'Hangar Bay', 'Medical Bay', 'Quarters', 'Engineering',
    'Diplomatic Suite', 'War Room', 'Training Deck', 'Cantina', 'Prison Block'
  ],
  'Urban Fantasy': [
    'Magic Shop', 'Secret Sanctuary', 'Rooftop Garden', 'Underground Tunnel', 'Neutral Ground',
    'Supernatural Nightclub', 'Hidden Library', 'Mystic Cafe', 'Portal Hub', 'Council Chamber'
  ],
  'Cyberpunk': [
    'Data Haven', 'Neon Alley', 'Corporate Tower', 'Underground Market', 'Hacker Den',
    'Augment Clinic', 'Virtual Arcade', 'Sky Bridge', 'Megacity Slums', 'Neural Network Hub'
  ],
  'Steampunk': [
    'Airship Dock', 'Clockwork Factory', 'Steam Tunnels', 'Inventor\'s Workshop', 'Brass Foundry',
    'Mechanical Garden', 'Steam Train Station', 'Gear Assembly Hall', 'Coal Processing Plant', 'Automaton Theater'
  ]
};

const VIBE_TEMPLATES = {
  'noir': 'dark and atmospheric with shadowy undertones',
  'whimsical': 'lighthearted and quirky with unexpected humor',
  'grimdark': 'harsh and unforgiving with brutal realities',
  'neon': 'bright and electric with vivid colors',
  'mysterious': 'enigmatic and cryptic with hidden secrets',
  'heroic': 'noble and inspiring with epic undertones',
  'romantic': 'passionate and emotional with relationship drama'
};

const HOOK_TEMPLATES = {
  'heist': ['A valuable target presents the perfect opportunity', 'Security weaknesses create an opening', 'Inside information reveals the right moment'],
  'investigation': ['Strange clues point to a deeper mystery', 'A witness comes forward with crucial information', 'Evidence emerges that changes everything'],
  'survival': ['Resources become critically scarce', 'The environment turns hostile', 'Safe shelter becomes compromised'],
  'intrigue': ['Political alliances shift unexpectedly', 'Secret information changes the game', 'Hidden agendas come to light'],
  'exploration': ['Uncharted territory beckons with promise', 'Ancient maps reveal forgotten locations', 'New discoveries challenge assumptions'],
  'combat': ['Forces gather for inevitable conflict', 'A strategic advantage appears', 'Enemy movements threaten stability'],
  'diplomacy': ['Negotiations reach a critical juncture', 'Peaceful solutions become possible', 'Rival factions seek mediation'],
  'rescue': ['Someone important falls into danger', 'Time runs short for those in peril', 'A daring rescue plan takes shape']
};

function createSeededRandom(seed: number) {
  let currentSeed = seed;
  return () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed;
  };
}

function biasedSelect<T>(items: T[], biasItems: T[], random: () => number, biasFactor: number = 2): T {
  const weightedItems: T[] = [];
  
  for (const item of items) {
    const weight = biasItems.includes(item) ? biasFactor : 1;
    for (let i = 0; i < weight; i++) {
      weightedItems.push(item);
    }
  }
  
  return weightedItems[random() % weightedItems.length];
}

function createCustomLocation(namedNoun: string, genre: Genre): string {
  const templates = {
    'Fantasy': `The ${namedNoun} - an ancient place of power`,
    'Sci-Fi': `${namedNoun} Station - a critical facility`,
    'Modern': `${namedNoun} Building - a significant landmark`,
    'Horror': `The ${namedNoun} - a place best avoided`,
    'Historical': `${namedNoun} - a location of importance`,
    'Post-Apocalyptic': `${namedNoun} Ruins - remnants of the old world`,
    'Space Opera': `${namedNoun} Sector - a strategic region`,
    'Urban Fantasy': `The ${namedNoun} - where worlds intersect`,
    'Cyberpunk': `${namedNoun} Complex - a corporate stronghold`,
    'Steampunk': `${namedNoun} Works - a marvel of engineering`
  };
  
  return templates[genre] || `The ${namedNoun} - a place of significance`;
}

export function buildSeedFromPrompt({
  userText,
  genre,
  constraints,
  seed = Date.now()
}: BuildSeedFromPromptParams): CampaignSeedData {
  // Create deterministic RNG from text + constraints + seed
  const hashInput = userText + genre + JSON.stringify(constraints) + seed;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const random = createSeededRandom(Math.abs(hash));
  
  // Generate title from genre-appropriate name bank
  const titlePrefixes = ['The', 'Chronicles of', 'Tales of', 'Legends of', 'Saga of'];
  const titleSuffixes = {
    'Fantasy': ['Kingdom', 'Realm', 'Quest', 'Prophecy', 'Crown'],
    'Sci-Fi': ['Galaxy', 'Station', 'Protocol', 'Matrix', 'Frontier'],
    'Modern': ['Operation', 'Network', 'Initiative', 'Project', 'Syndicate'],
    'Horror': ['Nightmare', 'Curse', 'Haunting', 'Terror', 'Madness'],
    'Historical': ['Empire', 'Dynasty', 'Revolution', 'Conquest', 'Legacy'],
    'Post-Apocalyptic': ['Wasteland', 'Survivors', 'Exodus', 'Refuge', 'Dawn'],
    'Space Opera': ['Empire', 'Rebellion', 'Alliance', 'War', 'Federation'],
    'Urban Fantasy': ['Covenant', 'Conclave', 'Masquerade', 'Awakening', 'Circle']
  };
  
  const prefix = titlePrefixes[random() % titlePrefixes.length];
  const suffix = titleSuffixes[genre] || titleSuffixes['Fantasy'];
  const chosenSuffix = suffix[random() % suffix.length];
  const title = `${prefix} ${chosenSuffix}`;
  
  // Generate setting with constraint bias
  const settingTemplates = {
    'Fantasy': 'a mystical realm', 'Sci-Fi': 'a futuristic world', 'Modern': 'a contemporary setting',
    'Horror': 'a place of dread', 'Historical': 'a period of change', 'Post-Apocalyptic': 'a shattered world',
    'Space Opera': 'a galactic civilization', 'Urban Fantasy': 'a city of hidden magic',
    'Cyberpunk': 'a neon-soaked dystopia', 'Steampunk': 'a steam-powered society'
  };
  
  let setting = `Set in ${settingTemplates[genre] || 'an extraordinary world'}`;
  
  // Echo a required fragment if available
  if (constraints.requiredFragments.length > 0) {
    const fragment = constraints.requiredFragments[random() % constraints.requiredFragments.length];
    setting += `, where ${fragment.toLowerCase()}.`;
  } else {
    setting += `, where adventure awaits those brave enough to seek it.`;
  }
  
  // Generate locations with custom location from named nouns
  const locations: string[] = [];
  const availableLocations = LOCATION_TEMPLATES[genre] || LOCATION_TEMPLATES['Fantasy'];
  
  // Add one custom location if we have named nouns
  if (constraints.namedNouns.length > 0) {
    const namedNoun = constraints.namedNouns[random() % constraints.namedNouns.length];
    locations.push(createCustomLocation(namedNoun, genre));
  }
  
  // Fill remaining with biased selections based on tag hints
  const targetLocationCount = 4 + (random() % 3); // 4-6 total
  const biasLocations = availableLocations.filter(loc => 
    constraints.tagHints.some(tag => loc.toLowerCase().includes(tag))
  );
  
  while (locations.length < targetLocationCount) {
    const selected = biasedSelect(availableLocations, biasLocations, random);
    if (!locations.includes(selected)) {
      locations.push(selected);
    }
  }
  
  // Generate tone and vibe
  let toneVibe = 'atmospheric and engaging';
  if (constraints.vibeHints.length > 0) {
    const vibe = constraints.vibeHints[random() % constraints.vibeHints.length];
    toneVibe = VIBE_TEMPLATES[vibe] || toneVibe;
  }
  
  // Generate tone levers
  const paceOptions = ['Fast', 'Moderate', 'Slow'];
  const dangerOptions = ['Low', 'Medium', 'High'];
  const moralityOptions = ['Clear', 'Ambiguous', 'Complex'];
  const scaleOptions = ['Personal', 'Local', 'Epic'];
  
  // Bias levers based on vibe hints
  const toneLevers = {
    pace: paceOptions[random() % paceOptions.length],
    danger: constraints.vibeHints.includes('grimdark') ? 'High' : 
            constraints.vibeHints.includes('whimsical') ? 'Low' :
            dangerOptions[random() % dangerOptions.length],
    morality: constraints.vibeHints.includes('noir') ? 'Ambiguous' :
              constraints.vibeHints.includes('heroic') ? 'Clear' :
              moralityOptions[random() % moralityOptions.length],
    scale: scaleOptions[random() % scaleOptions.length]
  };
  
  // Determine difficulty
  const difficulty = constraints.difficultyHint || 'Standard';
  const difficultyDescs = {
    'Easy': 'Straightforward challenges, perfect for new players',
    'Standard': 'Balanced difficulty with moderate challenges', 
    'Hard': 'Complex scenarios requiring strategic thinking'
  };
  
  // Generate hooks with tag bias
  const hooks: string[] = [];
  const targetHookCount = 3 + (random() % 3); // 3-5 hooks
  
  // Add hooks based on tag hints
  for (const tag of constraints.tagHints) {
    if (HOOK_TEMPLATES[tag] && hooks.length < targetHookCount) {
      const tagHooks = HOOK_TEMPLATES[tag];
      const selectedHook = tagHooks[random() % tagHooks.length];
      if (!hooks.includes(selectedHook)) {
        hooks.push(selectedHook);
      }
    }
  }
  
  // Fill remaining with generic hooks
  const genericHooks = [
    'An unexpected opportunity presents itself',
    'Ancient secrets begin to surface', 
    'Powerful forces take notice',
    'The status quo faces disruption',
    'Hidden connections become apparent'
  ];
  
  while (hooks.length < targetHookCount) {
    const selected = genericHooks[random() % genericHooks.length];
    if (!hooks.includes(selected)) {
      hooks.push(selected);
    }
  }
  
  return {
    genre: genre as any, // Type assertion needed for database enum
    scenarioTitle: title,
    scenarioDescription: userText,
    seed,
    name: title,
    setting,
    notableLocations: locations,
    toneVibe,
    toneLevers,
    difficultyLabel: difficulty,
    difficultyDesc: difficultyDescs[difficulty],
    hooks
  };
}