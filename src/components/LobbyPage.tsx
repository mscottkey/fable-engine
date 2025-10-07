import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLobbyRealtime } from '@/hooks/useLobbyRealtime';
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
  const [autoSeedPrompted, setAutoSeedPrompted] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const slotsRef = useRef<any[]>([]);
  const membersRef = useRef<any[]>([]);
  const initialLoadRef = useRef(true);

  const getMemberName = (userId?: string | null) => {
    if (!userId) return 'Player';
    const member = membersRef.current.find((m: any) => m.user_id === userId);
    return member?.profile?.display_name || 'Player';
  };

  const refreshMembers = useCallback(async (showToast = false) => {
    if (!gameId) return;
    const { data, error } = await supabase
      .from('game_members')
      .select(`
        *,
        profiles:profiles!game_members_user_id_fkey (display_name, avatar_url)
      `)
      .eq('game_id', gameId);

    if (error) {
      console.error('Failed to load members:', error);
      return;
    }

    const mapped = (data || []).map((member: any) => ({
      ...member,
      profile: member.profiles || null,
    }));

    if (showToast && !initialLoadRef.current) {
      const previous = membersRef.current;
      const previousIds = new Set(previous.map((m: any) => m.user_id));
      const nextIds = new Set(mapped.map((m: any) => m.user_id));

      mapped.forEach((member: any) => {
        if (!previousIds.has(member.user_id)) {
          const name = member.profile?.display_name || 'Player';
          toast({
            title: `${name} joined the lobby`,
            description: 'They can now claim a seat.'
          });
        }
      });

      previous.forEach((member: any) => {
        if (!nextIds.has(member.user_id)) {
          const name = member.profile?.display_name || 'Player';
          toast({
            title: `${name} left the lobby`,
            description: 'Their seat is now available.'
          });
        }
      });
    }

    membersRef.current = mapped;
    setMembers(mapped);
  }, [gameId, toast]);

  const refreshSlots = useCallback(async (showToast = false) => {
    if (!gameId) return;
    try {
      const slotsData = await getPartySlots(gameId);

      if (showToast && !initialLoadRef.current) {
        const previousMap = new Map(slotsRef.current.map((slot: any) => [slot.id, slot]));

        slotsData.forEach((slot: any) => {
          const previousSlot = previousMap.get(slot.id);
          const previousOwner = previousSlot?.claimed_by;
          const nextOwner = slot.claimed_by;

          if (previousOwner !== nextOwner) {
            if (nextOwner) {
              const name = getMemberName(nextOwner) || slot.claimed_profile?.display_name || 'Player';
              toast({
                title: `${name} claimed a seat`,
                description: `Seat ${slot.index_in_party + 1} is now reserved.`
              });
            } else if (previousOwner) {
              const name = getMemberName(previousOwner);
              toast({
                title: `${name} released a seat`,
                description: `Seat ${slot.index_in_party + 1} is available again.`
              });
            }
          }
        });
      }

      slotsRef.current = slotsData;
      setSlots(slotsData);
    } catch (error) {
      console.error('Failed to load slots:', error);
    }
  }, [gameId, toast]);

  const loadPartySlots = useCallback(async (showToast = false) => {
    await refreshSlots(showToast);
  }, [refreshSlots]);

  const loadGameMembers = useCallback(async (showToast = false) => {
    await refreshMembers(showToast);
  }, [refreshMembers]);

  useLobbyRealtime({
    gameId,
    onSlotChange: () => refreshSlots(true),
    onCharacterSeedChange: () => refreshSlots(false),
    onMemberChange: () => refreshMembers(true),
  });

  useEffect(() => {
    initialLoadRef.current = true;
    slotsRef.current = [];
    membersRef.current = [];
  }, [gameId]);

  const loadLobbyData = useCallback(async () => {
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
          const code = await createGameInvite(gameId);
          setInviteCode(code);
        }
      }

      await loadGameMembers(false);
      await loadPartySlots(false);
      initialLoadRef.current = false;
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
  }, [gameId, navigate, toast, loadGameMembers, loadPartySlots]);

  useEffect(() => {
    loadLobbyData();
  }, [loadLobbyData]);

  useEffect(() => {
    const hasClaimedSlot = slots.some(slot => slot.claimed_by === userMember?.user_id);
    if (!hasClaimedSlot && autoSeedPrompted) {
      setAutoSeedPrompted(false);
    }
  }, [slots, userMember, autoSeedPrompted]);

  useEffect(() => {
    if (!openAutoSeedPromptCondition()) {
      return;
    }

    const mySlot = slots.find(slot => slot.claimed_by === userMember?.user_id);
    if (mySlot) {
      setSelectedSlot(mySlot);
      setShowCharacterSeed(true);
      setAutoSeedPrompted(true);
    }
  }, [slots, userMember, autoSeedPrompted, game?.party_locked]);

  const openAutoSeedPromptCondition = () => {
    if (!userMember) return false;
    if (userMember.role === 'host') return false;
    if (!slots.length) return false;
    if (autoSeedPrompted) return false;
    if (game?.party_locked) return false;
    return slots.some(slot => slot.claimed_by === userMember.user_id && (!slot.character_seeds || slot.character_seeds.length === 0));
  };

  const handleLockParty = async () => {
    if (!gameId) return;
    
    try {
      await lockParty(gameId);
      navigate(`/game/${gameId}/build-characters`);
      toast({
        title: "Party Locked",
        description: "Starting character generation...",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Lock Party",
        description: error.message,
        variant: "destructive"
      });
    }
  };
    
  const handleAddSlot = async () => {
    if (!gameId) return;
    
    try {
      await addPartySlot(gameId);
      await loadPartySlots(false);
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
      await loadPartySlots(false);
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
    const currentUserId = userMember?.user_id;
    if (!currentUserId) return;

    if (slot.status === 'empty' && !userAlreadyHasSlot) {
      setSelectedSlot(slot);
      setShowCharacterSeed(true);
    } else if (slot.claimed_by === currentUserId) {
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

  const userAlreadyHasSlot = slots.some(slot => slot.claimed_by === userMember?.user_id);
  const joinedCount = members.length;

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
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {joinedCount}/{getTotalSlots()} Joined
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
          {slots.map((slot) => {
            const claimedName = slot.claimed_profile?.display_name || getMemberName(slot.claimed_by);
            return (
              <PartySlotCard
                key={slot.id}
                slot={slot}
                onClick={() => handleSlotClick(slot)}
                isHost={userMember?.role === 'host'}
                canDelete={userMember?.role === 'host' && slots.length > 1 && !game.party_locked}
                onDelete={() => handleDeleteSlot(slot.id)}
                userHasClaimedSlot={userAlreadyHasSlot}
                claimedByName={claimedName}
              />
            );
          })}
          
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
          onSuccess={async () => {
            setShowCharacterSeed(false);
            await loadPartySlots(false);
            await loadGameMembers(false);
          }}
        />
      </div>
    </div>
  );
}
