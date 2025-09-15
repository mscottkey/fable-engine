import { useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { GameInterface } from "@/components/GameInterface";

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);

  if (gameStarted) {
    return <GameInterface />;
  }

  return <WelcomeScreen onStartGame={() => setGameStarted(true)} />;
};

export default Index;
