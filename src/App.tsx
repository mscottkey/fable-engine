// src/App.tsx
// Production-grade root application component with proper routing and state management
// Trigger rebuild: deploy migrations and edge functions #2
// Trigger again
import { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
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
import CampaignBuildScreen from "@/components/CampaignBuildScreen";
import SettingsPage from "@/components/SettingsPage";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// ============================================================================
// Game Interface Wrapper
// ============================================================================

function GameInterfaceWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  
  if (!gameId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Game Not Found</h2>
          <p className="text-muted-foreground">The requested game could not be found.</p>
        </div>
      </div>
    );
  }
  
  return <GameInterface gameId={gameId} />;
}

// ============================================================================
// App Layout with Sidebar
// ============================================================================

function AppLayout({ children, user }: { children: React.ReactNode; user: User | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  // Determine if we're on a public route (no sidebar needed)
  const isPublicRoute = 
    (location.pathname === '/' && !user) || 
    location.pathname === '/auth' || 
    location.pathname.startsWith('/join/');
  
  // Public routes don't show sidebar
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Require authentication for protected routes
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Determine if we're in an active game
  const gameStarted = location.pathname.startsWith('/game/') && 
                      !location.pathname.includes('/build-characters') &&
                      !location.pathname.includes('/characters-review');

  // Extract current game ID from route if applicable
  useEffect(() => {
    const match = location.pathname.match(/\/(game|lobby)\/([a-f0-9-]+)/);
    if (match) {
      setCurrentGameId(match[2]);
    } else {
      setCurrentGameId(null);
    }
  }, [location.pathname]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const handleBackToAdventures = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleOpenSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const handleSelectGame = useCallback(async (gameId: string) => {
    try {
      // Fetch game to determine correct route based on status
      const { data: game, error } = await supabase
        .from('games')
        .select('id, status, party_locked')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Failed to fetch game:', error);
        toast({
          title: "Unable to Open Game",
          description: "Could not load game information. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (!game) {
        toast({
          title: "Game Not Found",
          description: "This game no longer exists.",
          variant: "destructive"
        });
        return;
      }

      // Route based on game status using state machine logic
      switch (game.status) {
        case 'draft':
        case 'story_review':
          // Story creation phase - stay on dashboard
          navigate('/');
          toast({
            title: "Story In Progress",
            description: "Complete the story creation first.",
          });
          break;
          
        case 'lobby':
          // Lobby phase - players joining and setting up characters
          navigate(`/lobby/${gameId}`);
          break;
          
        case 'characters':
          // Character generation in progress
          if (game.party_locked) {
            navigate(`/game/${gameId}/build-characters`);
          } else {
            navigate(`/lobby/${gameId}`);
          }
          break;
          
        case 'char_review':
          // Character review/approval phase
          navigate(`/game/${gameId}/characters-review`);
          break;
          
        case 'playing':
        case 'paused':
          // Active game session
          navigate(`/game/${gameId}`);
          break;
          
        case 'completed':
          // Completed game - view only
          navigate(`/game/${gameId}`);
          toast({
            title: "Game Completed",
            description: "This game has been completed.",
          });
          break;
          
        case 'abandoned':
          // Abandoned game
          toast({
            title: "Game Abandoned",
            description: "This game has been abandoned.",
            variant: "destructive"
          });
          break;
          
        default:
          // Unknown status - default to lobby
          console.warn(`Unknown game status: ${game.status}`);
          navigate(`/lobby/${gameId}`);
      }
    } catch (error) {
      console.error('Error selecting game:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while opening the game.",
        variant: "destructive"
      });
    }
  }, [navigate, toast]);

  const handleResumeSeed = useCallback((seedId: string) => {
    // Navigate to story route with seed ID
    navigate(`/story/${seedId}`);
  }, [navigate]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar
          user={user}
          onBackToAdventures={handleBackToAdventures}
          onOpenSettings={handleOpenSettings}
          onSelectGame={handleSelectGame}
          onResumeSeed={handleResumeSeed}
          gameStarted={gameStarted}
          currentGameId={currentGameId}
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

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-foreground">Loading RoleplAI GM...</div>
        </div>
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

// ============================================================================
// Layout Wrapper for Routes
// ============================================================================

function AppLayoutWrapper({ user }: { user: User | null }) {
  const navigate = useNavigate();
  
  return (
    <AppLayout user={user}>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={user ? <Dashboard user={user} /> : <LandingPage onShowAuth={() => navigate('/auth')} />} 
        />
        <Route 
          path="/story/:seedId" 
          element={user ? <Dashboard user={user} /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/auth" 
          element={<AuthPage onBack={() => navigate('/')} />} 
        />
        <Route 
          path="/join" 
          element={<JoinGamePage />} 
        />
        <Route 
          path="/join/:gameId" 
          element={<JoinGamePage />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/settings" 
          element={user ? <SettingsPage onBack={() => navigate('/')} /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/lobby/:gameId" 
          element={user ? <LobbyPage /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/game/:gameId/build-characters" 
          element={user ? <CharacterBuildScreen /> : <Navigate to="/auth" replace />} 
        />
        <Route
          path="/game/:gameId/characters-review"
          element={user ? <CharacterReviewScreen /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/game/:gameId/campaign-build"
          element={user ? <CampaignBuildScreen /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/game/:gameId"
          element={user ? <GameInterfaceWrapper /> : <Navigate to="/auth" replace />}
        />
        
        {/* Catch-all redirect */}
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </AppLayout>
  );
}

export default App;
