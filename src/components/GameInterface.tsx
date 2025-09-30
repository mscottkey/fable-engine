import { useDeviceShell } from '@/lib/useDeviceShell';
import { WebShell, MobileShell } from '@/components/shells';
import { ChatPanel, StoryboardPanel, LobbyPanel } from '@/components/panels';

interface GameInterfaceProps {
  gameId: string;
}

export function GameInterface({ gameId }: GameInterfaceProps) {
  const { shell } = useDeviceShell();

  const handleFabAction = () => {
    // Context-dependent FAB actions (add note, roll dice, etc.)
    console.log('FAB action triggered');
  };

  if (shell === 'desktop') {
    return (
      <WebShell
        left={<ChatPanel gameId={gameId} />}
        right={<StoryboardPanel gameId={gameId} />}
      />
    );
  }

  return (
    <MobileShell
      tabs={{
        chat: <ChatPanel gameId={gameId} />,
        board: <StoryboardPanel gameId={gameId} />,
        lobby: <LobbyPanel gameId={gameId} />
      }}
      onFabAction={handleFabAction}
    />
  );
}