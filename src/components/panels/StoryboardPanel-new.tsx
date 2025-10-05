import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles,
  User,
  Loader2,
  Play,
  Volume2,
  VolumeX,
  Pause,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useGameSession } from '@/components/GameInterface';
import { useTTS } from '@/hooks/useTTS';

interface StoryboardPanelProps {
  gameId: string;
}

export function StoryboardPanel({ gameId }: StoryboardPanelProps) {
  const { context, session, isLoading, startNewSession } = useGameSession();
  const { isSupported: ttsSupported, voices, selectedVoice, setSelectedVoice, isSpeaking, speak, stop } = useTTS();
  const [autoRead, setAutoRead] = useState(false);
  const [lastReadEventId, setLastReadEventId] = useState<string | null>(null);

  // Auto-read new GM narrations
  useEffect(() => {
    if (!autoRead || !context?.recentEvents || !ttsSupported) return;

    const latestEvent = context.recentEvents[context.recentEvents.length - 1];
    if (latestEvent?.narration && latestEvent.id !== lastReadEventId) {
      speak(latestEvent.narration);
      setLastReadEventId(latestEvent.id);
    }
  }, [context?.recentEvents, autoRead, ttsSupported, lastReadEventId, speak]);

  const handleReadNarration = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
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

  // If no session, show waiting prompt
  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-bold mb-2">No Active Session</h3>
            <p className="text-sm text-muted-foreground">
              Waiting for the host to start the session...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-card">
      {/* Header with TTS Controls */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm p-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-bold">The Story Board</h2>
              <p className="text-xs text-muted-foreground">
                Session {session.session_number} • {context?.storyState?.current_act || 'Act 1'}
              </p>
            </div>
          </div>

          {/* TTS Controls */}
          {ttsSupported && (
            <div className="flex items-center gap-2">
              <Button
                variant={autoRead ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setAutoRead(!autoRead);
                  if (autoRead) stop();
                }}
                className="gap-2"
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                Auto-Read
              </Button>

              <Select
                value={selectedVoice?.name || ''}
                onValueChange={(value) => {
                  const voice = voices.find(v => v.voice.name === value);
                  if (voice) setSelectedVoice(voice.voice);
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map(({ voice, label, quality }) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!ttsSupported && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3" />
            <span>Text-to-speech not supported in this browser</span>
          </div>
        )}
      </header>

      {/* Story Display - Read Only */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {context?.recentEvents && context.recentEvents.length > 0 ? (
            context.recentEvents.map((event: any) => (
              <div key={event.id} className="space-y-2">
                {/* Player Action Summary */}
                {event.player_action && (
                  <Card className="bg-accent/10 border-accent/20 ml-12">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-accent mb-1">
                            {(() => {
                              const char = context.characters.find((c: any) => c.id === event.character_id);
                              return char?.pc_json?.name || char?.character_name || 'Player';
                            })()}
                          </div>
                          <p className="text-sm leading-relaxed text-accent/80">{event.player_action}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* GM Narration with TTS */}
                {event.narration && (
                  <Card className="bg-card/70 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium text-primary">Game Master</div>
                            {ttsSupported && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReadNarration(event.narration)}
                                className="h-6 px-2 gap-1"
                              >
                                {isSpeaking ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                                <span className="text-xs">Read</span>
                              </Button>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.narration}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Mechanics Display (rolls, outcomes) */}
                {event.mechanics && (
                  <Card className="bg-muted/30 border-muted ml-16">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="gap-1">
                          {event.mechanics.roll || 'Roll'}
                        </Badge>
                        {event.mechanics.outcome && (
                          <Badge
                            variant={
                              event.mechanics.outcome === 'success' || event.mechanics.outcome === 'success-with-style'
                                ? 'default'
                                : event.mechanics.outcome === 'tie'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {event.mechanics.outcome}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* World State Updates (clocks, factions) */}
                {event.world_updates && (
                  <Card className="bg-amber-500/10 border-amber-500/20 ml-8">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            {event.world_updates}
                          </p>
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
                <p className="text-xs mt-1">Use the chat panel to take your first action</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
