import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdventureStarter } from "@/components/AdventureStarter";
import { GameInterface } from "@/components/GameInterface";

interface Character {
  id: string;
  playerName: string;
  characterName: string;
  concept: string;
}

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [gameIdea, setGameIdea] = useState("");

  const handleStartGame = (newCharacters: Character[], idea: string) => {
    setCharacters(newCharacters);
    setGameIdea(idea);
    setGameStarted(true);
  };

  const handleBackToAdventures = () => {
    setGameStarted(false);
    setCharacters([]);
    setGameIdea("");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar user={user} onBackToAdventures={handleBackToAdventures} gameStarted={gameStarted} />
        
        <main className="flex-1">
          {gameStarted ? (
            <GameInterface
              characters={characters}
              gameIdea={gameIdea}
            />
          ) : (
            <AdventureStarter onStartGame={handleStartGame} />
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}