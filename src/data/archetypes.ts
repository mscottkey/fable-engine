import { Genre } from '@/data/genres';

export interface ArchetypeSet {
  [key: string]: string[];
}

export const GENRE_ARCHETYPES: Record<Genre, string[]> = {
  [Genre.Fantasy]: [
    'Knight', 'Ranger', 'Mystic', 'Trickster', 'Scholar', 'Tinker', 'Face', 'Scout'
  ],
  [Genre.SciFi]: [
    'Pilot', 'Engineer', 'Operative', 'Diplomat', 'Scientist', 'Mystic', 'Hacker', 'Marshal'
  ],
  [Genre.Modern]: [
    'Detective', 'Specialist', 'Face', 'Hacker', 'Medic', 'Driver', 'Investigator', 'Fixer'
  ],
  [Genre.Horror]: [
    'Occultist', 'Investigator', 'Protector', 'Skeptic', 'Healer', 'Scout', 'Medium', 'Fixer'
  ],
  [Genre.Historical]: [
    'Scholar', 'Warrior', 'Diplomat', 'Artisan', 'Explorer', 'Merchant', 'Noble', 'Commoner'
  ],
  [Genre.PostApoc]: [
    'Scavenger', 'Warrior', 'Medic', 'Tinker', 'Scout', 'Leader', 'Survivor', 'Trader'
  ],
  [Genre.SpaceOpera]: [
    'Captain', 'Pilot', 'Engineer', 'Diplomat', 'Soldier', 'Scientist', 'Smuggler', 'Mystic'
  ],
  [Genre.UrbanFantasy]: [
    'Mage', 'Hunter', 'Detective', 'Fixer', 'Scholar', 'Hacker', 'Face', 'Guardian'
  ],
  [Genre.Cyberpunk]: [
    'Netrunner', 'Solo', 'Techie', 'Media', 'Nomad', 'Corporate', 'Fixer', 'Rockerboy'
  ],
  [Genre.Steampunk]: [
    'Inventor', 'Explorer', 'Aristocrat', 'Engineer', 'Adventurer', 'Scholar', 'Rogue', 'Soldier'
  ]
};

export const ROLE_TAGS = [
  'Investigation',
  'Support', 
  'Frontline',
  'Social',
  'Stealth',
  'Tech',
  'Magic',
  'Wildcard'
];

export const VIOLENCE_COMFORT_OPTIONS = [
  { value: 'low', label: 'Low - Minimal violence, focus on consequences' },
  { value: 'med', label: 'Medium - Standard RPG violence, not gratuitous' },
  { value: 'high', label: 'High - Graphic combat and violence is fine' }
];

export const COMPLEXITY_OPTIONS = [
  { value: 'rules-light', label: 'Rules Light - Simple mechanics, narrative focus' },
  { value: 'standard', label: 'Standard - Balanced rules and roleplay' },
  { value: 'crunchy', label: 'Crunchy - Complex mechanics, tactical depth' }
];

export const MECHANICS_COMFORT_OPTIONS = [
  { value: 'newbie', label: 'Newbie - New to RPGs, need guidance' },
  { value: 'familiar', label: 'Familiar - Some RPG experience' },
  { value: 'expert', label: 'Expert - Experienced with complex systems' }
];