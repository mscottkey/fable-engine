import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Minus, 
  User, 
  Sparkles,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

interface Character {
  id: string;
  playerName: string;
  characterName: string;
  concept: string;
}

interface GameSetupProps {
  onStartGame: (gameData: {
    gameIdea: string;
    characters: Character[];
  }) => void;
  onBack: () => void;
  initialGameIdea?: string;
}

export function GameSetup({ onStartGame, onBack, initialGameIdea = '' }: GameSetupProps) {
  const [step, setStep] = useState(1);
  const [gameIdea, setGameIdea] = useState(initialGameIdea);
  const [playerCount, setPlayerCount] = useState(2);
  const [characters, setCharacters] = useState<Character[]>([
    {
      id: '1',
      playerName: '',
      characterName: '',
      concept: ''
    },
    {
      id: '2', 
      playerName: '',
      characterName: '',
      concept: ''
    }
  ]);

  const updateCharacter = (id: string, field: keyof Character, value: string) => {
    setCharacters(chars => chars.map(char => 
      char.id === id ? { ...char, [field]: value } : char
    ));
  };

  const adjustPlayerCount = (delta: number) => {
    const newCount = Math.max(1, Math.min(6, playerCount + delta));
    setPlayerCount(newCount);
    
    if (newCount > characters.length) {
      const newChars = [...characters];
      for (let i = characters.length; i < newCount; i++) {
        newChars.push({
          id: String(i + 1),
          playerName: '',
          characterName: '',
          concept: ''
        });
      }
      setCharacters(newChars);
    } else {
      setCharacters(characters.slice(0, newCount));
    }
  };

  const canProceedToStep2 = gameIdea.trim().length > 0;
  const canStartGame = characters.every(char => 
    char.playerName.trim() && char.characterName.trim() && char.concept.trim()
  );

  const handleStartGame = () => {
    onStartGame({
      gameIdea,
      characters: characters.slice(0, playerCount)
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card/20 to-primary/5 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Game Setup</h1>
          </div>
          <div className="flex items-center justify-center gap-4 mb-6">
            <Badge variant={step === 1 ? "default" : "secondary"} className="px-4 py-2">
              1. Game Concept
            </Badge>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <Badge variant={step === 2 ? "default" : "secondary"} className="px-4 py-2">
              2. Characters
            </Badge>
          </div>
        </div>

        {step === 1 && (
          <Card className="p-8 bg-card/70 backdrop-blur-sm border-primary/20">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">What kind of adventure do you want?</h2>
                <p className="text-muted-foreground">
                  Describe the setting, genre, or story concept you'd like to explore
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gameIdea">Game Concept</Label>
                <Input
                  id="gameIdea"
                  placeholder="A cyberpunk heist in a neon-lit city, or Victorian investigators solving supernatural mysteries..."
                  value={gameIdea}
                  onChange={(e) => setGameIdea(e.target.value)}
                  className="text-center"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  variant="mystical" 
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                >
                  Next: Create Characters
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Player Count */}
            <Card className="p-6 bg-card/70 backdrop-blur-sm border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Number of Players</h3>
                    <p className="text-sm text-muted-foreground">How many people will be playing?</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustPlayerCount(-1)}
                    disabled={playerCount <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-xl font-semibold w-8 text-center">{playerCount}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustPlayerCount(1)}
                    disabled={playerCount >= 6}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Character Creation */}
            <div className="grid gap-6">
              {characters.slice(0, playerCount).map((character, index) => (
                <Card key={character.id} className="p-6 bg-card/50 backdrop-blur-sm border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Player {index + 1}</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`player-${character.id}`}>Player Name *</Label>
                      <Input
                        id={`player-${character.id}`}
                        placeholder="Your name"
                        value={character.playerName}
                        onChange={(e) => updateCharacter(character.id, 'playerName', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`character-${character.id}`}>Character Name *</Label>
                      <Input
                        id={`character-${character.id}`}
                        placeholder="Character's name"
                        value={character.characterName}
                        onChange={(e) => updateCharacter(character.id, 'characterName', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`concept-${character.id}`}>Character Concept *</Label>
                      <Input
                        id={`concept-${character.id}`}
                        placeholder="Cybernetic Street Samurai, Bookish Wizard, Rogue Space Pilot..."
                        value={character.concept}
                        onChange={(e) => updateCharacter(character.id, 'concept', e.target.value)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                variant="mystical" 
                onClick={handleStartGame}
                disabled={!canStartGame}
              >
                Start Adventure
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}