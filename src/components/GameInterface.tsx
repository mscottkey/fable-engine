import { useState, useEffect, createContext, useContext } from 'react';
import { useDeviceShell } from '@/lib/useDeviceShell';
import { WebShell, MobileShell } from '@/components/shells';
import { ChatPanel, StoryboardPanel, LobbyPanel } from '@/components/panels';
import { loadGameContext, type GameContext } from '@/services/gameContextService';
import { startSession, resumeSession, pauseSession } from '@/services/sessionService';
import { useToast } from '@/hooks/use-toast';

interface GameInterfaceProps {
  gameId: string;
}

interface GameSessionContextType {
  gameId: string;
  context: GameContext | null;
  session: any | null;
  isLoading: boolean;
  startNewSession: () => Promise<void>;
  endCurrentSession: () => Promise<void>;
  refreshContext: () => Promise<void>;
}

const GameSessionContext = createContext<GameSessionContextType | null>(null);

export const useGameSession = () => {
  const context = useContext(GameSessionContext);
  if (!context) {
    throw new Error('useGameSession must be used within GameInterface');
  }
  return context;
};

export function GameInterface({ gameId }: GameInterfaceProps) {
  const { shell } = useDeviceShell();
  const { toast } = useToast();
  const [context, setContext] = useState<GameContext | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeGame();
  }, [gameId]);

  const initializeGame = async () => {
    try {
      setIsLoading(true);

      // Load game context
      const ctx = await loadGameContext(gameId);
      setContext(ctx);

      // Check for existing session
      if (ctx.currentSession) {
        setSession(ctx.currentSession);
      }
    } catch (error) {
      console.error('Failed to initialize game:', error);
      toast({
        title: 'Failed to Load Game',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startNewSession = async () => {
    try {
      const sessionId = await startSession(gameId);
      await refreshContext();

      toast({
        title: 'Session Started',
        description: 'Your adventure begins!'
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      toast({
        title: 'Failed to Start Session',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const endCurrentSession = async () => {
    if (!session) return;

    try {
      await pauseSession(session.id);

      toast({
        title: 'Session Paused',
        description: 'Your progress has been saved.'
      });

      await refreshContext();
    } catch (error) {
      console.error('Failed to pause session:', error);
      toast({
        title: 'Failed to Pause Session',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const refreshContext = async () => {
    try {
      const ctx = await loadGameContext(gameId);
      setContext(ctx);
      setSession(ctx.currentSession);
    } catch (error) {
      console.error('Failed to refresh context:', error);
    }
  };

  const handleFabAction = () => {
    // Context-dependent FAB actions (add note, roll dice, etc.)
    console.log('FAB action triggered');
  };

  const sessionContextValue: GameSessionContextType = {
    gameId,
    context,
    session,
    isLoading,
    startNewSession,
    endCurrentSession,
    refreshContext
  };

  if (shell === 'desktop') {
    return (
      <GameSessionContext.Provider value={sessionContextValue}>
        <WebShell
          left={<StoryboardPanel gameId={gameId} />}
          right={<ChatPanel gameId={gameId} />}
        />
      </GameSessionContext.Provider>
    );
  }

  return (
    <GameSessionContext.Provider value={sessionContextValue}>
      <MobileShell
        tabs={{
          chat: <ChatPanel gameId={gameId} />,
          board: <StoryboardPanel gameId={gameId} />,
          lobby: <LobbyPanel gameId={gameId} />
        }}
        onFabAction={handleFabAction}
      />
    </GameSessionContext.Provider>
  );
}