import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Sparkles, Dice6 } from "lucide-react";
import { Genre, GENRE_SCENARIOS, randomScenarioFor, type Scenario } from "@/data/genres";
import { detectGenreFromText } from "@/data/gm-quotes";
import { AIGMAvatar } from "@/components/AIGMAvatar";

interface Character {
  id: string;
  playerName: string;
  characterName: string;
  concept: string;
}

interface AdventureStarterProps {
  onStartGame: (characters: Character[], gameIdea: string) => void;
}

export function AdventureStarter({ onStartGame }: AdventureStarterProps) {
  const [gameIdea, setGameIdea] = useState("");
  const [detectedGenre, setDetectedGenre] = useState<Genre | 'generic'>('generic');
  
  // Initialize with random scenario for each genre
  const [genreScenarios, setGenreScenarios] = useState<Record<Genre, Scenario>>(() => {
    const initial: Record<Genre, Scenario> = {} as Record<Genre, Scenario>;
    Object.values(Genre).forEach(genre => {
      initial[genre] = randomScenarioFor(genre);
    });
    return initial;
  });

  const regenerateScenario = (genre: Genre) => {
    const currentScenario = genreScenarios[genre];
    const newScenario = randomScenarioFor(genre, currentScenario.title);
    setGenreScenarios(prev => ({
      ...prev,
      [genre]: newScenario
    }));
  };

  // Detect genre from user input
  const handleGameIdeaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGameIdea(value);
    
    if (value.length > 3) {
      const detected = detectGenreFromText(value);
      setDetectedGenre(detected);
    } else {
      setDetectedGenre('generic');
    }
  };

  const handleQuickStart = (scenario: Scenario) => {
    // For quick start, create default characters
    const defaultCharacters: Character[] = [
      { id: "1", playerName: "Player 1", characterName: "Character 1", concept: "Determined hero" },
      { id: "2", playerName: "Player 2", characterName: "Character 2", concept: "Clever ally" },
    ];
    onStartGame(defaultCharacters, scenario.description);
  };

  const handleCustomStart = () => {
    if (!gameIdea.trim()) return;
    
    // For custom start, create default characters
    const defaultCharacters: Character[] = [
      { id: "1", playerName: "Player 1", characterName: "Character 1", concept: "Determined hero" },
      { id: "2", playerName: "Player 2", characterName: "Character 2", concept: "Clever ally" },
    ];
    onStartGame(defaultCharacters, gameIdea);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
            Start Your
            <span className="text-primary block">Adventure</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose from curated scenarios or describe your own adventure. 
            Our AI gamemaster will bring your story to life.
          </p>
        </div>

        {/* Custom Game Idea */}
        <Card className="max-w-2xl mx-auto border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create Your Own Adventure
            </CardTitle>
            <CardDescription>
              Describe any game idea and we'll create a custom experience for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI GM Avatar with Speech Bubble */}
            <div className="flex justify-center">
              <AIGMAvatar genre={detectedGenre} className="max-w-md" />
            </div>
            
            {/* Input and Button */}
            <div className="flex gap-3">
              <Input
                placeholder="I want to play a space detective mystery..."
                value={gameIdea}
                onChange={handleGameIdeaChange}
                className="flex-1 text-center"
              />
              <Button 
                variant="crimson" 
                onClick={handleCustomStart}
                disabled={!gameIdea.trim()}
                className="px-8"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Options */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Or Choose a Quick Start
            </h2>
            <p className="text-muted-foreground">
              Jump right into one of these popular adventure types
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.values(Genre).map((genre) => {
              const scenario = genreScenarios[genre];
              return (
                <Card
                  key={genre}
                  className="cursor-pointer transition-all duration-300 hover:scale-105 border-border bg-card/50 backdrop-blur-sm hover:bg-card/70 hover:border-primary/50"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-primary">
                        {genre}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateScenario(genre);
                        }}
                        className="h-8 w-8 hover:bg-primary/10"
                        title="Regenerate scenario"
                      >
                        <Dice6 className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-md">{scenario.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="leading-relaxed text-sm">
                      {scenario.description}
                    </CardDescription>
                    
                    <div className="flex flex-wrap gap-2">
                      {scenario.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      onClick={() => handleQuickStart(scenario)}
                    >
                      Start Adventure
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}