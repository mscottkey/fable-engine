import { useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { GameInterface } from "@/components/GameInterface";
import { GameSetup } from "@/components/GameSetup";

interface Character {
  id: string;
  playerName: string;
  characterName: string;
  highConcept: string;
  trouble: string;
  signatureTrait: string;
}

const Index = () => {
  const [currentView, setCurrentView] = useState<'welcome' | 'setup' | 'game'>('welcome');
  const [gameData, setGameData] = useState<{
    gameIdea: string;
    characters: Character[];
  } | null>(null);
  const [setupGameIdea, setSetupGameIdea] = useState('');

  const handleStartSetup = (gameIdea = '') => {
    setSetupGameIdea(gameIdea);
    setCurrentView('setup');
  };

  const handleStartGame = (data: { gameIdea: string; characters: Character[] }) => {
    setGameData(data);
    setCurrentView('game');
  };

  const handleBackToWelcome = () => {
    setCurrentView('welcome');
    setSetupGameIdea('');
  };

  if (currentView === 'game' && gameData) {
    return <GameInterface characters={gameData.characters} gameIdea={gameData.gameIdea} />;
  }

  if (currentView === 'setup') {
    return (
      <GameSetup 
        onStartGame={handleStartGame}
        onBack={handleBackToWelcome}
        initialGameIdea={setupGameIdea}
      />
    );
  }

  return (
    <WelcomeScreen 
      onStartGame={() => setCurrentView('game')} 
      onStartSetup={handleStartSetup}
    />
  );
};

export default Index;
