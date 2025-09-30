// src/services/database/gameService.ts

import { supabase } from '@/integrations/supabase/client';
import { 
  GameStatus, 
  validateGameTransition, 
  validateStateRequirements,
  InvalidStateTransitionError 
} from '@/lib/stateMachine/gameStateMachine';

// Re-export for convenience
export { InvalidStateTransitionError };

/**
 * Production-grade database service with:
 * - State machine validation
 * - Automatic retries
 * - Real-time subscriptions
 * - Comprehensive error handling
 * - Transaction support
 */

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, public rollbackAttempted: boolean) {
    super(message, 'TRANSACTION_FAILED');
    this.name = 'TransactionError';
  }
}

// Core game operations with state validation
export async function transitionGameState(
  gameId: string,
  newStatus: GameStatus,
  options?: {
    skipValidation?: boolean;
    additionalUpdates?: Record<string, any>;
  }
): Promise<void> {
  // Fetch current state
  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('status, party_size')
    .eq('id', gameId)
    .single();

  if (fetchError) {
    throw new DatabaseError('Failed to fetch game state', fetchError.code, fetchError);
  }

  const currentStatus = game.status as GameStatus;

  // Validate transition unless explicitly skipped
  if (!options?.skipValidation) {
    try {
      validateGameTransition(currentStatus, newStatus);
    } catch (error) {
      if (error instanceof InvalidStateTransitionError) {
        throw error;
      }
      throw new DatabaseError('State transition validation failed', 'VALIDATION_ERROR', error);
    }

    // Validate state requirements
    const requirements = await getGameStateRequirements(gameId);
    const validation = validateStateRequirements(newStatus, requirements);
    
    if (!validation.valid) {
      throw new DatabaseError(
        `Cannot transition to ${newStatus}: ${validation.errors.join(', ')}`,
        'REQUIREMENTS_NOT_MET',
        { errors: validation.errors }
      );
    }
  }

  // Perform the update
  const updateData = {
    status: newStatus,
    ...options?.additionalUpdates
  };

  const { error: updateError } = await supabase
    .from('games')
    .update(updateData)
    .eq('id', gameId);

  if (updateError) {
    throw new DatabaseError('Failed to update game state', updateError.code, updateError);
  }
}

// Helper to get state requirements
async function getGameStateRequirements(gameId: string) {
  // @ts-ignore - Temporary type issue during Supabase schema migration
  const slotsResult: any = await supabase
    .from('party_slots')
    .select('status')
    .eq('game_id', gameId);
  
  // @ts-ignore - Temporary type issue during Supabase schema migration
  const storyResult: any = await supabase
    .from('story_overviews')
    .select('id')
    .eq('game_id', gameId)
    .limit(1);
  
  // @ts-ignore - Temporary type issue during Supabase schema migration
  const charactersResult: any = await supabase
    .from('characters')
    .select('id, status')
    .eq('game_id', gameId)
    .eq('status', 'approved')
    .limit(1);

  const readySlotsCount = slotsResult.data?.filter((s: any) => s.status === 'ready' || s.status === 'locked').length || 0;
  const hasStory = (storyResult.data?.length || 0) > 0;
  const hasCharacters = (charactersResult.data?.length || 0) > 0;

  return { readySlotsCount, hasStory, hasCharacters };
}

// Safe game fetch with full related data
export async function getGameWithRelations(gameId: string) {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      campaign_seeds (
        id,
        story_overview_draft,
        generation_status
      ),
      party_slots (
        id,
        index_in_party,
        status,
        claimed_by,
        character_seeds (
          id,
          display_name,
          pronouns,
          concept,
          archetype_prefs
        )
      ),
      game_members (
        id,
        user_id,
        role
      )
    `)
    .eq('id', gameId)
    .single();

  if (error) {
    throw new DatabaseError('Failed to fetch game', error.code, error);
  }

  return data;
}

// Check if lineup already exists (prevents regeneration waste)
export async function getExistingCharacterLineup(gameId: string) {
  const { data, error } = await supabase
    .from('character_lineups')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to fetch character lineup', error.code, error);
  }

  return data;
}

// Real-time subscription helper
export function subscribeToGameUpdates(
  gameId: string,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel(`game-${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_slots',
        filter: `game_id=eq.${gameId}`
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'characters',
        filter: `game_id=eq.${gameId}`
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Retry logic for transient failures
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error;
  let delay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on validation errors or client errors
      if (
        error instanceof InvalidStateTransitionError ||
        (error instanceof DatabaseError && error.code?.startsWith('2')) // 2xxxx = client error
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }
  }

  throw new DatabaseError(
    `Operation failed after ${maxRetries} retries: ${lastError!.message}`,
    'MAX_RETRIES_EXCEEDED',
    lastError
  );
}

// Transaction wrapper (using Supabase RPC for complex transactions)
export async function executeTransaction(
  operations: Array<{ table: string; operation: 'insert' | 'update' | 'delete'; data: any; filter?: any }>
): Promise<void> {
  // For now, execute sequentially with rollback on failure
  // In production, consider using database functions for true ACID transactions
  const executed: Array<{ table: string; operation: string; rollback: () => Promise<void> }> = [];

  try {
    for (const op of operations) {
      switch (op.operation) {
        case 'insert': {
          const { data, error } = await (supabase
            .from(op.table as any)
            .insert(op.data)
            .select() as any);
          
          if (error) throw error;
          
          executed.push({
            table: op.table,
            operation: 'insert',
            rollback: async () => {
              if (data && (data as any)[0]?.id) {
                await (supabase.from(op.table as any).delete().eq('id', (data as any)[0].id) as any);
              }
            }
          });
          break;
        }
        case 'update': {
          // Store original data for rollback
          const { data: original } = await (supabase
            .from(op.table as any)
            .select()
            .match(op.filter)
            .single() as any);
          
          const { error } = await (supabase
            .from(op.table as any)
            .update(op.data)
            .match(op.filter) as any);
          
          if (error) throw error;
          
          executed.push({
            table: op.table,
            operation: 'update',
            rollback: async () => {
              if (original) {
                await (supabase.from(op.table as any).update(original).match(op.filter) as any);
              }
            }
          });
          break;
        }
        case 'delete': {
          const { data: toDelete } = await (supabase
            .from(op.table as any)
            .select()
            .match(op.filter) as any);
          
          const { error } = await (supabase
            .from(op.table as any)
            .delete()
            .match(op.filter) as any);
          
          if (error) throw error;
          
          executed.push({
            table: op.table,
            operation: 'delete',
            rollback: async () => {
              if (toDelete && toDelete.length > 0) {
                await (supabase.from(op.table as any).insert(toDelete) as any);
              }
            }
          });
          break;
        }
      }
    }
  } catch (error) {
    // Rollback all executed operations in reverse order
    console.error('Transaction failed, attempting rollback:', error);
    
    for (let i = executed.length - 1; i >= 0; i--) {
      try {
        await executed[i].rollback();
      } catch (rollbackError) {
        console.error(`Rollback failed for ${executed[i].table}:`, rollbackError);
      }
    }
    
    throw new TransactionError(
      `Transaction failed: ${(error as Error).message}`,
      executed.length > 0
    );
  }
}

// Idempotency helper for operations that might be retried
export async function idempotentOperation<T>(
  key: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Check if operation already completed
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('result')
    .eq('key', key)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existing) {
    return existing.result as T;
  }

  // Execute operation
  const result = await operation();

  // Store result for idempotency
  await supabase
    .from('idempotency_keys')
    .insert({
      key,
      result: result as any,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString()
    });

  return result;
}