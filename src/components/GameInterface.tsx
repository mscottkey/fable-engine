import { useDeviceShell } from '@/lib/useDeviceShell';
import { WebShell, MobileShell } from '@/components/shells';
import { ChatPanel, StoryboardPanel, LobbyPanel } from '@/components/panels';
import { GameHeader } from '@/components/GameHeader';

interface GameInterfaceProps {
  gameId: string;
}

export function GameInterface({ gameId }: GameInterfaceProps) {
  const { shell } = useDeviceShell();

  const handleFabAction = () => {
    // Context-dependent FAB actions (add note, roll dice, etc.)
    console.log('FAB action triggered');
  };

  const header = <GameHeader gameId={gameId} />;

  if (shell === 'desktop') {
    return (
      <WebShell
        header={header}
        left={<ChatPanel gameId={gameId} />}
        right={<StoryboardPanel gameId={gameId} />}
      />
    );
  }

  return (
    <MobileShell
      header={header}
      tabs={{
        chat: <ChatPanel gameId={gameId} />,
        board: <StoryboardPanel gameId={gameId} />,
        lobby: <LobbyPanel gameId={gameId} />
      }}
      onFabAction={handleFabAction}
    />
  );
}