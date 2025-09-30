import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { AdventureStarter } from "@/components/AdventureStarter";
import { GameInterface } from "@/components/GameInterface";
import { StoryBuilder } from "@/components/StoryBuilder";
import SettingsPage from "@/components/SettingsPage";
import { CampaignSeed } from "@/types/database";

interface DashboardProps {
  user: User;
}

type DashboardState = 'adventures' | 'story-builder' | 'game' | 'settings';

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
    console.log('Story completed, navigating to game:', gameId);
    // Add a small delay to ensure the database transaction is fully committed
    setTimeout(() => {
      navigate(`/lobby/${gameId}`);
    }, 100);
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

  const handleOpenSettings = () => {
    setState('settings');
  };

  return (
    <>
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
      {state === 'settings' && (
        <SettingsPage onBack={handleBackToAdventures} />
      )}
    </>
  );
}
