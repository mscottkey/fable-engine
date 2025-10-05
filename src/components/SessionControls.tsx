import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Pause, Play, StopCircle, RotateCcw, History } from 'lucide-react';
import { pauseSession, endSession, regenerateStoryIntro, generatePreviouslyOn } from '@/services/sessionService';
import { useToast } from '@/hooks/use-toast';

interface SessionControlsProps {
  session: any;
  isHost: boolean;
  gameId: string;
  onSessionEnd: () => void;
}

export function SessionControls({ session, isHost, gameId, onSessionEnd }: SessionControlsProps) {
  const { toast } = useToast();
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isHost) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          Session {session?.session_number || 1}
        </Badge>
        {session?.status === 'active' && (
          <Badge variant="default" className="gap-1">
            <Play className="w-3 h-3" />
            Active
          </Badge>
        )}
      </div>
    );
  }

  const handlePauseSession = async () => {
    if (!session?.id) return;

    setIsProcessing(true);
    try {
      await pauseSession(session.id);

      toast({
        title: 'Session Paused',
        description: 'Players can resume when you\'re ready to continue.',
      });

      setShowPauseDialog(false);
      onSessionEnd();
    } catch (error) {
      console.error('Failed to pause session:', error);
      toast({
        title: 'Error',
        description: 'Failed to pause session',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndSession = async () => {
    if (!session?.id) return;

    setIsProcessing(true);
    try {
      await endSession(session.id);

      toast({
        title: 'Session Ended',
        description: 'Progress has been saved. Start a new session when you\'re ready.',
      });

      setShowEndDialog(false);
      onSessionEnd();
    } catch (error) {
      console.error('Failed to end session:', error);
      toast({
        title: 'Error',
        description: 'Failed to end session',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateIntro = async () => {
    if (!session?.id) return;

    setIsProcessing(true);
    try {
      await regenerateStoryIntro(gameId, session.id);

      toast({
        title: 'Story Intro Regenerated',
        description: 'The opening story message has been added to the storyboard.',
      });

      onSessionEnd(); // Refresh to show new event
    } catch (error) {
      console.error('Failed to regenerate intro:', error);
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateRecap = async () => {
    if (!session?.id) return;

    setIsProcessing(true);
    try {
      await generatePreviouslyOn(gameId, session.id);

      toast({
        title: 'Recap Generated',
        description: '"Previously on..." message has been added to the storyboard.',
      });

      onSessionEnd(); // Refresh to show new event
    } catch (error) {
      console.error('Failed to generate recap:', error);
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          Session {session?.session_number || 1}
        </Badge>
        {session?.status === 'active' && (
          <Badge variant="default" className="gap-1">
            <Play className="w-3 h-3" />
            Active
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Session Controls</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleRegenerateIntro} disabled={isProcessing}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate Story Intro
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleGenerateRecap}
              disabled={isProcessing || session?.session_number === 1}
            >
              <History className="w-4 h-4 mr-2" />
              Generate "Previously On..."
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setShowPauseDialog(true)} disabled={isProcessing}>
              <Pause className="w-4 h-4 mr-2" />
              Pause Session
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowEndDialog(true)}
              className="text-destructive focus:text-destructive"
              disabled={isProcessing}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              End Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pause Confirmation */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will pause the current session. You can resume it later, or start a new session.
              All progress will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePauseSession} disabled={isProcessing}>
              {isProcessing ? 'Pausing...' : 'Pause Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Confirmation */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently end Session {session?.session_number}. You won't be able to resume it.
              Start a new session when you're ready to continue the campaign.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Ending...' : 'End Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
