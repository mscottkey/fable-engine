import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Brain, Settings } from 'lucide-react';

interface GameHeaderProps {
  gameId: string;
}

export function GameHeader({ gameId }: GameHeaderProps) {
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [userMember, setUserMember] = useState<any>(null);

  useEffect(() => {
    loadGameData();
  }, [gameId]);

  const loadGameData = async () => {
    try {
      // Load game data
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      // Load user membership
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: memberData } = await supabase
          .from('game_members')
          .select('*')
          .eq('game_id', gameId)
          .eq('user_id', userData.user.id)
          .single();
        
        setUserMember(memberData);
      }
    } catch (error) {
      console.error('Failed to load game data:', error);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleBackToLobby = () => {
    navigate(`/lobby/${gameId}`);
  };

  const handleBuildCharacters = () => {
    navigate(`/game/${gameId}/build-characters`);
  };

  const handleReviewCharacters = () => {
    navigate(`/game/${gameId}/characters-review`);
  };

  if (!game) return null;

  const canGoToLobby = game.status === 'lobby' || !game.party_locked;
  const canBuildCharacters = game.status === 'characters' && userMember?.role === 'host';
  const canReviewCharacters = game.status === 'characters';

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToDashboard}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <div>
          <h1 className="font-semibold text-sm">{game.name}</h1>
          <p className="text-xs text-muted-foreground capitalize">{game.status}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canGoToLobby && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToLobby}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Lobby
          </Button>
        )}
        
        {canBuildCharacters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBuildCharacters}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            Build Characters
          </Button>
        )}
        
        {canReviewCharacters && !canBuildCharacters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReviewCharacters}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            Review Characters
          </Button>
        )}
      </div>
    </header>
  );
}