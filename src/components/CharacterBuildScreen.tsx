import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPartySlots } from '@/services/partyService';
import { transformSeedsToCharacterSeeds, type CharacterLineup } from '@/services/characterService';
import { useToast } from '@/hooks/use-toast';
import { CharacterGenerationScreen } from '@/components/CharacterGenerationScreen';

export default function CharacterBuildScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [game, setGame] = useState<any>(null);
  const [storyOverview, setStoryOverview] = useState<any>(null);
  const [characterSeeds, setCharacterSeeds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generationComplete, setGenerationComplete] = useState(false);

  useEffect(() => {
    if (gameId) {
      loadGameData();
    }
  }, [gameId]);

  const loadGameData = async () => {
    setIsLoading(true);
    try {
      // Load game and campaign seed with story overview
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          campaign_seeds (*)
        `)
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      
      // Extract story overview from campaign seed's story_overview_draft
      const storyOverviewData = (gameData.campaign_seeds as any)?.story_overview_draft;
      if (!storyOverviewData) {
        throw new Error('No story overview found for this game');
      }

      setGame(gameData);
      setStoryOverview(storyOverviewData);

      // Load party slots with character seeds
      const slots = await getPartySlots(gameId!);
      const slotsWithSeeds = slots.filter(slot => 
        (slot.status === 'ready' || slot.status === 'locked') && slot.character_seeds?.length > 0
      );

      if (slotsWithSeeds.length === 0) {
        toast({
          title: "No Character Seeds",
          description: "No players have completed their character setup yet.",
          variant: "destructive"
        });
        navigate(`/lobby/${gameId}`);
        return;
      }

      // Transform to character seeds format
      const seeds = transformSeedsToCharacterSeeds(slotsWithSeeds);
      setCharacterSeeds(seeds);

    } catch (error) {
      console.error('Error loading game data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load game data",
        variant: "destructive"
      });
      navigate(`/lobby/${gameId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerationComplete = useCallback((lineup: CharacterLineup, metrics: any) => {
    console.log('Generation complete, navigating to review');
    setGenerationComplete(true);
    // Navigate to character review screen
    navigate(`/game/${gameId}/characters-review`);
  }, [navigate, gameId]);

  const handleBack = useCallback(() => {
    navigate(`/lobby/${gameId}`);
  }, [navigate, gameId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading game data...</div>
      </div>
    );
  }

  if (!game || !storyOverview || characterSeeds.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Unable to start character generation</h2>
          <p className="text-muted-foreground mb-4">Missing required data for character creation.</p>
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

  if (generationComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Characters Generated!</h2>
          <p className="text-muted-foreground mb-4">Redirecting to character review...</p>
        </div>
      </div>
    );
  }

  return (
    <CharacterGenerationScreen
      game={game}
      storyOverview={storyOverview}
      characterSeeds={characterSeeds}
      onComplete={handleGenerationComplete}
      onBack={handleBack}
    />
  );
}