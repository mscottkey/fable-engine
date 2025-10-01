import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Map,
  Plus,
  Eye,
  MapPin,
  Clock,
  Users,
  BookOpen,
  Sparkles,
  Mountain,
  Building,
  TreePine,
  Send,
  Loader2,
  Play,
  User
} from 'lucide-react';
import { useGameSession } from '@/components/GameInterface';
import { narrateTurn } from '@/services/narrativeEngine';
import { supabase } from '@/integrations/supabase/client';
import { loadCurrentBeat } from '@/services/gameContextService';
import { IntentWarningDialog } from '@/components/IntentWarningDialog';
import { useToast } from '@/hooks/use-toast';

interface StoryboardPanelProps {
  gameId: string;
}

export function StoryboardPanel({ gameId }: StoryboardPanelProps) {
  const { context, session, isLoading, startNewSession, refreshContext } = useGameSession();
  const { toast } = useToast();

  const [playerAction, setPlayerAction] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [isNarrating, setIsNarrating] = useState(false);
  const [decisionOptions, setDecisionOptions] = useState<any[]>([]);
  const [showIntentWarning, setShowIntentWarning] = useState(false);
  const [intentWarning, setIntentWarning] = useState<{
    reason: string;
    alternative?: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string>('');

  useEffect(() => {
    if (context?.characters && context.characters.length > 0) {
      setSelectedCharacter(context.characters[0].id);
    }
  }, [context?.characters]);

  // Get the most recent narration and available options
  const currentNarration = context?.recentEvents && context.recentEvents.length > 0
    ? context.recentEvents[context.recentEvents.length - 1]
    : null;

  useEffect(() => {
    if (currentNarration?.available_options) {
      setDecisionOptions(currentNarration.available_options);
    }
  }, [currentNarration]);

  const handleSubmitAction = async () => {
    if (!playerAction.trim() || !selectedCharacter || !session) return;

    // First, detect intent
    try {
      const currentBeat = await loadCurrentBeat(gameId);

      if (currentBeat) {
        const { data: result, error: fnError } = await supabase.functions.invoke('detect-intent', {
          body: {
            gameId,
            playerAction,
            currentBeat,
            recentEvents: context?.recentEvents || []
          }
        });

        if (fnError) {
          console.warn('Intent detection failed:', fnError);
          // Continue without intent check if it fails
        }

        const intent = result?.classification || { isOnTrack: true, confidence: 50, intendedBeat: null };

        // If divergent and low confidence, show warning
        if (!intent.isOnTrack && intent.confidence > 60) {
          setIntentWarning({
            reason: intent.divergenceReason || 'This action may take the story in an unexpected direction.',
            alternative: intent.alternativeAction
          });
          setPendingAction(playerAction);
          setShowIntentWarning(true);
          return;
        }
      }

      // Proceed with action
      await executeAction(playerAction);
    } catch (error) {
      console.error('Intent detection failed:', error);
      // Fallback: proceed with action if intent detection fails
      await executeAction(playerAction);
    }
  };

  const executeAction = async (action: string) => {
    setIsNarrating(true);

    try {
      const narrative = await narrateTurn(
        gameId,
        session!.id,
        action,
        selectedCharacter
      );

      // Update decision options from AI response
      if (narrative.decisionPoint?.options) {
        setDecisionOptions(narrative.decisionPoint.options);
      }

      setPlayerAction('');
      setPendingAction('');

      // Refresh context to get updated events
      await refreshContext();

      toast({
        title: 'Story Continues',
        description: 'The GM has responded to your action.'
      });
    } catch (error) {
      console.error('Action failed:', error);
      toast({
        title: 'Action Failed',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsNarrating(false);
    }
  };

  const handleProceedWithAction = async () => {
    setShowIntentWarning(false);

    // Log divergence
    if (intentWarning && session) {
      try {
        const currentBeat = await loadCurrentBeat(gameId);
        if (currentBeat) {
          await logPlayerDivergence(gameId, {
            beatId: currentBeat.beatId,
            playerAction: pendingAction,
            reason: intentWarning.reason,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Failed to log divergence:', error);
      }
    }

    await executeAction(pendingAction);
  };

  const handleCancelAction = () => {
    setShowIntentWarning(false);
    setIntentWarning(null);
    setPendingAction('');
    // playerAction remains so user can edit it
  };

  const handleOptionSelect = (option: any) => {
    setPlayerAction(option.label);
  };

  const getLocationIcon = (location: string) => {
    if (location.includes('Forest') || location.includes('Woods')) return <TreePine className="w-4 h-4" />;
    if (location.includes('Cave') || location.includes('Underground')) return <Mountain className="w-4 h-4" />;
    if (location.includes('Tavern') || location.includes('Town')) return <Building className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading story...</p>
        </div>
      </div>
    );
  }

  // If no session, show start prompt
  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Begin Your Adventure</CardTitle>
            <CardDescription>
              Ready to start your journey in {context?.storyOverview?.expandedSetting || 'this world'}?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={startNewSession} className="w-full gap-2">
              <Play className="w-4 h-4" />
              Start Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <IntentWarningDialog
        open={showIntentWarning}
        onOpenChange={setShowIntentWarning}
        divergenceReason={intentWarning?.reason || ''}
        alternativeAction={intentWarning?.alternative}
        onProceed={handleProceedWithAction}
        onCancel={handleCancelAction}
      />

      <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-card">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Story</h2>
              <p className="text-xs text-muted-foreground">
                Session {session.session_number} • {context?.storyState?.current_act || 'Act 1'}
              </p>
            </div>
          </div>

          <Badge variant="outline" className="gap-1">
            <Eye className="w-3 h-3" />
            In Character
          </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4 max-w-4xl mx-auto">
            {/* Narrative Events */}
            {context?.recentEvents && context.recentEvents.length > 0 ? (
              context.recentEvents.map((event: any, index: number) => (
                <div key={event.id} className="space-y-2">
                  {/* Player Action */}
                  {event.player_action && (
                    <Card className="bg-accent/10 border-accent/20 ml-12">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 text-accent mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-accent mb-1">
                              {context.characters.find((c: any) => c.id === event.character_id)?.pc_json?.name || 'Player'}
                            </div>
                            <p className="text-sm leading-relaxed">{event.player_action}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* GM Narration */}
                  {event.narration && (
                    <Card className="bg-card/70 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-primary mb-1">Game Master</div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.narration}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))
            ) : (
              <Card className="bg-card/70 border-primary/20">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Your story begins here...</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Action Input Area */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Character Selection */}
            {context?.characters && context.characters.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {context.characters.map((character: any) => (
                  <Button
                    key={character.id}
                    variant={selectedCharacter === character.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCharacter(character.id)}
                    className="text-xs gap-1"
                  >
                    <User className="w-3 h-3" />
                    {character.pc_json?.name || 'Character'}
                  </Button>
                ))}
              </div>
            )}

            {/* Decision Options */}
            {decisionOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Suggested actions:</p>
                <div className="grid grid-cols-2 gap-2">
                  {decisionOptions.map((option: any, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleOptionSelect(option)}
                      disabled={isNarrating}
                      className="justify-start text-left h-auto py-2"
                    >
                      <div>
                        <div className="font-medium text-xs">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder={`What does ${context?.characters.find((c: any) => c.id === selectedCharacter)?.pc_json?.name || 'your character'} do?`}
                value={playerAction}
                onChange={(e) => setPlayerAction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSubmitAction();
                  }
                }}
                disabled={isNarrating}
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={handleSubmitAction}
                disabled={!playerAction.trim() || isNarrating}
                size="lg"
              >
                {isNarrating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}