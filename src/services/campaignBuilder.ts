import type { Genre, DifficultyLabel, CampaignSeedData } from '@/types/database';

// Simple campaign seed builder that generates deterministic content
export function buildCampaignSeed(
  genre: Genre,
  scenarioTitle: string,
  scenarioDescription: string,
  seed: number = Date.now()
): CampaignSeedData {
  // Use the seed to generate deterministic pseudo-random content
  const random = createSeededRandom(seed);
  
  const settingTemplates = {
    'Fantasy': ['mystical realm', 'ancient kingdom', 'magical forest', 'dragon-ruled empire'],
    'Sci-Fi': ['space station', 'alien planet', 'futuristic city', 'generation ship'],
    'Modern': ['metropolitan city', 'small town', 'corporate headquarters', 'university campus'],
    'Horror': ['abandoned mansion', 'haunted cemetery', 'isolated cabin', 'old hospital'],
    'Historical': ['medieval castle', 'frontier town', 'ancient city', 'trading port'],
    'Post-Apocalyptic': ['wasteland settlement', 'underground bunker', 'ruined city', 'survivor camp'],
    'Space Opera': ['galactic empire', 'rebel base', 'trading station', 'exploration vessel'],
    'Urban Fantasy': ['hidden magical district', 'supernatural nightclub', 'modern city with secrets', 'occult bookstore']
  };

  const locationTemplates = {
    'Fantasy': ['Enchanted Grove', 'Dragon\'s Lair', 'Wizard\'s Tower', 'Ancient Ruins', 'Mystical Lake'],
    'Sci-Fi': ['Research Lab', 'Cargo Bay', 'Command Center', 'Engine Room', 'Observation Deck'],
    'Modern': ['Corporate Office', 'City Park', 'Shopping Mall', 'Coffee Shop', 'University Library'],
    'Horror': ['Basement Morgue', 'Attic Storage', 'Garden Maze', 'Old Chapel', 'Forgotten Cellar'],
    'Historical': ['Royal Court', 'Market Square', 'Blacksmith Shop', 'Tavern', 'City Gates'],
    'Post-Apocalyptic': ['Scrap Yard', 'Supply Cache', 'Radio Tower', 'Shelter Entrance', 'Trading Post'],
    'Space Opera': ['Bridge', 'Hangar Bay', 'Medical Bay', 'Quarters', 'Engineering'],
    'Urban Fantasy': ['Magic Shop', 'Secret Sanctuary', 'Rooftop Garden', 'Underground Tunnel', 'Neutral Ground']
  };

  const vibeTemplates = {
    'Fantasy': ['epic and heroic', 'mysterious and magical', 'dark and perilous', 'whimsical and enchanting'],
    'Sci-Fi': ['cerebral and thought-provoking', 'action-packed and thrilling', 'dystopian and bleak', 'optimistic and exploratory'],
    'Modern': ['grounded and realistic', 'suspenseful and tense', 'dramatic and emotional', 'slice-of-life and relatable'],
    'Horror': ['terrifying and visceral', 'psychological and unsettling', 'gothic and atmospheric', 'survival and desperate'],
    'Historical': ['authentic and immersive', 'romanticized and adventurous', 'gritty and realistic', 'political and intrigue-filled'],
    'Post-Apocalyptic': ['bleak and desperate', 'hopeful rebuilding', 'brutal and unforgiving', 'mysterious and exploratory'],
    'Space Opera': ['epic and galaxy-spanning', 'political and tactical', 'adventurous and swashbuckling', 'dark and militaristic'],
    'Urban Fantasy': ['hidden world and secretive', 'action-packed and noir', 'whimsical and modern', 'dark and gritty']
  };
  const difficultyOptions: DifficultyLabel[] = ['Easy', 'Standard', 'Hard'];

  // Generate content
  const settings = settingTemplates[genre] || settingTemplates['Fantasy'];
  const locations = locationTemplates[genre] || locationTemplates['Fantasy'];
  const vibes = vibeTemplates[genre] || vibeTemplates['Fantasy'];

  const selectedSetting = settings[Math.abs(random()) % settings.length];
  const selectedLocations = shuffleArray([...locations], random).slice(0, 3 + (Math.abs(random()) % 3));
  const selectedVibe = vibes[Math.abs(random()) % vibes.length];
  const selectedDifficulty = difficultyOptions[Math.abs(random()) % difficultyOptions.length];
  
  const hooks = [
    `A mysterious ${genre.toLowerCase()} threat emerges`,
    `An important ${genre.toLowerCase()} artifact goes missing`,
    `A powerful ${genre.toLowerCase()} ally requests help`
  ];

  return {
    genre,
    scenarioTitle,
    scenarioDescription,
    seed,
    name: scenarioTitle,
    setting: `A ${selectedSetting} where ${scenarioDescription.toLowerCase()}`,
    notableLocations: selectedLocations,
    toneVibe: selectedVibe,
    toneLevers: {
      pace: ['Fast', 'Moderate', 'Slow'][random() % 3],
      danger: ['Low', 'Medium', 'High'][random() % 3],
      morality: ['Clear', 'Ambiguous', 'Complex'][random() % 3],
      scale: ['Personal', 'Local', 'Epic'][random() % 3],
    },
    difficultyLabel: selectedDifficulty,
    difficultyDesc: getDifficultyDescription(selectedDifficulty),
    hooks,
  };
}

function createSeededRandom(seed: number) {
  let currentSeed = seed;
  return () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed;
  };
}

function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = random() % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDifficultyDescription(difficulty: DifficultyLabel): string {
  switch (difficulty) {
    case 'Easy':
      return 'Straightforward challenges, perfect for new players';
    case 'Standard':
      return 'Balanced difficulty with moderate challenges';
    case 'Hard':
      return 'Complex scenarios requiring strategic thinking';
    default:
      return 'Balanced difficulty with moderate challenges';
  }
}