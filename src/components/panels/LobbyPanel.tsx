import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLobbyRealtime } from '@/hooks/useLobbyRealtime';
import { getPartySlots, createGameInvite } from '@/services/partyService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PartySlotCard } from '@/components/PartySlotCard';
import { HostControls } from '@/components/HostControls';
import { CharacterSeedDialog } from '@/components/CharacterSeedDialog';
import { Users, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LobbyPanelProps {
  gameId: string;
}

export function LobbyPanel({ gameId }: LobbyPanelProps) {
  const { toast } = useToast();
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
      console.error('Failed to load party slots:', error);
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      if (userId) {
        const { data: memberData } = await supabase
          .from('game_members')
          .select('*')
          .eq('game_id', gameId)
          .eq('user_id', userId)
          .single();

        setUserMember(memberData);

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

      await loadGameMembers(false);
      await loadPartySlots(false);
      initialLoadRef.current = false;
    } catch (error) {
      console.error('Failed to load lobby data:', error);
    }
  }, [gameId, loadGameMembers, loadPartySlots]);

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

  const handleSlotClick = (slot: any) => {
    if (slot.status === 'empty' && !userAlreadyHasSlot) {
      setSelectedSlot(slot);
      setShowCharacterSeed(true);
    } else if (slot.claimed_by === userMember?.user_id) {
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

  const getClaimedCount = () => {
    return members.length;
  };

  const isHost = userMember?.role === 'host';
  const userAlreadyHasSlot = slots.some(slot => slot.claimed_by === userMember?.user_id);

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
                <CheckCircle className="w-3 h-3" />
                {getReadyCount()}/{getTotalSlots()} Ready
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                {getClaimedCount()}/{getTotalSlots()} Joined
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
              {slots.map((slot) => {
                const claimedName = slot.claimed_profile?.display_name || getMemberName(slot.claimed_by);
                return (
                  <PartySlotCard
                    key={slot.id}
                    slot={slot}
                    onClick={() => handleSlotClick(slot)}
                    isHost={isHost}
                    userHasClaimedSlot={userAlreadyHasSlot}
                    claimedByName={claimedName}
                  />
                );
              })}
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
        onSuccess={async () => {
          setShowCharacterSeed(false);
          await loadPartySlots(false);
        }}
      />
    </div>
  );
}
