import { supabase } from '@/integrations/supabase/client';

// Add a new party slot
export async function addPartySlot(gameId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Get current slot count
  const { data: slots, error: slotsError } = await supabase
    .from('party_slots')
    .select('index_in_party')
    .eq('game_id', gameId)
    .order('index_in_party', { ascending: false })
    .limit(1);

  if (slotsError) {
    throw new Error(`Failed to get slot count: ${slotsError.message}`);
  }

  const nextIndex = slots?.length > 0 ? slots[0].index_in_party + 1 : 0;

  const { error } = await supabase
    .from('party_slots')
    .insert({
      game_id: gameId,
      index_in_party: nextIndex,
      status: 'empty'
    });

  if (error) {
    throw new Error(`Failed to add slot: ${error.message}`);
  }
}

// Delete a party slot
export async function deletePartySlot(slotId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Delete any character seeds associated with this slot first
  await supabase
    .from('character_seeds')
    .delete()
    .eq('slot_id', slotId);

  // Delete the slot
  const { error } = await supabase
    .from('party_slots')
    .delete()
    .eq('id', slotId);

  if (error) {
    throw new Error(`Failed to delete slot: ${error.message}`);
  }
}

// Generate a random invite code (6-8 uppercase alphanumeric)
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create invite code for a game
export async function createGameInvite(gameId: string): Promise<string> {
  const code = generateInviteCode();
  
  const { data, error } = await supabase
    .from('game_invites')
    .insert({
      game_id: gameId,
      code,
      max_uses: 8,
      uses: 0
    })
    .select('code')
    .single();

  if (error) {
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  return data.code;
}

// Options for joining a game with a code
interface JoinGameOptions {
  gameId?: string;
  autoClaimSlot?: boolean;
}

// Validate and join game via invite code through edge function (bypasses RLS)
export async function joinGameWithCode(code: string, options: JoinGameOptions = {}): Promise<string> {
  const { gameId: expectedGameId, autoClaimSlot = true } = options;
  const normalizedCode = code.trim().toUpperCase();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to join game');
  }

  const { data, error } = await supabase.functions.invoke('join-game', {
    body: {
      code: normalizedCode,
      gameId: expectedGameId,
      autoClaimSlot
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to join game');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to join game');
  }

  return data.gameId as string;
}

// Create party slots for a game
export async function createPartySlots(gameId: string, partySize: number): Promise<void> {
  const slots = Array.from({ length: partySize }, (_, index) => ({
    game_id: gameId,
    index_in_party: index,
    status: 'empty'
  }));

  const { error } = await supabase
    .from('party_slots')
    .insert(slots);

  if (error) {
    throw new Error(`Failed to create party slots: ${error.message}`);
  }
}

// Get party slots for a game
export async function getPartySlots(gameId: string) {
  const { data, error } = await supabase
    .from('party_slots')
    .select(`
      *,
      character_seeds (*),
      claimed_profile:profiles!party_slots_claimed_by_fkey (display_name, avatar_url)
    `)
    .eq('game_id', gameId)
    .order('index_in_party');

  if (error) {
    throw new Error(`Failed to fetch party slots: ${error.message}`);
  }

  return data;
}

// Claim a party slot
export async function claimPartySlot(slotId: string, gameId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to claim slot');
  }

  // Check if user already has a claimed slot in this game
  const { data: existingSlots, error: checkError } = await supabase
    .from('party_slots')
    .select('id')
    .eq('game_id', gameId)
    .eq('claimed_by', user.id);

  if (checkError) {
    throw new Error(`Failed to check existing slots: ${checkError.message}`);
  }

  if (existingSlots && existingSlots.length > 0) {
    throw new Error('You have already claimed a slot in this game');
  }

  const { error } = await supabase
    .from('party_slots')
    .update({
      claimed_by: user.id,
      status: 'reserved'
    })
    .eq('id', slotId)
    .eq('status', 'empty');

  if (error) {
    throw new Error(`Failed to claim slot: ${error.message}`);
  }
}

// Save character seed
export async function saveCharacterSeed(slotId: string, gameId: string, seedData: any): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to save character seed');
  }

  // Check if seed already exists
  const { data: existingSeed } = await supabase
    .from('character_seeds')
    .select('id')
    .eq('slot_id', slotId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingSeed) {
    // Update existing seed
    const { error } = await supabase
      .from('character_seeds')
      .update(seedData)
      .eq('id', existingSeed.id);

    if (error) {
      throw new Error(`Failed to update character seed: ${error.message}`);
    }
  } else {
    // Create new seed
    const { error } = await supabase
      .from('character_seeds')
      .insert({
        slot_id: slotId,
        game_id: gameId,
        user_id: user.id,
        ...seedData
      });

    if (error) {
      throw new Error(`Failed to save character seed: ${error.message}`);
    }
  }

  // Update slot status to ready
  const { error: slotError } = await supabase
    .from('party_slots')
    .update({ status: 'ready' })
    .eq('id', slotId);

  if (slotError) {
    throw new Error(`Failed to update slot status: ${slotError.message}`);
  }
}

// Lock party and transition to Phase 2
export async function lockParty(gameId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to lock party');
  }

  // Update game status
  const { error: gameError } = await supabase
    .from('games')
    .update({ 
      party_locked: true,
      status: 'characters'
    })
    .eq('id', gameId);

  if (gameError) {
    throw new Error(`Failed to lock party: ${gameError.message}`);
  }

  // Lock all slots
  const { error: slotsError } = await supabase
    .from('party_slots')
    .update({ status: 'locked' })
    .eq('game_id', gameId);

  if (slotsError) {
    throw new Error(`Failed to lock slots: ${slotsError.message}`);
  }
}

// Update party size
export async function updatePartySize(gameId: string, newSize: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to update party size');
  }

  // Get current slots
  const { data: currentSlots } = await supabase
    .from('party_slots')
    .select('*')
    .eq('game_id', gameId)
    .order('index_in_party');

  const currentSize = currentSlots?.length || 0;

  if (newSize > currentSize) {
    // Add new slots
    const newSlots = Array.from({ length: newSize - currentSize }, (_, index) => ({
      game_id: gameId,
      index_in_party: currentSize + index,
      status: 'empty'
    }));

    const { error } = await supabase
      .from('party_slots')
      .insert(newSlots);

    if (error) {
      throw new Error(`Failed to add party slots: ${error.message}`);
    }
  } else if (newSize < currentSize) {
    // Remove empty slots from the end
    const slotsToRemove = currentSlots
      ?.slice(newSize)
      .filter(slot => slot.status === 'empty')
      .map(slot => slot.id) || [];

    if (slotsToRemove.length > 0) {
      const { error } = await supabase
        .from('party_slots')
        .delete()
        .in('id', slotsToRemove);

      if (error) {
        throw new Error(`Failed to remove party slots: ${error.message}`);
      }
    }
  }

  // Update game party size
  const { error: gameError } = await supabase
    .from('games')
    .update({ party_size: newSize })
    .eq('id', gameId);

  if (gameError) {
    throw new Error(`Failed to update party size: ${gameError.message}`);
  }
}
