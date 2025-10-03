// src/components/CharacterBuildScreen.tsx
// Production-grade version with proper state management

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CharacterGenerationScreen } from '@/components/CharacterGenerationScreen';
import { CharacterGenerationErrorBoundary } from '@/components/ErrorBoundary';
import { 
  getGameWithRelations, 
  getExistingCharacterLineup,
  subscribeToGameUpdates,
  transitionGameState,
  withRetry,
  DatabaseError 
} from '@/services/database/gameService';
import { 
  transformSeedsToCharacterSeeds, 
  saveCharacterLineup, 
  saveCharacters 
} from '@/services/characterService';
import { Loader2 } from 'lucide-react';

export default function CharacterBuildScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [game, setGame] = useState<any>(null);
  const [storyOverview, setStoryOverview] = useState<any>(null);
  const [characterSeeds, setCharacterSeeds] = useState<any[]>([]);
  const [existingLineup, setExistingLineup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount and subscribe to changes
  useEffect(() => {
    if (!gameId) return;

    loadGameData();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToGameUpdates(gameId, (payload) => {
      console.log('Real-time update:', payload);
      loadGameData(); // Reload on any change
    });

    return () => {
      unsubscribe();
    };
  }, [gameId]);

  const loadGameData = async () => {
    if (!gameId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use retry logic for resilience
      const gameData = await withRetry(() => getGameWithRelations(gameId), {
        maxRetries: 3,
        retryDelay: 1000
      });

      console.log('Loaded game data:', gameData);

      // Validate game is in correct state
      if (gameData.status !== 'characters' && gameData.status !== 'lobby') {
        throw new Error(
          `Game is in ${gameData.status} state. Cannot generate characters.`
        );
      }

      // Extract story overview from campaign seed
      const storyOverviewData = gameData.campaign_seeds?.story_overview_draft;
      if (!storyOverviewData) {
        throw new Error('No story overview found. Please complete story creation first.');
      }

      // Map camelCase Phase 1 output to snake_case for UI display
      const enrichedOverview = {
        name: gameData.campaign_seeds?.name || gameData.name || 'Untitled Campaign',
        expanded_setting: storyOverviewData.expandedSetting,
        notable_locations: storyOverviewData.notableLocations,
        tone_manifesto: storyOverviewData.toneManifesto,
        story_hooks: storyOverviewData.storyHooks,
        core_conflict: storyOverviewData.coreConflict,
        session_zero: storyOverviewData.sessionZero,
        campaign_structure: storyOverviewData.campaignStructure
      };

      setGame(gameData);
      setStoryOverview(enrichedOverview);

      // Check if lineup already exists (CRITICAL: prevents regeneration waste)
      const lineup = await getExistingCharacterLineup(gameId);
      
      if (lineup) {
        console.log('Found existing character lineup, loading it instead of regenerating');
        setExistingLineup(lineup);
        
        // Navigate directly to review screen with existing data
        navigate(`/game/${gameId}/characters-review`, {
          state: {
            lineup: lineup.lineup_json,
            storyOverview: storyOverviewData,
            slots: gameData.party_slots,
            fromExisting: true
          }
        });
        return;
      }

      // Extract character seeds from party slots
      const slotsWithSeeds = gameData.party_slots?.filter((slot: any) => 
        (slot.status === 'ready' || slot.status === 'locked') && 
        slot.character_seeds?.length > 0
      ) || [];

      if (slotsWithSeeds.length === 0) {
        throw new Error('No players have completed their character setup yet.');
      }

      // Transform to character seeds format
      const seeds = transformSeedsToCharacterSeeds(slotsWithSeeds);
      setCharacterSeeds(seeds);

      // Transition game to 'characters' state if it's in 'lobby'
      if (gameData.status === 'lobby') {
        try {
          await transitionGameState(gameId, 'characters');
          console.log('Transitioned game to characters state');
        } catch (transitionError) {
          console.error('Failed to transition game state:', transitionError);
          // Non-fatal, continue with generation
        }
      }

    } catch (error) {
      console.error('Error loading game data:', error);
      
      const errorMessage = error instanceof DatabaseError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Failed to load game data';
      
      setError(errorMessage);
      
      toast({
        title: "Error Loading Game",
        description: errorMessage,
        variant: "destructive"
      });

      // Navigate back to lobby after showing error
      setTimeout(() => {
        navigate(`/lobby/${gameId}`);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerationComplete = useCallback(async (lineup: any, metrics: any) => {
    console.log('Generation complete, saving and navigating to review');
    console.log('Received lineup structure:', lineup);
    
    // Normalize character structure (handle both wrapped and unwrapped)
    const rawCharacters = lineup.characterLineup || lineup.characters || [];
    const characters = rawCharacters.map((item: any) => 
      item.character ? item.character : item
    );
    
    const transformedLineup = {
      characters,
      bonds: lineup.partyBonds || lineup.bonds || [],
      coverage: lineup.coverageAnalysis || lineup.coverage || {}
    };
    
    console.log('Transformed lineup:', transformedLineup);
    
    try {
      // CRITICAL FIX: Save draft lineup to database BEFORE navigating
      // This ensures the workflow validator sees that characters exist
      if (!game || !storyOverview) {
        throw new Error('Missing game or story overview data');
      }

      // Save the lineup as a draft
      await saveCharacterLineup(
        gameId!,
        game.seed_id,
        null, // Story data is in campaign_seeds.story_overview_draft
        transformedLineup,
        {
          provider: 'lovable-ai',
          model: 'google/gemini-2.5-flash',
          inputTokens: metrics?.inputTokens || 0,
          outputTokens: metrics?.outputTokens || 0,
          costUsd: metrics?.cost || 0
        }
      );

      // Save individual characters as draft status
      await saveCharacters(
        gameId!, 
        game.seed_id, 
        transformedLineup, 
        game.party_slots || []
      );

      console.log('Draft lineup saved to database');

      // Now navigate to character review screen with required state data
      navigate(`/game/${gameId}/characters-review`, {
        state: {
          lineup: transformedLineup,
          storyOverview,
          slots: characterSeeds,
          metrics
        }
      });
    } catch (error) {
      console.error('Error saving draft lineup:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save character lineup",
        variant: "destructive"
      });
    }
  }, [navigate, gameId, storyOverview, characterSeeds, game, toast]);

  const handleBack = useCallback(() => {
    // Transition back to lobby if user cancels
    if (gameId && game?.status === 'characters') {
      transitionGameState(gameId, 'lobby')
        .then(() => {
          navigate(`/lobby/${gameId}`);
        })
        .catch(() => {
          // Just navigate even if transition fails
          navigate(`/lobby/${gameId}`);
        });
    } else {
      navigate(`/lobby/${gameId}`);
    }
  }, [navigate, gameId, game]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="text-foreground">Loading game data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive font-semibold">Error</div>
          <div className="text-muted-foreground">{error}</div>
          <div className="text-sm text-muted-foreground">
            Redirecting to lobby...
          </div>
        </div>
      </div>
    );
  }

  // Missing required data
  if (!game || !storyOverview || characterSeeds.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Unable to Start Character Generation</h2>
          <p className="text-muted-foreground">Missing required data for character creation.</p>
          <button 
            onClick={handleBack}
            className="text-primary hover:underline"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Already have lineup, shouldn't reach here (should have navigated)
  if (existingLineup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="text-foreground">Loading existing characters...</div>
        </div>
      </div>
    );
  }

  // Render generation screen wrapped in error boundary
  return (
    <CharacterGenerationErrorBoundary onRetry={loadGameData}>
      <CharacterGenerationScreen
        game={game}
        storyOverview={storyOverview}
        characterSeeds={characterSeeds}
        onComplete={handleGenerationComplete}
        onBack={handleBack}
      />
    </CharacterGenerationErrorBoundary>
  );
}