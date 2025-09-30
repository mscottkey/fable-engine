import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPartySlots, createGameInvite } from '@/services/partyService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PartySlotCard } from '@/components/PartySlotCard';
import { HostControls } from '@/components/HostControls';
import { CharacterSeedDialog } from '@/components/CharacterSeedDialog';
import { Users, CheckCircle, Clock } from 'lucide-react';

interface LobbyPanelProps {
  gameId: string;
}

export function LobbyPanel({ gameId }: LobbyPanelProps) {
  const [game, setGame] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [userMember, setUserMember] = useState<any>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showCharacterSeed, setShowCharacterSeed] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    
    loadLobbyData();
    
    // Set up realtime subscription for slots
    const subscription = supabase
      .channel(`lobby-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_slots',
          filter: `game_id=eq.${gameId}`
        },
        () => {
          loadPartySlots();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [gameId]);

  const loadLobbyData = async () => {
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

        // Load or create invite code if host
        if (memberData?.role === 'host') {
          try {
            const { data: inviteData } = await supabase
              .from('game_invites')
              .select('code')
              .eq('game_id', gameId)
              .single();
            
            if (inviteData) {
              setInviteCode(inviteData.code);
            } else {
              const code = await createGameInvite(gameId);
              setInviteCode(code);
            }
          } catch (error) {
            const code = await createGameInvite(gameId);
            setInviteCode(code);
          }
        }
      }

      // Load party slots
      await loadPartySlots();
      
    } catch (error) {
      console.error('Failed to load lobby data:', error);
    }
  };

  const loadPartySlots = async () => {
    try {
      const slotsData = await getPartySlots(gameId);
      setSlots(slotsData);
    } catch (error) {
      console.error('Failed to load party slots:', error);
    }
  };

  const handleSlotClick = (slot: any) => {
    if (slot.status === 'empty' || slot.claimed_by === userMember?.user_id) {
      setSelectedSlot(slot);
      setShowCharacterSeed(true);
    }
  };

  const getReadyCount = () => {
    return slots.filter(slot => slot.status === 'ready').length;
  };

  const getTotalSlots = () => {
    return slots.length;
  };

  const isHost = userMember?.role === 'host';

  if (!game) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{game.name}</h1>
              <p className="text-sm text-muted-foreground">{game.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                {getReadyCount()}/{getTotalSlots()} Ready
              </Badge>
              {getReadyCount() === getTotalSlots() && getTotalSlots() > 0 && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  All Ready
                </Badge>
              )}
            </div>
          </div>

          {isHost && (
            <HostControls 
              gameId={gameId} 
              inviteCode={inviteCode}
            />
          )}
        </div>
      </div>

      {/* Party Slots */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Party</h2>
            <div className="grid gap-3">
              {slots.map((slot) => (
                <PartySlotCard
                  key={slot.id}
                  slot={slot}
                  onClick={() => handleSlotClick(slot)}
                  isHost={isHost}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Character Seed Dialog */}
      <CharacterSeedDialog
        open={showCharacterSeed}
        onOpenChange={setShowCharacterSeed}
        slot={selectedSlot}
        gameId={gameId}
        genre={game?.genre || 'Fantasy'}
        onSuccess={() => {
          setShowCharacterSeed(false);
          loadPartySlots();
        }}
      />
    </div>
  );
}