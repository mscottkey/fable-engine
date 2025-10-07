import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { joinGameWithCode } from '@/services/partyService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function JoinGamePage() {
  const { gameId } = useParams<{ gameId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [user, setUser] = useState(null);
  
  const codeFromUrl = searchParams.get('code');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Store the intended destination for redirect after login
        const basePath = gameId ? `/join/${gameId}` : '/join';
        const returnUrl = `${basePath}${codeFromUrl ? `?code=${codeFromUrl}` : ''}`;
        localStorage.setItem('authRedirectUrl', returnUrl);
        navigate('/auth');
        return;
      }

      setUser(user);
      
      // If we have a code from URL, auto-join
      if (codeFromUrl && gameId) {
        handleJoinGame(codeFromUrl);
      }
    };

    checkAuth();
  }, [gameId, codeFromUrl, navigate]);

  const handleJoinGame = async (code: string) => {
    if (!code) return;
    
    setIsLoading(true);
    try {
      const joinedGameId = await joinGameWithCode(code, { gameId });
      toast({
        title: "Joined Game!",
        description: "Welcome to the party. Redirecting to lobby...",
      });
      navigate(`/lobby/${joinedGameId}`);
    } catch (error: any) {
      toast({
        title: "Failed to Join",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualJoin = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter a game code to join.",
        variant: "destructive",
      });
      return;
    }
    handleJoinGame(manualCode.trim().toUpperCase());
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Join Game</CardTitle>
          <CardDescription>
            {codeFromUrl 
              ? "Processing your invitation..." 
              : "Enter the game code to join the party"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!codeFromUrl && (
            <>
              <div className="space-y-2">
                <Label htmlFor="gameCode">Game Code</Label>
                <Input
                  id="gameCode"
                  placeholder="e.g., K7Q2XM"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="text-center font-mono text-lg tracking-wider"
                />
              </div>
              
              <Button 
                onClick={handleManualJoin}
                disabled={isLoading || !manualCode.trim()}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join Game
              </Button>
            </>
          )}
          
          {isLoading && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Joining game...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
