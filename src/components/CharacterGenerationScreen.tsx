import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, RotateCcw, Users, Brain } from 'lucide-react';
import { generateCharacterLineup, type CharacterLineup } from '@/services/characterService';

interface CharacterGenerationScreenProps {
  game: any;
  storyOverview: any;
  characterSeeds: any[];
  onComplete: (lineup: CharacterLineup, metrics: any) => void;
  onBack: () => void;
}

export const CharacterGenerationScreen: React.FC<CharacterGenerationScreenProps> = ({
  game,
  storyOverview,
  characterSeeds,
  onComplete,
  onBack
}) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'generating' | 'complete' | 'error'>('generating');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [currentStage, setCurrentStage] = useState('preparing');
  const hasStarted = useRef(false);

  const generateCharacters = useCallback(async () => {
    // Prevent multiple simultaneous generations
    if (hasStarted.current) {
      console.log('Generation already started, skipping');
      return;
    }
    
    hasStarted.current = true;
    console.log('generateCharacters called, current status:', status);
    
    setStatus('generating');
    setError(null);
    setProgress(0);
    setCurrentStage('preparing');

    try {
      // Simulate progress animation with stage updates
      const stageUpdates = [
        { stage: 'analyzing', message: 'Analyzing story overview...', progress: 10 },
        { stage: 'processing', message: 'Processing character seeds...', progress: 25 },
        { stage: 'generating', message: 'Generating character lineup...', progress: 50 },
        { stage: 'bonds', message: 'Creating character bonds...', progress: 75 },
        { stage: 'finalizing', message: 'Finalizing characters...', progress: 90 }
      ];

      let stageIndex = 0;
      const progressInterval = setInterval(() => {
        if (stageIndex < stageUpdates.length) {
          const stage = stageUpdates[stageIndex];
          setCurrentStage(stage.stage);
          setProgress(stage.progress);
          stageIndex++;
        } else {
          clearInterval(progressInterval);
        }
      }, 800);

      const response = await generateCharacterLineup(
        game.id,
        characterSeeds,
        storyOverview
      );

      clearInterval(progressInterval);
      setProgress(100);
      
      // The response is directly the CharacterLineup
      setStatus('complete');
      const newMetrics = {
        model: 'google/gemini-2.5-flash', // Default model
        tokensUsed: 0, // These will come from the backend response in future updates
        cost: 0,
        latency: 0
      };
      setMetrics(newMetrics);
      
      setTimeout(() => {
        console.log('About to call onComplete with:', response);
        // TEMPORARILY COMMENT OUT TO TEST
        // onComplete(response, newMetrics);
      }, 1000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      hasStarted.current = false; // Reset on error so retry can work
    }
  }, [game.id, characterSeeds, storyOverview, onComplete]);

  useEffect(() => {
    console.log('useEffect triggered, starting character generation');
    // Auto-start generation only once
    generateCharacters();
  }, []); // Empty dependency array to run only once

  const retry = () => {
    hasStarted.current = false; // Reset the flag
    generateCharacters();
  };

  const getStageIcon = (stageName: string) => {
    const stageMap: Record<string, { icon: React.ReactNode, active: boolean }> = {
      'analyzing': { 
        icon: <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />, 
        active: currentStage === 'analyzing' 
      },
      'processing': { 
        icon: <div className={`w-2 h-2 rounded-full ${currentStage === 'processing' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />, 
        active: currentStage === 'processing' 
      },
      'generating': { 
        icon: <div className={`w-2 h-2 rounded-full ${currentStage === 'generating' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />, 
        active: currentStage === 'generating' 
      },
      'bonds': { 
        icon: <div className={`w-2 h-2 rounded-full ${currentStage === 'bonds' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />, 
        active: currentStage === 'bonds' 
      },
      'finalizing': { 
        icon: <div className={`w-2 h-2 rounded-full ${currentStage === 'finalizing' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />, 
        active: currentStage === 'finalizing' 
      }
    };
    return stageMap[stageName]?.icon || <div className="w-2 h-2 bg-muted rounded-full" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Story Overview & Character Seeds */}
          <div className="space-y-6">
            {/* Story Overview */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Story Overview
                  <Badge variant="secondary">{game.seed_id ? 'Generated' : 'Manual'}</Badge>
                </CardTitle>
                <CardDescription>
                  {storyOverview.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Setting</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {storyOverview.expanded_setting}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2">Core Conflict</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {storyOverview.core_conflict}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Notable Locations</h4>
                  <div className="space-y-1">
                    {storyOverview.notable_locations?.slice(0, 3).map((location: any, index: number) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {location.name}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Character Seeds */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Character Seeds
                  <Badge variant="outline">{characterSeeds.length} Players</Badge>
                </CardTitle>
                <CardDescription>
                  Player preferences and character concepts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {characterSeeds.map((seed: any, index: number) => (
                  <div key={seed.id || index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {seed.display_name || `Player ${index + 1}`}
                      </span>
                      {seed.pronouns && (
                        <Badge variant="outline" className="text-xs">
                          {seed.pronouns}
                        </Badge>
                      )}
                    </div>
                    
                    {seed.concept && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {seed.concept}
                      </p>
                    )}
                    
                    {seed.archetype_prefs?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {seed.archetype_prefs.slice(0, 2).map((archetype: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {archetype}
                          </Badge>
                        ))}
                        {seed.archetype_prefs.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{seed.archetype_prefs.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* AI Progress Display */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Character Generation
                {status === 'generating' && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === 'complete' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
              </CardTitle>
              <CardDescription>
                {status === 'generating' && 'Creating your character lineup...'}
                {status === 'complete' && 'Character generation complete!'}
                {status === 'error' && 'Generation failed'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {status === 'generating' && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      {getStageIcon('analyzing')}
                      <span className={currentStage === 'analyzing' ? 'text-primary' : 'text-muted-foreground'}>
                        Analyzing story overview...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {getStageIcon('processing')}
                      <span className={currentStage === 'processing' ? 'text-primary' : 'text-muted-foreground'}>
                        Processing character seeds...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {getStageIcon('generating')}
                      <span className={currentStage === 'generating' ? 'text-primary' : 'text-muted-foreground'}>
                        Generating character lineup...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {getStageIcon('bonds')}
                      <span className={currentStage === 'bonds' ? 'text-primary' : 'text-muted-foreground'}>
                        Creating character bonds...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {getStageIcon('finalizing')}
                      <span className={currentStage === 'finalizing' ? 'text-primary' : 'text-muted-foreground'}>
                        Finalizing characters...
                      </span>
                    </div>
                  </div>
                </>
              )}

              {status === 'complete' && (
                <div className="space-y-4">
                  <div className="text-sm text-green-600">
                    ✓ Character lineup generated successfully!
                  </div>
                  {metrics && (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Model:</span> {metrics.model}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tokens:</span> {metrics.tokensUsed}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost:</span> ${metrics.cost?.toFixed(4) || '0.0000'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Latency:</span> {metrics.latency}ms
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Proceeding to character review...
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="space-y-4">
                  <div className="text-sm text-red-600">
                    {error}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={retry} size="sm">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                    <Button variant="outline" onClick={onBack} size="sm">
                      Back to Lobby
                    </Button>
                  </div>
                </div>
              )}

              {status === 'generating' && (
                <Button variant="outline" onClick={onBack} disabled>
                  Back to Lobby
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};