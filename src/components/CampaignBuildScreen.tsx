// src/components/CampaignBuildScreen.tsx
// Wrapper screen for the campaign generation pipeline (Phases 3-6)

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignPipeline } from '@/components/campaign/CampaignPipeline';
import type { Phase3Output, Phase4Output, Phase5Output, Phase6Output } from '@/ai/schemas';

export default function CampaignBuildScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<any>(null);

  useEffect(() => {
    if (!gameId) return;
    loadGameData();
  }, [gameId]);

  const loadGameData = async () => {
    if (!gameId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch game with all related data
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          campaign_seeds!inner(
            id,
            story_overview_draft
          ),
          character_lineups(
            id,
            lineup_json,
            created_at
          )
        `)
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      if (!game) {
        throw new Error('Game not found');
      }

      // Get the most recent character lineup
      if (!game.character_lineups || game.character_lineups.length === 0) {
        throw new Error('No character lineup found. Please generate characters first.');
      }

      // Sort by created_at descending and get the latest
      const latestLineup = game.character_lineups.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // Attach the latest lineup to game object for easier access
      (game as any).latest_lineup = latestLineup;

      // Verify game is in correct state
      if (game.status !== 'char_review') {
        throw new Error(
          `Game is in ${game.status} state. Campaign generation requires char_review state.`
        );
      }

      setGameData(game);
    } catch (err) {
      console.error('Error loading game data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game data');

      // Redirect to appropriate screen after error
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignComplete = async (allData: {
    factions: Phase3Output;
    nodes: Phase4Output;
    arcs: Phase5Output;
    resolutions: Phase6Output;
  }) => {
    if (!gameId) return;

    try {
      console.log('Campaign generation complete, saving to database...');

      // Get seed_id from gameData
      const seedId = gameData?.campaign_seeds?.id;
      if (!seedId) {
        throw new Error('No seed ID found');
      }

      // Step 1: Save factions (Phase 3)
      const { data: factionsRecord, error: factionsError } = await supabase
        .from('factions')
        .insert({
          game_id: gameId,
          seed_id: seedId,
          factions_json: allData.factions.factions,
          relationships: allData.factions.relationships,
          fronts: allData.factions.fronts || [],
          provider: 'google',
          model: 'gemini-2.5-flash',
          input_tokens: 0,
          output_tokens: 0,
          status: 'approved',
        })
        .select()
        .single();

      if (factionsError) throw factionsError;

      // Step 2: Save story nodes (Phase 4)
      const { data: nodesRecord, error: nodesError } = await supabase
        .from('story_nodes')
        .insert({
          game_id: gameId,
          seed_id: seedId,
          factions_id: factionsRecord.id,
          nodes_json: allData.nodes.nodes,
          provider: 'google',
          model: 'gemini-2.5-flash',
          input_tokens: 0,
          output_tokens: 0,
          status: 'approved',
        })
        .select()
        .single();

      if (nodesError) throw nodesError;

      // Step 3: Save campaign arcs (Phase 5)
      const { data: arcsRecord, error: arcsError } = await supabase
        .from('campaign_arcs')
        .insert({
          game_id: gameId,
          seed_id: seedId,
          story_nodes_id: nodesRecord.id,
          arcs_json: allData.arcs.arcs,
          provider: 'google',
          model: 'gemini-2.5-flash',
          input_tokens: 0,
          output_tokens: 0,
          status: 'approved',
        })
        .select()
        .single();

      if (arcsError) throw arcsError;

      // Step 4: Save resolutions (Phase 6)
      const { error: resolutionsError } = await supabase
        .from('resolutions')
        .insert({
          game_id: gameId,
          seed_id: seedId,
          campaign_arcs_id: arcsRecord.id,
          resolution_paths_json: allData.resolutions.resolutionPaths,
          twist: allData.resolutions.twist,
          provider: 'google',
          model: 'gemini-2.5-flash',
          input_tokens: 0,
          output_tokens: 0,
          status: 'approved',
        });

      if (resolutionsError) throw resolutionsError;

      // Step 5: Update game status to playing
      const { error: updateError } = await supabase
        .from('games')
        .update({ status: 'playing' })
        .eq('id', gameId);

      if (updateError) throw updateError;

      console.log('Campaign saved successfully!');

      toast({
        title: 'Campaign Ready!',
        description: 'Your campaign has been fully generated and saved. Starting game...',
      });

      // Navigate to game interface
      navigate(`/game/${gameId}`);
    } catch (err) {
      console.error('Error completing campaign:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to start game',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="text-foreground">Loading campaign data...</div>
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
          <div className="text-sm text-muted-foreground">Redirecting...</div>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return null;
  }

  return (
    <CampaignPipelineWrapper
      gameId={gameId!}
      gameData={gameData}
      onComplete={handleCampaignComplete}
      navigate={navigate}
    />
  );
}

// Inner wrapper to handle async user fetch
function CampaignPipelineWrapper({
  gameId,
  gameData,
  onComplete,
  navigate,
}: {
  gameId: string;
  gameData: any;
  onComplete: (data: any) => void;
  navigate: any;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
      } else {
        setUser(user);
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <CampaignPipeline
      gameId={gameId}
      seedId={gameData.campaign_seeds.id}
      userId={user.id}
      overview={gameData.campaign_seeds.story_overview_draft}
      lineup={gameData.latest_lineup.lineup_json}
      onComplete={onComplete}
    />
  );
}
