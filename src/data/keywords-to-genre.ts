import { Genre } from './genres';

export const KEYWORDS_TO_GENRE: Array<{ genre: Genre; keywords: string[] }> = [
  {
    genre: Genre.Fantasy,
    keywords: ['castle', 'knight', 'dragon', 'wizard', 'kingdom', 'rune', 'prophecy', 'magic', 'sword', 'spell', 'enchanted', 'mystical', 'realm', 'quest', 'adventure', 'tavern', 'guild', 'mage', 'sorcerer', 'dungeon', 'artifact', 'legend', 'forest', 'elves', 'dwarves', 'orcs']
  },
  {
    genre: Genre.SciFi,
    keywords: ['starship', 'reactor', 'orbital', 'android', 'hyperspace', 'megacorp', 'space', 'alien', 'technology', 'robot', 'cybernetic', 'station', 'colony', 'laser', 'plasma', 'quantum', 'warp', 'galaxy', 'planet', 'federation', 'empire', 'synthetic', 'neural', 'biotech']
  },
  {
    genre: Genre.Horror,
    keywords: ['haunted', 'ritual', 'occult', 'asylum', 'eldritch', 'cursed', 'nightmare', 'demon', 'ghost', 'undead', 'zombie', 'vampire', 'cult', 'sacrifice', 'blood', 'darkness', 'terror', 'fear', 'madness', 'sanity', 'evil', 'possession', 'supernatural']
  },
  {
    genre: Genre.UrbanFantasy,
    keywords: ['hidden magic', 'ward', 'masquerade', 'cabal', 'ley line', 'supernatural', 'modern magic', 'city', 'urban', 'secret', 'paranormal', 'occult', 'witches', 'vampires', 'werewolves', 'fae', 'angels', 'demons', 'council', 'covenant', 'underground']
  },
  {
    genre: Genre.PostApoc,
    keywords: ['wasteland', 'bunker', 'scavenger', 'fallout', 'raider', 'survivor', 'ruins', 'nuclear', 'apocalypse', 'mutation', 'radiation', 'shelter', 'settlement', 'abandoned', 'desolate', 'chaos', 'pandemic', 'collapse', 'resource', 'trade']
  },
  {
    genre: Genre.SpaceOpera,
    keywords: ['fleet', 'admiral', 'alien empires', 'warp', 'sector', 'galactic', 'rebellion', 'emperor', 'starfighter', 'cruiser', 'diplomatic', 'treaty', 'war', 'alliance', 'senate', 'republic', 'federation', 'armada', 'hyperspace', 'civilization']
  },
  {
    genre: Genre.Modern,
    keywords: ['heist', 'agency', 'black ops', 'syndicate', 'newsroom', 'corporate', 'technology', 'internet', 'hacker', 'spy', 'investigation', 'police', 'crime', 'business', 'urban', 'contemporary', 'realistic', 'thriller', 'action']
  },
  {
    genre: Genre.Historical,
    keywords: ['regency', 'renaissance', 'legion', 'empire', 'caravan', 'medieval', 'ancient', 'colonial', 'victorian', 'napoleonic', 'crusade', 'dynasty', 'pharaoh', 'samurai', 'viking', 'pirate', 'revolution', 'nobility', 'peasant', 'merchant']
  },
  {
    genre: Genre.Cyberpunk,
    keywords: ['cyberpunk', 'neon', 'hacker', 'corporate', 'augmentation', 'neural', 'matrix', 'virtual', 'street', 'punk', 'tech', 'dystopian', 'megacity', 'implant', 'data', 'network', 'resistance', 'underground']
  },
  {
    genre: Genre.Steampunk,
    keywords: ['steampunk', 'airship', 'clockwork', 'steam', 'brass', 'gear', 'Victorian', 'industrial', 'inventor', 'mechanical', 'automaton', 'coal', 'engine', 'goggles', 'dirigible', 'factory']
  }
];

export function detectGenreFromKeywords(text: string): Genre | null {
  const lowerText = text.toLowerCase();
  const genreScores: Array<{ genre: Genre; score: number }> = [];

  for (const { genre, keywords } of KEYWORDS_TO_GENRE) {
    const score = keywords.reduce((count, keyword) => {
      return count + (lowerText.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    
    if (score > 0) {
      genreScores.push({ genre, score });
    }
  }

  // Sort by score descending, return highest if above threshold
  genreScores.sort((a, b) => b.score - a.score);
  
  if (genreScores.length > 0 && genreScores[0].score >= 2) {
    return genreScores[0].genre;
  }

  return null;
}