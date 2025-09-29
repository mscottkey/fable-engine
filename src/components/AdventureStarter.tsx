import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Sparkles, Sword, Heart, Zap, Crown, Shield, Skull } from "lucide-react";

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

  const quickStartOptions = [
    {
      title: "Neon-Fantasy Heist",
      description: "High-tech magic meets criminal underworld in a cyberpunk metropolis",
      tags: ["Cyberpunk", "Fantasy", "Crime"],
      icon: Zap,
      color: "text-purple-400",
    },
    {
      title: "Royal Court Intrigue",
      description: "Navigate deadly politics and ancient secrets in a medieval kingdom",
      tags: ["Medieval", "Politics", "Mystery"],
      icon: Crown,
      color: "text-amber-400",
    },
    {
      title: "Apocalypse Survivors", 
      description: "Band together to survive in a world overrun by supernatural threats",
      tags: ["Horror", "Survival", "Modern"],
      icon: Skull,
      color: "text-red-400",
    },
    {
      title: "Space Station Crisis",
      description: "Solve mysteries and prevent disaster aboard a remote space outpost",
      tags: ["Sci-Fi", "Mystery", "Space"],
      icon: Shield,
      color: "text-blue-400",
    },
    {
      title: "Dungeon Delvers",
      description: "Classic fantasy adventure in ancient ruins filled with treasure and danger",
      tags: ["Fantasy", "Adventure", "Classic"],
      icon: Sword,
      color: "text-green-400",
    },
    {
      title: "Romantic Adventure",
      description: "Love blooms amid danger in a swashbuckling tale of adventure",
      tags: ["Romance", "Adventure", "Drama"],
      icon: Heart,
      color: "text-pink-400",
    },
  ];

  const handleQuickStart = (option: typeof quickStartOptions[0]) => {
    // For quick start, create default characters
    const defaultCharacters: Character[] = [
      { id: "1", playerName: "Player 1", characterName: "Character 1", concept: "Determined hero" },
      { id: "2", playerName: "Player 2", characterName: "Character 2", concept: "Clever ally" },
    ];
    onStartGame(defaultCharacters, option.description);
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
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="I want to play a space detective mystery..."
                value={gameIdea}
                onChange={(e) => setGameIdea(e.target.value)}
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickStartOptions.map((option, index) => (
              <Card
                key={index}
                className="cursor-pointer transition-all duration-300 hover:scale-105 border-border bg-card/50 backdrop-blur-sm hover:bg-card/70 hover:border-primary/50"
                onClick={() => handleQuickStart(option)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <option.icon className={`w-6 h-6 ${option.color}`} />
                    <div className="flex gap-1">
                      {option.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {option.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}