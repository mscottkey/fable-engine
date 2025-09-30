import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { AdventureStarter } from "@/components/AdventureStarter";
import { GameInterface } from "@/components/GameInterface";
import { StoryBuilder } from "@/components/StoryBuilder";
import { CampaignSeed } from "@/types/database";

interface DashboardProps {
  user: User;
}

type DashboardState = 'adventures' | 'story-builder' | 'game';

export function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<DashboardState>('adventures');
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [campaignSeed, setCampaignSeed] = useState<CampaignSeed | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);

  const handleStartStoryBuilder = (seed: CampaignSeed) => {
    setCampaignSeed(seed);
    setState('story-builder');
  };

  const handleStoryComplete = (gameId: string) => {
    // Navigate to the lobby for character onboarding instead of directly to game
    navigate(`/lobby/${gameId}`);
  };

  const handleSelectGame = async (gameId: string) => {
    try {
      // Fetch the game to check its status
      const { data: game, error } = await supabase
        .from('games')
        .select('id, status')
        .eq('id', gameId)
        .single();

      if (error || !game) {
        console.error('Failed to fetch game:', error);
        return;
      }

      setCurrentGameId(gameId);
      
      // Route based on game status
      if (game.status === 'lobby') {
        // Navigate to lobby page for character onboarding
        navigate(`/lobby/${gameId}`);
      } else {
        // For setup or playing status, go to game interface
        setState('game');
      }
    } catch (error) {
      console.error('Error selecting game:', error);
    }
  };

  const handleResumeSeed = async (seedId: string) => {
    try {
      // Fetch the campaign seed to resume story building
      const { data: seed, error } = await supabase
        .from('campaign_seeds')
        .select('*')
        .eq('id', seedId)
        .single();

      if (error || !seed) {
        console.error('Failed to fetch campaign seed:', error);
        return;
      }

      setCampaignSeed(seed);
      setState('story-builder');
    } catch (error) {
      console.error('Error resuming seed:', error);
    }
  };

  const handleBackToAdventures = () => {
    setState('adventures');
    setCurrentGameId(null);
    setCampaignSeed(null);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar
          key={sidebarKey}
          user={user}
          onBackToAdventures={handleBackToAdventures}
          onSelectGame={handleSelectGame}
          onResumeSeed={handleResumeSeed}
          gameStarted={state === 'game'}
          currentGameId={currentGameId}
        />
        {/* SidebarInset applies the left offset using CSS vars; allow content to shrink */}
        <SidebarInset className="min-w-0">
          <main className="flex-1 min-w-0">
            {state === 'adventures' && (
              <AdventureStarter onStartStoryBuilder={handleStartStoryBuilder} />
            )}
            {state === 'story-builder' && campaignSeed && (
              <StoryBuilder
                campaignSeed={campaignSeed}
                onComplete={handleStoryComplete}
                onBack={handleBackToAdventures}
              />
            )}
            {state === 'game' && currentGameId && (
              <GameInterface gameId={currentGameId} />
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
