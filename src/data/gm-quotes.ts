import { Genre } from './genres';

export const GM_QUOTES: Record<Genre | 'generic', string[]> = {
  generic: [
    "So, what tale shall we weave today?",
    "Every great adventure begins with a single idea...",
    "The dice are eager to roll. What story calls to you?",
    "I sense a grand adventure brewing in your mind.",
    "Tell me, traveler, what world shall we bring to life?",
    "The veil between imagination and reality grows thin...",
    "Your story awaits. Speak, and I shall make it so."
  ],

  [Genre.Fantasy]: [
    "Steel your sword, traveler, the realm awaits.",
    "Magic stirs in the ancient woods... do you feel it?",
    "Dragons slumber, but not for long. What awakens them?",
    "The old gods whisper of prophecies yet unfulfilled.",
    "Kingdoms rise and fall on the edge of a blade.",
    "Even the smallest spark can ignite great magic.",
    "Legend speaks of heroes who dare to dream..."
  ],

  [Genre.SciFi]: [
    "Engage thrusters — destiny lies among the stars.",
    "The future is unwritten, but technology shapes all.",
    "Quantum possibilities stretch infinite before us.",
    "What wonders await in the void between worlds?",
    "Progress demands sacrifice. Are you ready to pay it?",
    "The universe is vast, but human ambition is boundless.",
    "Reality bends to those who master time and space."
  ],

  [Genre.Modern]: [
    "The city never sleeps, and neither do its secrets.",
    "Fortune favors the bold in this concrete jungle.",
    "Every street corner holds a story worth telling.",
    "Power moves in boardrooms and back alleys alike.",
    "The digital age has its own kind of magic.",
    "Heroes aren't born, they're forged by circumstance.",
    "Truth is stranger than fiction in modern times."
  ],

  [Genre.Horror]: [
    "Do you hear that? Best not look behind you...",
    "Some doors should never be opened, yet here we are.",
    "The shadows grow longer when fear takes hold.",
    "Sanity is such a fragile thing, don't you think?",
    "What lurks in darkness often reflects our deepest fears.",
    "Terror has a way of revealing who we truly are.",
    "The veil grows thin when nightmares bleed into reality..."
  ],

  [Genre.Historical]: [
    "History is written by those brave enough to make it.",
    "The past holds lessons for those wise enough to listen.",
    "Honor and glory await in ages long past.",
    "Every era has its heroes and villains. Which are you?",
    "Time may pass, but human nature remains unchanged.",
    "The echoes of the past shape the present moment.",
    "Ancient wisdom guides modern souls."
  ],

  [Genre.PostApoc]: [
    "From ashes, new worlds are born. What will yours become?",
    "Survival requires both courage and cunning.",
    "The old world is gone, but hope endures.",
    "In the wasteland, only the adaptable thrive.",
    "Every scrap of civilization is precious now.",
    "When everything falls apart, true character emerges.",
    "The future belongs to those who dare rebuild."
  ],

  [Genre.SpaceOpera]: [
    "Across the galaxy, epic sagas unfold among the stars.",
    "Empires clash while heroes forge their own destiny.",
    "The cosmos beckons with infinite adventure.",
    "Honor transcends species when the stakes are galactic.",
    "Even in the vastness of space, courage lights the way.",
    "Legendary tales echo across a thousand worlds.",
    "The universe is stage for the grandest of dramas."
  ],

  [Genre.UrbanFantasy]: [
    "Magic hides in plain sight among city lights.",
    "The supernatural world coexists with the mundane.",
    "Ancient powers adapt to modern times.",
    "Every coffee shop could hide a portal to elsewhere.",
    "The old ways persist beneath urban facades.",
    "Mystical forces flow through concrete and steel.",
    "Reality has more layers than most dare imagine."
  ],

  [Genre.Cyberpunk]: [
    "In neon dreams, humanity and technology merge.",
    "The future is now, but who controls the code?",
    "Chrome and flesh dance to digital rhythms.",
    "Information is the ultimate currency in this age.",
    "The net connects all, but freedom remains elusive.",
    "Enhancement comes at the cost of humanity.",
    "In the electric underground, revolution sparks."
  ],

  [Genre.Steampunk]: [
    "Brass gears and steam power fuel impossible dreams.",
    "Victorian ingenuity meets mechanical wonder.",
    "The age of invention knows no bounds.",
    "Clockwork hearts beat with copper passion.",
    "Progress marches forward on iron rails.",
    "Steam and steel forge the future's foundation.",
    "In this gilded age, imagination becomes reality."
  ]
};

export function getRandomQuote(genre: Genre | 'generic' = 'generic'): string {
  const quotes = GM_QUOTES[genre];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function detectGenreFromText(text: string): Genre | 'generic' {
  const keywords: Record<Genre, string[]> = {
    [Genre.Fantasy]: ['dragon', 'magic', 'sword', 'castle', 'wizard', 'knight', 'quest', 'kingdom', 'elf', 'dwarf'],
    [Genre.SciFi]: ['space', 'alien', 'robot', 'future', 'laser', 'spaceship', 'colony', 'android', 'quantum'],
    [Genre.Modern]: ['city', 'corporate', 'business', 'street', 'urban', 'contemporary', 'crime', 'police'],
    [Genre.Horror]: ['ghost', 'zombie', 'monster', 'haunted', 'scary', 'nightmare', 'dark', 'evil', 'cult'],
    [Genre.Historical]: ['medieval', 'ancient', 'viking', 'roman', 'samurai', 'pirate', 'cowboy', 'revolution'],
    [Genre.PostApoc]: ['wasteland', 'nuclear', 'apocalypse', 'survivor', 'ruins', 'mutant', 'fallout', 'disaster'],
    [Genre.SpaceOpera]: ['galactic', 'empire', 'starship', 'captain', 'rebellion', 'admiral', 'fleet'],
    [Genre.UrbanFantasy]: ['vampire', 'werewolf', 'witch', 'supernatural', 'paranormal', 'nightclub'],
    [Genre.Cyberpunk]: ['cyber', 'hacker', 'neural', 'neon', 'corporate', 'implant', 'matrix', 'virtual'],
    [Genre.Steampunk]: ['steam', 'clockwork', 'brass', 'victorian', 'airship', 'mechanical', 'invention']
  };

  const lowerText = text.toLowerCase();
  
  for (const [genre, words] of Object.entries(keywords)) {
    if (words.some(word => lowerText.includes(word))) {
      return genre as Genre;
    }
  }
  
  return 'generic';
}