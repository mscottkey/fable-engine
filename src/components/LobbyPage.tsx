import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPartySlots, lockParty, createGameInvite, addPartySlot, deletePartySlot } from '@/services/partyService';
import { transitionGameState, InvalidStateTransitionError } from '@/services/database/gameService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PartySlotCard } from '@/components/PartySlotCard';
import { HostControls } from '@/components/HostControls';
import { CharacterSeedDialog } from '@/components/CharacterSeedDialog';
import { Loader2, Users, Lock, CheckCircle, Plus, Trash2 } from 'lucide-react';

export function LobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'character_seeds',
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
    if (!gameId) return;
    
    try {
      setIsLoading(true);
      
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get game and membership
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          campaign_seeds (*)
        `)
        .eq('id', gameId)
        .single();

      if (gameError) {
        toast({
          title: "Game Not Found",
          description: "This game doesn't exist or you don't have access.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setGame(gameData);

      // Get user's membership
      const { data: memberData } = await supabase
        .from('game_members')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .single();

      if (!memberData) {
        toast({
          title: "Not a Member",
          description: "You're not a member of this game.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setUserMember(memberData);

      // Get invite code if host
      if (memberData.role === 'host') {
        const { data: inviteData } = await supabase
          .from('game_invites')
          .select('code')
          .eq('game_id', gameId)
          .single();

        if (inviteData) {
          setInviteCode(inviteData.code);
        } else {
          // Create invite code
          const code = await createGameInvite(gameId);
          setInviteCode(code);
        }
      }

      await loadPartySlots();
    } catch (error: any) {
      console.error('Failed to load lobby:', error);
      toast({
        title: "Failed to Load",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPartySlots = async () => {
    if (!gameId) return;
    
    try {
      const slotsData = await getPartySlots(gameId);
      setSlots(slotsData);
    } catch (error: any) {
      console.error('Failed to load slots:', error);
    }
  };

  // Use state transitions
  const handleLockParty = async () => {
    try {
      await transitionGameState(gameId, 'characters');
      navigate(`/game/${gameId}/build-characters`);
    } catch (error) {
      if (error instanceof InvalidStateTransitionError) {
        toast({
          title: "Cannot Lock Party",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };
    
  const handleAddSlot = async () => {
    if (!gameId) return;
    
    try {
      await addPartySlot(gameId);
      await loadPartySlots();
      toast({
        title: "Slot Added",
        description: "A new player slot has been added to the party.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Add Slot",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!gameId) return;
    
    try {
      await deletePartySlot(slotId);
      await loadPartySlots();
      toast({
        title: "Slot Removed",
        description: "The player slot has been removed from the party.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Remove Slot",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSlotClick = async (slot: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if this is the user's slot or an empty slot they can claim
    if (slot.status === 'empty' || slot.claimed_by === user?.id) {
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

  const canLockParty = () => {
    return userMember?.role === 'host' && getReadyCount() >= 1; // Allow locking with 1+ ready players for testing
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading lobby...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p>Game not found</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If party is locked and game is in characters status, redirect to character building
  if (game?.party_locked && game?.status === 'characters') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Party Locked</h3>
                <p className="text-sm text-muted-foreground">
                  Character generation is in progress
                </p>
              </div>
              
              {userMember?.role === 'host' ? (
                <div className="space-y-2">
                  <Button onClick={() => navigate(`/game/${gameId}/build-characters`)} className="w-full">
                    Continue Character Generation
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/game/${gameId}/characters-review`)} 
                    className="w-full"
                  >
                    Review Characters
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Waiting for host to complete character generation...
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/game/${gameId}/characters-review`)} 
                    className="w-full"
                  >
                    View Character Progress
                  </Button>
                </div>
              )}
              
              <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {game.name}
                  {game.party_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
                <CardDescription>
                  {game.campaign_seeds?.scenario_title} • {game.campaign_seeds?.genre}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {getReadyCount()}/{getTotalSlots()} Ready
                </Badge>
                {userMember?.role === 'host' && (
                  <Badge variant="secondary">Host</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Host Controls */}
        {userMember?.role === 'host' && !game.party_locked && (
          <HostControls
            gameId={gameId!}
            inviteCode={inviteCode}
          />
        )}

        {/* Party Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {slots.map((slot) => (
            <PartySlotCard
              key={slot.id}
              slot={slot}
              onClick={() => handleSlotClick(slot)}
              isHost={userMember?.role === 'host'}
              canDelete={userMember?.role === 'host' && slots.length > 1 && !game.party_locked}
              onDelete={() => handleDeleteSlot(slot.id)}
            />
          ))}
          
          {/* Add Slot Card */}
          {userMember?.role === 'host' && !game.party_locked && slots.length < 8 && (
            <Card className="transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-105 border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
                <Button
                  variant="ghost"
                  onClick={handleAddSlot}
                  className="flex flex-col items-center gap-2 h-auto p-4"
                >
                  <Plus className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Add Player</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lock Party Button */}
        {userMember?.role === 'host' && !game.party_locked && (
          <div className="flex justify-center">
            <Button
              onClick={handleLockParty}
              disabled={!canLockParty()}
              size="lg"
              className="min-w-[200px]"
            >
              <Lock className="mr-2 h-4 w-4" />
              Lock Party & Generate Characters
            </Button>
          </div>
        )}

        {/* Character Seed Dialog */}
        <CharacterSeedDialog
          open={showCharacterSeed}
          onOpenChange={setShowCharacterSeed}
          slot={selectedSlot}
          gameId={gameId!}
          genre={game.campaign_seeds?.genre}
          onSuccess={() => {
            setShowCharacterSeed(false);
            loadPartySlots();
          }}
        />
      </div>
    </div>
  );
}
