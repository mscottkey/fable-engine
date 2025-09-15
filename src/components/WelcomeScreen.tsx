import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dice6, 
  Sparkles, 
  BookOpen, 
  Zap, 
  PlayCircle,
  ArrowRight
} from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

interface WelcomeScreenProps {
  onStartGame: () => void;
}

export function WelcomeScreen({ onStartGame }: WelcomeScreenProps) {
  const [gameIdea, setGameIdea] = useState('');

  const quickStartOptions = [
    {
      title: "Neon Fantasy Heist",
      description: "Cyberpunk magic meets fantasy thieves in a glittering metropolis",
      tags: ["Modern", "Magic", "Heist"]
    },
    {
      title: "Haunted Manor Mystery", 
      description: "Victorian investigators explore a supernatural mansion",
      tags: ["Horror", "Investigation", "Victorian"]
    },
    {
      title: "Space Station Crisis",
      description: "Sci-fi survival aboard a failing orbital facility",
      tags: ["Sci-Fi", "Survival", "Space"]
    },
    {
      title: "Medieval Kingdom Quest",
      description: "Classic fantasy adventure in a troubled realm",
      tags: ["Fantasy", "Adventure", "Medieval"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card/20 to-primary/5">
      {/* Hero Section */}
      <div 
        className="relative h-[60vh] flex items-center justify-center bg-cover bg-center"
        style={{ 
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${heroImage})` 
        }}
      >
        <div className="text-center space-y-6 max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Dice6 className="w-16 h-16 text-primary animate-pulse" />
              <Sparkles className="w-6 h-6 text-accent absolute -top-2 -right-2 animate-bounce" />
            </div>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary-glow via-accent to-primary bg-clip-text text-transparent">
            RoleplAI GM
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/90 font-medium">
            Your AI Gamemaster for Immersive Tabletop Adventures
          </p>
          
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Story First, Rules Invisible. Experience the magic of tabletop RPGs 
            with an AI that handles the mechanics while you focus on the adventure.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <Zap className="w-4 h-4 mr-2" />
              Frictionless Entry
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <BookOpen className="w-4 h-4 mr-2" />
              Story-Driven Play
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <Dice6 className="w-4 h-4 mr-2" />
              Rules Engine (Fate Core)
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Your Adventure
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Describe what you want to play, or choose from our curated scenarios
            </p>
          </div>

          {/* Custom Game Input */}
          <Card className="p-8 mb-8 bg-card/70 backdrop-blur-sm border-primary/20">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Create Your Own Adventure</h3>
              <div className="flex gap-3 max-w-2xl mx-auto">
                <Input
                  placeholder="I want to play a neon-fantasy heist..."
                  value={gameIdea}
                  onChange={(e) => setGameIdea(e.target.value)}
                  className="flex-1 text-center"
                />
                <Button 
                  variant="mystical" 
                  onClick={onStartGame}
                  className="px-8"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Playing
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                The AI will create a world, characters, and opening scene based on your idea
              </p>
            </div>
          </Card>

          {/* Quick Start Options */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickStartOptions.map((option, index) => (
              <Card 
                key={index} 
                className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group bg-card/50 backdrop-blur-sm border-border hover:border-primary/50"
                onClick={onStartGame}
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {option.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {option.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center text-sm text-primary group-hover:translate-x-1 transition-transform">
                    Start Adventure
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Features Section */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold mb-8">Why RoleplAI GM?</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold">Instant Play</h4>
                <p className="text-muted-foreground">
                  No prep time, no complex setup. Just describe what you want and start playing immediately.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-lg font-semibold">Story Focus</h4>
                <p className="text-muted-foreground">
                  Pure narrative experience. The AI handles rules quietly while you focus on your character's story.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary-glow/20 rounded-lg flex items-center justify-center mx-auto">
                  <Dice6 className="w-6 h-6 text-primary-glow" />
                </div>
                <h4 className="text-lg font-semibold">Smart Rules</h4>
                <p className="text-muted-foreground">
                  Powered by Fate Core with pluggable rules systems. Mechanics work invisibly behind the scenes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}