import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Sparkles, Dice6, X, Info } from "lucide-react";
import { Genre, GENRE_SCENARIOS, randomScenarioFor, type Scenario } from "@/data/genres";
import { detectGenreFromText } from "@/data/gm-quotes";
import { detectGenreFromKeywords } from "@/data/keywords-to-genre";
import { extractConstraintsFromPrompt, type PromptConstraints } from "@/data/prompt-constraints";
import { buildSeedFromPrompt } from "@/services/promptSeedBuilder";
import { sanitizeUserPrompt, type SanitizationResult } from "@/services/ipSanitizer";
import { AIGMAvatar } from "@/components/AIGMAvatar";
import { supabase } from "@/integrations/supabase/client";
import { buildCampaignSeed } from "@/services/campaignBuilder";
import { saveCampaignSeed, createGame } from "@/services/campaignService";
import { useToast } from "@/hooks/use-toast";
import type { Genre as DatabaseGenre, Character } from "@/types/database";

interface AdventureStarterProps {
  onStartGame: (gameId: string) => void;
}

export function AdventureStarter({ onStartGame }: AdventureStarterProps) {
  const [gameIdea, setGameIdea] = useState("");
  const [detectedGenre, setDetectedGenre] = useState<Genre | 'generic'>('generic');
  const [inferredGenre, setInferredGenre] = useState<Genre | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [constraints, setConstraints] = useState<PromptConstraints>({
    vibeHints: [],
    tagHints: [],
    namedNouns: [],
    requiredFragments: []
  });
  const [sanitizationResult, setSanitizationResult] = useState<SanitizationResult | null>(null);
  const [showSanitizationNote, setShowSanitizationNote] = useState(false);
  const [hoveredGenre, setHoveredGenre] = useState<Genre | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

  // Detect genre and constraints from user input
  const handleGameIdeaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGameIdea(value);
    
    if (value.length > 3) {
      // Extract constraints
      const newConstraints = extractConstraintsFromPrompt(value);
      setConstraints(newConstraints);
      
      // Detect genre from keywords
      const keywordGenre = detectGenreFromKeywords(value);
      setInferredGenre(keywordGenre);
      
      // Fallback to original genre detection for GM quotes
      const detected = detectGenreFromText(value);
      setDetectedGenre(detected);
      
      // Auto-select genre if confidently detected
      if (keywordGenre && !selectedGenre) {
        setSelectedGenre(keywordGenre);
      }
    } else {
      setConstraints({
        vibeHints: [],
        tagHints: [],
        namedNouns: [],
        requiredFragments: []
      });
      setInferredGenre(null);
      setDetectedGenre('generic');
      setSelectedGenre(null);
    }
  }, [selectedGenre]);

  const toggleConstraintHint = (type: 'vibeHints' | 'tagHints', hint: string) => {
    setConstraints(prev => ({
      ...prev,
      [type]: prev[type].includes(hint)
        ? prev[type].filter(h => h !== hint)
        : [...prev[type], hint]
    }));
  };

  const handleQuickStart = async (scenario: Scenario, genre: Genre) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start an adventure.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Map Genre enum to database enum - direct mapping since they match
      const dbGenre = genre as DatabaseGenre;
      
      // Create campaign seed
      const campaignData = buildCampaignSeed(
        dbGenre,
        scenario.title,
        scenario.description,
        Date.now()
      );

      // Save to database
      const seedId = await saveCampaignSeed(campaignData);
      
      // Create default characters
      const defaultCharacters: Character[] = [
        { id: "1", playerName: "Player 1", characterName: "Character 1", concept: "Determined hero" },
        { id: "2", playerName: "Player 2", characterName: "Character 2", concept: "Clever ally" },
      ];

      // Create game
      const gameId = await createGame(seedId, scenario.title, defaultCharacters);
      
      toast({
        title: "Adventure Started!",
        description: `Created "${scenario.title}" adventure`,
      });

      onStartGame(gameId);
    } catch (error) {
      console.error('Failed to start adventure:', error);
      toast({
        title: "Failed to Start Adventure",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomStart = async () => {
    if (!gameIdea.trim()) return;
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required", 
        description: "Please sign in to start an adventure.",
        variant: "destructive",
      });
      return;
    }

    // Ensure a genre is selected
    const finalGenre = selectedGenre || inferredGenre;
    if (!finalGenre) {
      toast({
        title: "Genre Required",
        description: "Please select a genre for your adventure.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Sanitize the user prompt for IP content
      const sanitizationResult = await sanitizeUserPrompt(gameIdea, finalGenre);
      
      // Show notification if IP was detected
      if (sanitizationResult.had_ip) {
        setSanitizationResult(sanitizationResult);
        setShowSanitizationNote(true);
        toast({
          title: "Content Adjusted",
          description: "We rephrased your idea to keep it original.",
        });
      }

      // Use sanitized text for seed building
      const textToUse = sanitizationResult.sanitized_text || gameIdea;
      
      // Step 2: Build seed from prompt using constraints
      const campaignData = buildSeedFromPrompt({
        userText: textToUse,
        genre: finalGenre,
        constraints,
        seed: Date.now()
      });

      // Step 3: Save to database with sanitization info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const insertData = {
        user_id: user.id,
        genre: campaignData.genre as any, // Type assertion for database enum
        scenario_title: campaignData.scenarioTitle,
        scenario_description: campaignData.scenarioDescription,
        seed: campaignData.seed,
        name: campaignData.name,
        setting: campaignData.setting,
        notable_locations: campaignData.notableLocations as any, // JSON type
        tone_vibe: campaignData.toneVibe,
        tone_levers: campaignData.toneLevers as any, // JSON type
        difficulty_label: campaignData.difficultyLabel as any, // Type assertion for database enum
        difficulty_desc: campaignData.difficultyDesc,
        hooks: campaignData.hooks as any, // JSON type
        source_type: 'custom_prompt',
        user_prompt: gameIdea,
        original_user_prompt: sanitizationResult.had_ip ? gameIdea : null,
        sanitized_user_prompt: sanitizationResult.had_ip ? sanitizationResult.sanitized_text : null,
        sanitization_report: sanitizationResult.had_ip ? (sanitizationResult as any) : null,
        constraints: constraints as any // JSON type
      };

      const { data, error } = await supabase
        .from('campaign_seeds')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;
      
      // Create default characters
      const defaultCharacters: Character[] = [
        { id: "1", playerName: "Player 1", characterName: "Character 1", concept: "Determined hero" },
        { id: "2", playerName: "Player 2", characterName: "Character 2", concept: "Clever ally" },
      ];

      // Create game
      const gameId = await createGame(data.id, campaignData.name, defaultCharacters);
      
      toast({
        title: "Adventure Started!",
        description: "Created custom adventure",
      });

      onStartGame(gameId);
    } catch (error) {
      console.error('Failed to start adventure:', error);
      toast({
        title: "Failed to Start Adventure", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <div className="flex-1">
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
                Start Your
                <span className="text-primary block">Adventure</span>
              </h1>
            </div>
            <div className="flex-1 flex justify-end">
              {isAuthenticated && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    toast({
                      title: "Signed Out",
                      description: "You have been signed out successfully.",
                    });
                  }}
                >
                  Sign Out
                </Button>
              )}
            </div>
          </div>
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
              <div className="h-32 w-full max-w-md flex items-center justify-center">
                <AIGMAvatar genre={hoveredGenre || detectedGenre} className="max-w-md" />
              </div>
            </div>
            
            {/* Input and Button */}
            <div className="space-y-4">
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
                  disabled={!gameIdea.trim() || loading}
                  className="px-8"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {loading ? "Starting..." : "Start Game"}
                </Button>
              </div>

              {/* Genre Selection */}
              {gameIdea.length > 3 && !inferredGenre && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Choose a genre:</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(Genre).slice(0, 6).map((genre) => (
                      <Button
                        key={genre}
                        variant={selectedGenre === genre ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGenre(genre)}
                        className="text-xs"
                      >
                        {genre}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sanitization Notice */}
              {showSanitizationNote && sanitizationResult?.had_ip && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-primary font-medium">Content Adjusted</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        We rephrased your idea to keep it original while preserving your intent.
                      </p>
                      {sanitizationResult.detections.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sanitizationResult.detections.map((detection, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {detection.span} → {detection.suggested_generic}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSanitizationNote(false)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Constraint Chips */}
              {(constraints.vibeHints.length > 0 || constraints.tagHints.length > 0) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Detected themes (click to toggle):</label>
                  <div className="flex flex-wrap gap-2">
                    {constraints.vibeHints.map((vibe) => (
                      <Badge
                        key={vibe}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20 text-xs"
                        onClick={() => toggleConstraintHint('vibeHints', vibe)}
                      >
                        {vibe}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                    {constraints.tagHints.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent/20 text-xs"
                        onClick={() => toggleConstraintHint('tagHints', tag)}
                      >
                        {tag}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
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
              
              // Tag colors and emojis for differentiation
              const getTagStyle = (tag: string, index: number) => {
                const colors = [
                  "bg-rose-100 text-rose-800 border-rose-200",
                  "bg-blue-100 text-blue-800 border-blue-200", 
                  "bg-green-100 text-green-800 border-green-200",
                  "bg-purple-100 text-purple-800 border-purple-200",
                  "bg-amber-100 text-amber-800 border-amber-200",
                  "bg-cyan-100 text-cyan-800 border-cyan-200"
                ];
                
                const emojis = ["⚔️", "🏰", "🌟", "🔮", "⭐", "🎭", "🗡️", "🛡️", "🏺", "📜"];
                const emoji = emojis[tag.toLowerCase().charCodeAt(0) % emojis.length];
                
                return {
                  className: colors[index % colors.length],
                  emoji
                };
              };
              
              return (
                <Card
                  key={genre}
                  className="cursor-pointer transition-all duration-300 hover:scale-105 border-border bg-card/50 backdrop-blur-sm hover:bg-card/70 hover:border-primary/50 flex flex-col h-full"
                  onMouseEnter={() => setHoveredGenre(genre)}
                  onMouseLeave={() => setHoveredGenre(null)}
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
                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    <CardDescription className="leading-relaxed text-sm flex-1">
                      {scenario.description}
                    </CardDescription>
                    
                    <div className="flex flex-wrap gap-2">
                      {scenario.tags.map((tag, tagIndex) => {
                        const tagStyle = getTagStyle(tag, tagIndex);
                        return (
                          <Badge 
                            key={tagIndex} 
                            variant="outline" 
                            className={`text-xs border ${tagStyle.className}`}
                          >
                            <span className="mr-1">{tagStyle.emoji}</span>
                            {tag}
                          </Badge>
                        );
                      })}
                    </div>
                    
                    <div className="mt-auto pt-4">
                      <Button
                        variant="outline"
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={() => handleQuickStart(scenario, genre)}
                        disabled={loading}
                      >
                        {loading ? "Starting..." : "Start Adventure"}
                      </Button>
                    </div>
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