import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { getPartySlots } from '@/services/partyService';
import { generateCharacterLineup, transformSeedsToCharacterSeeds, type CharacterLineup } from '@/services/characterService';
import { useToast } from '@/hooks/use-toast';
import { Brain, Users, MapPin, Zap, DollarSign } from 'lucide-react';

interface BuildProgress {
  stage: 'preparing' | 'generating' | 'parsing' | 'complete' | 'error';
  message: string;
  progress: number;
}

export default function CharacterBuildScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [game, setGame] = useState<any>(null);
  const [storyOverview, setStoryOverview] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [buildProgress, setBuildProgress] = useState<BuildProgress>({
    stage: 'preparing',
    message: 'Preparing character generation...',
    progress: 0
  });
  const [lineup, setLineup] = useState<CharacterLineup | null>(null);
  const [buildMetadata, setBuildMetadata] = useState<any>(null);

  useEffect(() => {
    if (gameId) {
      loadGameData();
    }
  }, [gameId]);

  const loadGameData = async () => {
    try {
      // Load game and story overview
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          campaign_seeds (
            *,
            story_overviews (*)
          )
        `)
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      const overview = gameData.campaign_seeds?.story_overviews?.[0];
      if (!overview) {
        toast({
          title: "Story Overview Required",
          description: "Complete Phase 1 story generation first.",
          variant: "destructive"
        });
        navigate(`/game/${gameId}`);
        return;
      }
      setStoryOverview(overview);

      // Load party slots and character seeds
      const slotsData = await getPartySlots(gameId!);
      setSlots(slotsData);

      // Auto-start character generation
      await generateCharacters(gameData, overview, slotsData);
      
    } catch (error: any) {
      console.error('Failed to load game data:', error);
      setBuildProgress({
        stage: 'error',
        message: `Failed to load game data: ${error.message}`,
        progress: 0
      });
    }
  };

  const generateCharacters = async (gameData: any, overview: any, slotsData: any[]) => {
    try {
      setBuildProgress({
        stage: 'preparing',
        message: 'Analyzing character seeds and story requirements...',
        progress: 10
      });

      // Transform slots to character seeds
      const seeds = transformSeedsToCharacterSeeds(slotsData);
      
      setBuildProgress({
        stage: 'generating',
        message: 'AI is creating your character lineup...',
        progress: 30
      });

      // Generate character lineup
      const result = await generateCharacterLineup(gameId!, seeds, overview);
      
      setBuildProgress({
        stage: 'parsing',
        message: 'Finalizing character details and bonds...',
        progress: 80
      });

      setLineup(result);
      setBuildMetadata({
        provider: 'lovable-ai',
        model: 'google/gemini-2.5-flash',
        characters: result.characters.length,
        bonds: result.bonds.length
      });

      setBuildProgress({
        stage: 'complete',
        message: 'Character lineup generated successfully!',
        progress: 100
      });

    } catch (error: any) {
      console.error('Failed to generate characters:', error);
      setBuildProgress({
        stage: 'error',
        message: `Generation failed: ${error.message}`,
        progress: 0
      });
    }
  };

  const handleContinueToReview = () => {
    navigate(`/game/${gameId}/characters-review`, { 
      state: { lineup, storyOverview, slots } 
    });
  };

  const handleRetry = () => {
    if (game && storyOverview && slots.length > 0) {
      generateCharacters(game, storyOverview, slots);
    }
  };

  if (!game || !storyOverview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading game data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Left Panel - Story Overview & Seeds */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Story Overview
                </CardTitle>
                <CardDescription>
                  {storyOverview.name} • {game.campaign_seeds?.genre}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Core Conflict</h4>
                    <p className="text-sm text-muted-foreground">{storyOverview.core_conflict}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Notable Locations</h4>
                    <div className="flex flex-wrap gap-1">
                      {storyOverview.notable_locations?.slice(0, 3).map((location: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {location.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Story Hooks</h4>
                    <div className="flex flex-wrap gap-1">
                      {storyOverview.story_hooks?.slice(0, 2).map((hook: any, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {hook.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Character Seeds
                </CardTitle>
                <CardDescription>
                  Player preferences and requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slots.map((slot, index) => {
                    const seed = slot.character_seeds?.[0];
                    return (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">
                            {seed?.display_name || `Player ${index + 1}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {seed?.pronouns && `${seed.pronouns} • `}
                            {seed?.concept || 'No specific concept'}
                          </div>
                        </div>
                        <Badge variant="outline">
                          suggest {/* Default mode for now */}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Generation Progress */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Character Generation
                </CardTitle>
                <CardDescription>
                  AI is creating your character lineup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">{buildProgress.progress}%</span>
                  </div>
                  <Progress value={buildProgress.progress} />
                  <p className="text-sm text-muted-foreground">{buildProgress.message}</p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2">
                  {[
                    { key: 'preparing', label: 'Analyzing Seeds', icon: MapPin },
                    { key: 'generating', label: 'Creating Characters', icon: Brain },
                    { key: 'parsing', label: 'Building Bonds', icon: Users },
                    { key: 'complete', label: 'Generation Complete', icon: Zap }
                  ].map(({ key, label, icon: Icon }) => (
                    <div 
                      key={key}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        buildProgress.stage === key 
                          ? 'bg-primary/10 border border-primary/20' 
                          : buildProgress.progress >= (['preparing', 'generating', 'parsing', 'complete'].indexOf(key) + 1) * 25
                          ? 'bg-muted/50'
                          : 'bg-muted/20'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${
                        buildProgress.stage === key ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <span className={`text-sm ${
                        buildProgress.stage === key ? 'font-medium' : ''
                      }`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Generation Results */}
                {lineup && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium">Generation Results</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">{lineup.characters.length}</span>
                        <span className="text-muted-foreground ml-1">Characters</span>
                      </div>
                      <div>
                        <span className="font-medium">{lineup.bonds.length}</span>
                        <span className="text-muted-foreground ml-1">Bonds</span>
                      </div>
                    </div>
                    {buildMetadata && (
                      <div className="text-xs text-muted-foreground">
                        Generated using {buildMetadata.model}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {buildProgress.stage === 'complete' && lineup && (
                    <Button onClick={handleContinueToReview} className="w-full">
                      Review & Approve Characters
                    </Button>
                  )}
                  
                  {buildProgress.stage === 'error' && (
                    <Button onClick={handleRetry} variant="outline" className="w-full">
                      Retry Generation
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}