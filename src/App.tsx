import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
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
import SettingsPage from "@/components/SettingsPage";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useParams } from "react-router-dom";

function GameInterfaceWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!gameId) return <div>Game not found</div>;
  return <GameInterface gameId={gameId} />;
}

function AppLayout({ children, user }: { children: React.ReactNode; user: User | null }) {
  const [sidebarKey, setSidebarKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show sidebar for landing page and auth page
  const isPublicRoute = location.pathname === '/' && !user || location.pathname === '/auth' || location.pathname.startsWith('/join/');
  
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  const handleBackToAdventures = () => {
    navigate('/');
  };

  const handleOpenSettings = () => {
    navigate('/settings');
  };

  const handleSelectGame = (gameId: string) => {
    navigate(`/lobby/${gameId}`);
  };

  const handleResumeSeed = (seedId: string) => {
    navigate('/');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar
          key={sidebarKey}
          user={user}
          onBackToAdventures={handleBackToAdventures}
          onOpenSettings={handleOpenSettings}
          onSelectGame={handleSelectGame}
          onResumeSeed={handleResumeSeed}
          gameStarted={false}
          currentGameId={null}
        />
        <SidebarInset className="min-w-0">
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
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
      <AppLayoutWrapper user={user} />
      <Toaster />
    </Router>
  );
}

function AppLayoutWrapper({ user }: { user: User | null }) {
  const navigate = useNavigate();
  
  return (
    <AppLayout user={user}>
      <Routes>
        <Route path="/" element={user ? <Dashboard user={user} /> : <LandingPage onShowAuth={() => {}} />} />
        <Route path="/auth" element={<AuthPage onBack={() => {}} />} />
        <Route path="/join/:gameId" element={<JoinGamePage />} />
        <Route path="/settings" element={<SettingsPage onBack={() => navigate('/')} />} />
        <Route path="/lobby/:gameId" element={<LobbyPage />} />
        <Route path="/game/:gameId/build-characters" element={<CharacterBuildScreen />} />
        <Route path="/game/:gameId/characters-review" element={<CharacterReviewScreen />} />
        <Route path="/game/:gameId" element={<GameInterfaceWrapper />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppLayout>
  );
}

export default App;