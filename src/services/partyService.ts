import { supabase } from '@/integrations/supabase/client';

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

// Validate and join game via invite code
export async function joinGameWithCode(gameId: string, code: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to join game');
  }

  // Validate invite code
  const { data: invite, error: inviteError } = await supabase
    .from('game_invites')
    .select('*')
    .eq('game_id', gameId)
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (inviteError) {
    throw new Error(`Failed to validate invite: ${inviteError.message}`);
  }

  if (!invite) {
    throw new Error('Invalid invite code');
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw new Error('Invite code has expired');
  }

  if (invite.uses >= invite.max_uses) {
    throw new Error('Invite code has reached maximum uses');
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('game_members')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingMember) {
    // Add user as game member
    const { error: memberError } = await supabase
      .from('game_members')
      .insert({
        game_id: gameId,
        user_id: user.id,
        role: 'player'
      });

    if (memberError) {
      throw new Error(`Failed to join game: ${memberError.message}`);
    }

    // Increment invite uses
    const { error: updateError } = await supabase
      .from('game_invites')
      .update({ uses: invite.uses + 1 })
      .eq('id', invite.id);

    if (updateError) {
      console.warn('Failed to update invite uses:', updateError);
    }
  }
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
      character_seeds (*)
    `)
    .eq('game_id', gameId)
    .order('index_in_party');

  if (error) {
    throw new Error(`Failed to fetch party slots: ${error.message}`);
  }

  return data;
}

// Claim a party slot
export async function claimPartySlot(slotId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to claim slot');
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