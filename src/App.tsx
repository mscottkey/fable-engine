import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { LandingPage } from "@/components/LandingPage";
import { AuthPage } from "@/components/AuthPage";
import { Dashboard } from "@/components/Dashboard";
import { JoinGamePage } from "@/components/JoinGamePage";
import { LobbyPage } from "@/components/LobbyPage";
import { GameInterface } from "@/components/GameInterface";
import CharacterBuildScreen from "@/components/CharacterBuildScreen";
import CharacterReviewScreen from "@/components/CharacterReviewScreen";
import { useParams } from "react-router-dom";

function GameInterfaceWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!gameId) return <div>Game not found</div>;
  return <GameInterface gameId={gameId} />;
}
import { Toaster } from "@/components/ui/toaster";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Dashboard user={user} /> : <LandingPage onShowAuth={() => {}} />} />
        <Route path="/auth" element={<AuthPage onBack={() => {}} />} />
        <Route path="/join/:gameId" element={<JoinGamePage />} />
        <Route path="/lobby/:gameId" element={user ? <LobbyPage /> : <Navigate to="/auth" />} />
        <Route path="/game/:gameId/build-characters" element={user ? <CharacterBuildScreen /> : <Navigate to="/auth" />} />
        <Route path="/game/:gameId/characters-review" element={user ? <CharacterReviewScreen /> : <Navigate to="/auth" />} />
        <Route path="/game/:gameId" element={user ? <GameInterfaceWrapper /> : <Navigate to="/auth" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;