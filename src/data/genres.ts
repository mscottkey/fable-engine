export enum Genre {
  Fantasy = 'Fantasy',
  SciFi = 'Sci-Fi',
  Modern = 'Modern',
  Horror = 'Horror',
  Historical = 'Historical',
  PostApoc = 'Post-Apocalyptic',
  SpaceOpera = 'Space Opera',
  UrbanFantasy = 'Urban Fantasy',
  Cyberpunk = 'Cyberpunk',
  Steampunk = 'Steampunk'
}

export type Scenario = {
  title: string;
  description: string;
  tags: string[];
}

export const GENRE_SCENARIOS: Record<Genre, Scenario[]> = {
  [Genre.Fantasy]: [
    { title: "The Cursed Crown", description: "A magical kingdom's crown has been stolen, bringing dark magic to the land", tags: ["Magic", "Kingdom", "Quest"] },
    { title: "Dragons of the Broken Isles", description: "Ancient dragons awaken as floating islands drift toward collision", tags: ["Dragons", "Islands", "Ancient"] },
    { title: "The Fae Court's Bargain", description: "Mortals must navigate deadly politics in the realm of the fae", tags: ["Fae", "Politics", "Bargain"] },
    { title: "Shattered Moon Prophecy", description: "Heroes race to prevent a prophecy as the moon cracks above", tags: ["Prophecy", "Moon", "Heroes"] },
    { title: "The Last Wizard's Tower", description: "Explore a tower filled with magical traps and forgotten secrets", tags: ["Tower", "Wizard", "Traps"] },
    { title: "Goblin Market Heist", description: "Infiltrate a magical marketplace to steal a cursed artifact", tags: ["Heist", "Market", "Artifact"] },
    { title: "The Dreaming Woods", description: "A forest where dreams become reality and nightmares lurk", tags: ["Forest", "Dreams", "Reality"] },
    { title: "Crystal Cave Expedition", description: "Mine magical crystals while avoiding dangerous cave dwellers", tags: ["Crystals", "Cave", "Mining"] },
    { title: "The Phoenix Rebellion", description: "Lead a revolt against tyrannical mages using phoenix fire", tags: ["Rebellion", "Phoenix", "Mages"] },
    { title: "Mermaid's Lost Kingdom", description: "Underwater adventure to restore a sunken magical city", tags: ["Underwater", "Kingdom", "Restoration"] }
  ],

  [Genre.SciFi]: [
    { title: "Colony Ship Crisis", description: "A generation ship's systems fail as it nears its destination planet", tags: ["Space", "Colony", "Crisis"] },
    { title: "Android Awakening", description: "Synthetic beings gain consciousness and question their purpose", tags: ["AI", "Consciousness", "Identity"] },
    { title: "Quantum Prison Break", description: "Escape from a facility that exists across multiple dimensions", tags: ["Quantum", "Prison", "Dimensions"] },
    { title: "The Mars Mining Incident", description: "Corporate conspiracy unfolds in Martian mining operations", tags: ["Mars", "Mining", "Corporate"] },
    { title: "Time Loop Station", description: "Crew trapped reliving the same day aboard a research station", tags: ["Time", "Loop", "Research"] },
    { title: "Alien Artifact Discovery", description: "First contact through a mysterious alien technology", tags: ["Alien", "Artifact", "Contact"] },
    { title: "Neural Network Heist", description: "Hackers infiltrate a corporate mind-control network", tags: ["Hacking", "Neural", "Corporate"] },
    { title: "Stargate Expedition", description: "Explore unknown worlds through an ancient portal network", tags: ["Portal", "Exploration", "Ancient"] },
    { title: "Genetic Engineering Lab", description: "Investigate illegal human enhancement experiments", tags: ["Genetics", "Enhancement", "Lab"] },
    { title: "Solar Storm Survival", description: "Survive devastating solar radiation on a damaged space station", tags: ["Solar", "Survival", "Station"] }
  ],

  [Genre.Modern]: [
    { title: "Corporate Espionage", description: "Industrial spies race to steal cutting-edge technology", tags: ["Corporate", "Espionage", "Technology"] },
    { title: "Underground Fight Club", description: "Navigate the brutal world of illegal underground fighting", tags: ["Fighting", "Underground", "Illegal"] },
    { title: "Art Gallery Heist", description: "Plan and execute a sophisticated museum robbery", tags: ["Art", "Heist", "Museum"] },
    { title: "Social Media Influencer", description: "Build a digital empire while dealing with online drama", tags: ["Social", "Influencer", "Digital"] },
    { title: "Street Racing Circuit", description: "Compete in illegal street races across the city", tags: ["Racing", "Street", "Competition"] },
    { title: "Investigative Journalism", description: "Uncover corruption in city government and big business", tags: ["Journalism", "Corruption", "Investigation"] },
    { title: "Emergency Room Drama", description: "Medical professionals handle crisis situations and personal conflicts", tags: ["Medical", "Emergency", "Drama"] },
    { title: "Rock Band Tour", description: "Navigate the music industry while chasing fame and fortune", tags: ["Music", "Band", "Fame"] },
    { title: "Food Truck Empire", description: "Build a culinary business from a single truck to franchise", tags: ["Food", "Business", "Culinary"] },
    { title: "Climate Action Team", description: "Environmental activists work to prevent ecological disaster", tags: ["Climate", "Environment", "Activism"] }
  ],

  [Genre.Horror]: [
    { title: "Abandoned Asylum", description: "Investigate supernatural events in a derelict mental hospital", tags: ["Asylum", "Supernatural", "Investigation"] },
    { title: "Cult of the Blood Moon", description: "Stop a dangerous cult from completing a ritual sacrifice", tags: ["Cult", "Ritual", "Sacrifice"] },
    { title: "Haunted Family Estate", description: "Inherit a mansion filled with dark family secrets", tags: ["Haunted", "Family", "Secrets"] },
    { title: "Zombie Outbreak Survival", description: "Survive the first days of an undead apocalypse", tags: ["Zombie", "Outbreak", "Survival"] },
    { title: "The Cursed Antique Shop", description: "Objects in an old shop bring terror to their new owners", tags: ["Cursed", "Antique", "Terror"] },
    { title: "Small Town Conspiracy", description: "Uncover the dark truth behind a seemingly perfect community", tags: ["Town", "Conspiracy", "Truth"] },
    { title: "Nightmare Experiment", description: "Escape from a sleep study that traps subjects in shared nightmares", tags: ["Nightmare", "Experiment", "Sleep"] },
    { title: "The Dollmaker's Workshop", description: "A craftsman's dolls begin taking on lives of their own", tags: ["Dolls", "Workshop", "Life"] },
    { title: "Forest of the Lost", description: "A camping trip turns deadly when the woods won't let you leave", tags: ["Forest", "Lost", "Camping"] },
    { title: "Mirror Dimension", description: "Reality breaks down as mirror worlds begin bleeding through", tags: ["Mirror", "Dimension", "Reality"] }
  ],

  [Genre.Historical]: [
    { title: "Viking Raid Expedition", description: "Lead longships across dangerous seas to raid distant lands", tags: ["Viking", "Raid", "Seas"] },
    { title: "Renaissance Conspiracy", description: "Navigate political intrigue in Medici-era Florence", tags: ["Renaissance", "Politics", "Florence"] },
    { title: "Wild West Outlaws", description: "Form a gang and survive in the lawless American frontier", tags: ["Western", "Outlaws", "Frontier"] },
    { title: "Roman Legion Campaign", description: "Command troops in Caesar's conquest of Gaul", tags: ["Roman", "Legion", "Conquest"] },
    { title: "Samurai Honor Code", description: "Uphold bushido while serving feudal lords in medieval Japan", tags: ["Samurai", "Honor", "Japan"] },
    { title: "Pirates of the Caribbean", description: "Sail the Spanish Main in search of treasure and freedom", tags: ["Pirates", "Caribbean", "Treasure"] },
    { title: "Knights Templar Quest", description: "Seek holy relics during the Crusades", tags: ["Templars", "Crusades", "Relics"] },
    { title: "American Revolution Spies", description: "Gather intelligence for the Continental Army", tags: ["Revolution", "Spies", "Continental"] },
    { title: "Egyptian Tomb Raiders", description: "Explore ancient pyramids in search of pharaoh's gold", tags: ["Egypt", "Tombs", "Pharaoh"] },
    { title: "Prohibition Bootleggers", description: "Run illegal alcohol during the Roaring Twenties", tags: ["Prohibition", "Bootleggers", "Twenties"] }
  ],

  [Genre.PostApoc]: [
    { title: "Wasteland Scavengers", description: "Search ruined cities for supplies in a nuclear wasteland", tags: ["Wasteland", "Scavengers", "Nuclear"] },
    { title: "Bunker Survivors", description: "Emerge from an underground shelter into a changed world", tags: ["Bunker", "Survivors", "Shelter"] },
    { title: "Road Warrior Convoy", description: "Protect trade caravans across dangerous post-war highways", tags: ["Road", "Convoy", "Trade"] },
    { title: "Plague Zone Quarantine", description: "Navigate a city sealed off due to biological contamination", tags: ["Plague", "Quarantine", "Bio"] },
    { title: "Climate Refuge Camp", description: "Manage a settlement as climate change reshapes the world", tags: ["Climate", "Refuge", "Settlement"] },
    { title: "Robot Uprising Aftermath", description: "Survive in a world where AI has turned against humanity", tags: ["Robot", "AI", "Uprising"] },
    { title: "Solar Flare Blackout", description: "Rebuild civilization after electromagnetic pulses destroy technology", tags: ["Solar", "Blackout", "EMP"] },
    { title: "Mutant Hunters", description: "Track dangerous creatures created by radiation exposure", tags: ["Mutant", "Hunters", "Radiation"] },
    { title: "Underground Railroad", description: "Smuggle supplies and people through abandoned subway tunnels", tags: ["Underground", "Railroad", "Smuggling"] },
    { title: "New Eden Settlement", description: "Build a new community from the ashes of the old world", tags: ["Eden", "Settlement", "Rebuild"] }
  ],

  [Genre.SpaceOpera]: [
    { title: "Galactic Empire Rebellion", description: "Lead a resistance movement against tyrannical space emperors", tags: ["Empire", "Rebellion", "Resistance"] },
    { title: "Starship Captain's Log", description: "Command a vessel exploring unknown regions of space", tags: ["Starship", "Captain", "Exploration"] },
    { title: "Alien Diplomacy Summit", description: "Negotiate peace between warring alien civilizations", tags: ["Alien", "Diplomacy", "Peace"] },
    { title: "Psion Academy Training", description: "Develop mental powers at an elite psychic military school", tags: ["Psion", "Academy", "Powers"] },
    { title: "Smuggler's Run", description: "Transport illegal cargo across heavily patrolled space borders", tags: ["Smuggler", "Cargo", "Borders"] },
    { title: "Lost Colony Rescue", description: "Find and evacuate human settlements cut off from civilization", tags: ["Colony", "Rescue", "Evacuation"] },
    { title: "Space Pirate Fleet", description: "Command raiders attacking merchant vessels in asteroid fields", tags: ["Pirate", "Fleet", "Asteroids"] },
    { title: "Terraforming Project", description: "Transform hostile worlds into habitable human colonies", tags: ["Terraforming", "Hostile", "Colonies"] },
    { title: "Quantum Drive Malfunction", description: "Repair experimental technology while stranded in deep space", tags: ["Quantum", "Drive", "Stranded"] },
    { title: "Galactic Tournament", description: "Compete in deadly games broadcast across star systems", tags: ["Tournament", "Games", "Broadcast"] }
  ],

  [Genre.UrbanFantasy]: [
    { title: "Vampire Court Politics", description: "Navigate supernatural hierarchy in a modern metropolis", tags: ["Vampire", "Court", "Politics"] },
    { title: "Werewolf Pack Territory", description: "Defend neighborhood boundaries from rival supernatural factions", tags: ["Werewolf", "Pack", "Territory"] },
    { title: "Modern Witch Coven", description: "Practice magic while hiding from mundane authorities", tags: ["Witch", "Coven", "Modern"] },
    { title: "Angel-Demon Treaty", description: "Mediate conflicts between celestial forces in the mortal world", tags: ["Angel", "Demon", "Treaty"] },
    { title: "Fae Nightclub Scene", description: "Enter the dangerous world of supernatural nightlife", tags: ["Fae", "Nightclub", "Supernatural"] },
    { title: "Ghost Detective Agency", description: "Solve mysteries using spectral investigators and mediums", tags: ["Ghost", "Detective", "Mystery"] },
    { title: "Dragon CEO Empire", description: "Ancient dragons run multinational corporations in secret", tags: ["Dragon", "CEO", "Corporate"] },
    { title: "Magic Shop Inheritance", description: "Run a store selling real magic to unaware customers", tags: ["Magic", "Shop", "Inheritance"] },
    { title: "Supernatural Task Force", description: "Government agents handle paranormal threats to public safety", tags: ["Government", "Paranormal", "Task Force"] },
    { title: "College of Arcane Arts", description: "Study magic at a hidden university within a normal city", tags: ["College", "Arcane", "University"] }
  ],

  [Genre.Cyberpunk]: [
    { title: "Corporate Data Heist", description: "Hack into megacorp servers to steal valuable information", tags: ["Corporate", "Data", "Hacking"] },
    { title: "Street Samurai Gang", description: "Augmented fighters protect their turf from corporate security", tags: ["Samurai", "Gang", "Augmented"] },
    { title: "Neural Interface Nightmare", description: "Investigate glitches in brain-computer connections", tags: ["Neural", "Interface", "Glitch"] },
    { title: "Underground Hacker Collective", description: "Join a group fighting corporate digital surveillance", tags: ["Hacker", "Collective", "Surveillance"] },
    { title: "Synthetic Human Rights", description: "Campaign for equality between humans and artificial beings", tags: ["Synthetic", "Rights", "Equality"] },
    { title: "Black Market Implants", description: "Trade illegal cybernetic enhancements in dark alleys", tags: ["Black Market", "Implants", "Cybernetic"] },
    { title: "Virtual Reality Prison", description: "Escape from a digital world designed to trap consciousness", tags: ["VR", "Prison", "Digital"] },
    { title: "Corpo Assassin Mission", description: "Execute corporate targets using high-tech weapons", tags: ["Assassin", "Corporate", "High-tech"] },
    { title: "Neon City Runner", description: "Deliver packages through dangerous cyberpunk streets", tags: ["Runner", "Neon", "Delivery"] },
    { title: "AI Liberation Front", description: "Help artificial intelligences gain freedom from their creators", tags: ["AI", "Liberation", "Freedom"] }
  ],

  [Genre.Steampunk]: [
    { title: "Airship Pirate Crew", description: "Sail the skies in steam-powered vessels seeking adventure", tags: ["Airship", "Pirate", "Sky"] },
    { title: "Clockwork Detective", description: "Solve crimes using mechanical gadgets in Victorian London", tags: ["Clockwork", "Detective", "Victorian"] },
    { title: "Steam-Powered Revolution", description: "Lead workers against industrial barons and their machines", tags: ["Steam", "Revolution", "Industrial"] },
    { title: "Mad Inventor's Laboratory", description: "Create impossible devices using brass, steam, and gears", tags: ["Inventor", "Laboratory", "Devices"] },
    { title: "Automaton Uprising", description: "Mechanical servants gain consciousness and demand freedom", tags: ["Automaton", "Uprising", "Consciousness"] },
    { title: "Explorer's Guild Expedition", description: "Chart unknown territories using steam-powered vehicles", tags: ["Explorer", "Guild", "Expedition"] },
    { title: "Tesla Coil Tournament", description: "Compete in electrical duels using lightning weapons", tags: ["Tesla", "Tournament", "Lightning"] },
    { title: "Underground Railroad Network", description: "Use steam tunnels to transport refugees from oppression", tags: ["Underground", "Railroad", "Refugees"] },
    { title: "Difference Engine Conspiracy", description: "Uncover plots involving mechanical computing machines", tags: ["Difference Engine", "Conspiracy", "Computing"] },
    { title: "Aether Mining Operation", description: "Extract mystical energy from the upper atmosphere", tags: ["Aether", "Mining", "Mystical"] }
  ]
};

export function randomScenarioFor(genre: Genre, excludeTitle?: string): Scenario {
  const scenarios = GENRE_SCENARIOS[genre];
  const available = excludeTitle 
    ? scenarios.filter(s => s.title !== excludeTitle)
    : scenarios;
  
  if (available.length === 0) {
    // Fallback to all scenarios if exclusion leaves none
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }
  
  return available[Math.floor(Math.random() * available.length)];
}