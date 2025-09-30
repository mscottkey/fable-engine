import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { CampaignSeed } from '@/types/database';
import { generateStoryOverview } from '@/services/storyBuilder';
import { StoryOverview } from '@/types/storyOverview';

interface StoryGenerationScreenProps {
  campaignSeed: CampaignSeed;
  onComplete: (storyOverview: StoryOverview, metrics: any) => void;
  onBack: () => void;
}

export const StoryGenerationScreen: React.FC<StoryGenerationScreenProps> = ({
  campaignSeed,
  onComplete,
  onBack
}) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'generating' | 'complete' | 'error'>('generating');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);

  const generateStory = async () => {
    setStatus('generating');
    setError(null);
    setProgress(0);

    try {
      // Simulate progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const response = await generateStoryOverview({
        seedId: campaignSeed.id,
        schema: {
          type: "object",
          properties: {
            expandedSetting: { type: "string" },
            notableLocations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" }
                },
                required: ["name", "description"]
              }
            },
            toneManifesto: {
              type: "object",
              properties: {
                vibe: { type: "string" },
                levers: {
                  type: "object",
                  properties: {
                    pace: { type: "string" },
                    danger: { type: "string" },
                    morality: { type: "string" },
                    scale: { type: "string" }
                  },
                  required: ["pace", "danger", "morality", "scale"]
                },
                expanded: { type: "string" }
              },
              required: ["vibe", "levers", "expanded"]
            },
            storyHooks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                },
                required: ["title", "description"]
              }
            },
            coreConflict: { type: "string" },
            sessionZero: {
              type: "object",
              properties: {
                openQuestions: {
                  type: "array",
                  items: { type: "string" }
                },
                contentAdvisories: {
                  type: "array",
                  items: { type: "string" }
                },
                calibrationLevers: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["openQuestions", "contentAdvisories", "calibrationLevers"]
            }
          },
          required: ["expandedSetting", "notableLocations", "toneManifesto", "storyHooks", "coreConflict", "sessionZero"]
        }
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      if (response.success && response.story) {
        setStatus('complete');
        const newMetrics = {
          model: 'google/gemini-2.5-flash',
          tokensUsed: response.tokensUsed || 0,
          cost: response.cost || 0,
          latency: response.latency || 0
        };
        setMetrics(newMetrics);
        
        setTimeout(() => {
          onComplete(response.story, newMetrics);
        }, 1000);
      } else {
        throw new Error(response.error || 'Unknown error occurred');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  useEffect(() => {
    generateStory();
  }, []);

  const retry = () => {
    generateStory();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Campaign Seed Display */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Campaign Seed
                <Badge variant="secondary">{campaignSeed.genre}</Badge>
              </CardTitle>
              <CardDescription>
                {campaignSeed.scenario_title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Setting</h4>
                <p className="text-sm text-muted-foreground">{campaignSeed.setting}</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2">Tone & Vibe</h4>
                <p className="text-sm text-muted-foreground">{campaignSeed.tone_vibe}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Notable Locations</h4>
                <div className="space-y-1">
                  {(campaignSeed.notable_locations as any[])?.slice(0, 3).map((location: any, index: number) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      • {location.name || location}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Initial Hooks</h4>
                <div className="space-y-1">
                  {(campaignSeed.hooks as any[])?.slice(0, 2).map((hook: any, index: number) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      • {hook.title || hook}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Progress Display */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                AI Story Generation
                {status === 'generating' && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === 'complete' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
              </CardTitle>
              <CardDescription>
                {status === 'generating' && 'Creating your story overview...'}
                {status === 'complete' && 'Story generation complete!'}
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
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      Expanding setting details...
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-muted rounded-full" />
                      Creating notable locations...
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-muted rounded-full" />
                      Developing story hooks...
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-muted rounded-full" />
                      Defining core conflict...
                    </div>
                  </div>
                </>
              )}

              {status === 'complete' && (
                <div className="space-y-4">
                  <div className="text-sm text-green-600">
                    ✓ Story overview generated successfully!
                  </div>
                  {metrics && (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Tokens:</span> {metrics.tokensUsed}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Latency:</span> {metrics.latency}ms
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Proceeding to review screen...
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
                      Back to Setup
                    </Button>
                  </div>
                </div>
              )}

              {status === 'generating' && (
                <Button variant="outline" onClick={onBack} disabled>
                  Back to Setup
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};