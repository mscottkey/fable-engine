import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Options {
  gameId?: string;
  onSlotChange?: () => void;
  onCharacterSeedChange?: () => void;
  onMemberChange?: () => void;
}

export function useLobbyRealtime({ gameId, onSlotChange, onCharacterSeedChange, onMemberChange }: Options) {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const channel = supabase.channel(`lobby-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_slots',
          filter: `game_id=eq.${gameId}`
        },
        () => {
          onSlotChange?.();
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
          onCharacterSeedChange?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_members',
          filter: `game_id=eq.${gameId}`
        },
        () => {
          onMemberChange?.();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [gameId, onSlotChange, onCharacterSeedChange, onMemberChange]);
}
