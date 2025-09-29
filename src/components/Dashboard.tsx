import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdventureStarter } from "@/components/AdventureStarter";
import { GameInterface } from "@/components/GameInterface";

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  const handleStartGame = (gameId: string) => {
    setCurrentGameId(gameId);
    setGameStarted(true);
  };

  const handleBackToAdventures = () => {
    setGameStarted(false);
    setCurrentGameId(null);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar user={user} onBackToAdventures={handleBackToAdventures} gameStarted={gameStarted} />
        
        <main className="flex-1">
          {gameStarted && currentGameId ? (
            <GameInterface gameId={currentGameId} />
          ) : (
            <AdventureStarter onStartGame={handleStartGame} />
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}