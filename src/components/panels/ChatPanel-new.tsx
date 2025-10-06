import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Mic,
  MicOff,
  User,
  MessageCircle,
  Sparkles,
  Loader2,
  AlertCircle,
  Play
} from 'lucide-react';
import { useGameSession } from '@/components/GameInterface';
import { useSTT } from '@/hooks/useSTT';
import { narrateTurn } from '@/services/narrativeEngine';
import { detectPlayerIntent } from '@/ai/flows/detect-intent';
import { IntentWarningDialog } from '@/components/IntentWarningDialog';
import { loadCurrentBeat } from '@/services/gameContextService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  type: 'question' | 'answer' | 'action' | 'system';
  content: string;
  timestamp: Date;
  characterId?: string;
}

interface ChatPanelProps {
  gameId: string;
}

export function ChatPanel({ gameId }: ChatPanelProps) {
  const { context, session, isLoading: sessionLoading, startNewSession, refreshContext } = useGameSession();
  const { toast } = useToast();
  const { isSupported: sttSupported, isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript } = useSTT();

  const [inputValue, setInputValue] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'action' | 'chat'>('action');

  // Intent warning
  const [showIntentWarning, setShowIntentWarning] = useState(false);
  const [intentWarning, setIntentWarning] = useState<{ reason: string; alternative?: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<string>('');

  // Set default character
  useEffect(() => {
    if (context?.characters && context.characters.length > 0 && !selectedCharacter) {
      setSelectedCharacter(context.characters[0].id);
    }
  }, [context?.characters, selectedCharacter]);

  // Update input from STT
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleSendAction = async () => {
    if (!inputValue.trim() || !session) return;

    const action = inputValue.trim();
    setInputValue('');
    resetTranscript();

    // Detect intent and check for divergence
    try {
      const intentResult = await detectPlayerIntent(gameId, action);

      if (intentResult.diverges && intentResult.reason) {
        setIntentWarning({
          reason: intentResult.reason,
          alternative: intentResult.alternativeAction
        });
        setPendingAction(action);
        setShowIntentWarning(true);
        return;
      }

      await executeAction(action);
    } catch (error) {
      console.error('Intent detection failed:', error);
      await executeAction(action);
    }
  };

  const executeAction = async (action: string) => {
    setIsProcessing(true);

    try {
      const narrative = await narrateTurn(gameId, session!.id, action, selectedCharacter);

      // Refresh context to show new narration on board
      await refreshContext();

      toast({
        title: 'Action Taken',
        description: 'The story continues...'
      });
    } catch (error) {
      console.error('Action failed:', error);
      toast({
        title: 'Action Failed',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendChat = async () => {
    if (!inputValue.trim()) return;

    const question = inputValue.trim();
    setInputValue('');
    resetTranscript();

    // Add user question to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'question',
      content: question,
      timestamp: new Date(),
      characterId: selectedCharacter
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Call AI GM for answer (not narrative action)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('gm-chat', {
        body: {
          gameId,
          question,
          characterId: selectedCharacter,
          context: {
            storyOverview: context?.storyOverview,
            factions: context?.factions,
            storyNodes: context?.storyNodes,
            characters: context?.characters
          }
        }
      });

      if (error) throw error;

      // Add GM answer to chat
      const gmMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'answer',
        content: data.answer || 'I\'m not sure about that.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, gmMessage]);
    } catch (error) {
      console.error('Chat failed:', error);
      toast({
        title: 'Chat Failed',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedWithAction = async () => {
    setShowIntentWarning(false);

    if (intentWarning && session) {
      try {
        const currentBeat = await loadCurrentBeat(gameId);
        if (currentBeat) {
          // Log divergence (TODO: implement)
        }
      } catch (error) {
        console.error('Failed to log divergence:', error);
      }
    }

    await executeAction(pendingAction);
    setPendingAction('');
    setIntentWarning(null);
  };

  const handleCancelAction = () => {
    setShowIntentWarning(false);
    setIntentWarning(null);
    setPendingAction('');
  };

  if (sessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-bold mb-2">No Active Session</h3>
            <p className="text-sm text-muted-foreground">
              Waiting for the host to start the session...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedChar = context?.characters?.find((c: any) => c.id === selectedCharacter);
  const characterName = selectedChar?.pc_json?.name || selectedChar?.character_name || 'Character';

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

      <div className="h-full flex flex-col bg-gradient-to-br from-background to-card/30">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm p-4 shrink-0">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Chat & Actions</h2>
              <p className="text-xs text-muted-foreground">Interact with your GM</p>
            </div>
          </div>
        </header>

        {/* Character Selection Cards */}
        {context?.characters && context.characters.length > 0 && (
          <div className="p-3 border-b border-border bg-muted/30 shrink-0">
            <div className="flex gap-3 flex-wrap">
              {context.characters.map((character: any) => {
                const charData = character.pc_json || {};
                const isSelected = selectedCharacter === character.id;

                return (
                  <Card
                    key={character.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border hover:border-primary/50 bg-card/50'
                    }`}
                    onClick={() => setSelectedCharacter(character.id)}
                  >
                    <CardContent className="p-3 min-w-[180px]">
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-full ${isSelected ? 'bg-primary' : 'bg-muted'}`}>
                          <User className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {charData.name || character.character_name || 'Character'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {character.player_name || 'Player'}
                          </div>
                          {charData.highConcept && (
                            <div className="text-xs text-muted-foreground italic truncate mt-0.5">
                              {charData.highConcept}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Switch: Action vs Chat */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'action' | 'chat')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-3 shrink-0">
            <TabsTrigger value="action" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Take Action
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Ask GM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="action" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
            <div className="flex-1 p-4 overflow-auto">
              <Card className="bg-card/70">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Describe what <span className="font-medium text-foreground">{characterName}</span> does. Your action will appear on the story board and the GM will respond.
                  </p>
                  {!sttSupported && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-3">
                      <AlertCircle className="w-3 h-3" />
                      <span>Speech-to-text not supported in this browser</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 min-h-0">
            <ScrollArea className="flex-1 p-4 min-h-0">
              <div className="space-y-3">
                {chatMessages.map(msg => (
                  <Card key={msg.id} className={msg.type === 'question' ? 'bg-accent/10 ml-8' : 'bg-card/70'}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        {msg.type === 'question' ? (
                          <User className="w-4 h-4 text-accent mt-0.5" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="text-xs font-medium mb-1">
                            {msg.type === 'question' ? characterName : 'Game Master'}
                          </div>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {chatMessages.length === 0 && (
                  <Card className="bg-card/70">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Ask the GM questions about the world, NPCs, or rules</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex gap-2">
            <Textarea
              placeholder={
                activeTab === 'action'
                  ? `What does ${characterName} do?`
                  : `Ask the GM a question...`
              }
              value={inputValue + (isListening && interimTranscript ? ' ' + interimTranscript : '')}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  activeTab === 'action' ? handleSendAction() : handleSendChat();
                }
              }}
              disabled={isProcessing}
              rows={2}
              className="flex-1 resize-none"
            />

            {sttSupported && (
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="lg"
                onClick={handleMicToggle}
                disabled={isProcessing}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}

            <Button
              onClick={activeTab === 'action' ? handleSendAction : handleSendChat}
              disabled={!inputValue.trim() || isProcessing}
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {activeTab === 'action' ? 'Ctrl+Enter to send action' : 'Ctrl+Enter to send question'}
          </p>
        </div>
      </div>
    </>
  );
}
