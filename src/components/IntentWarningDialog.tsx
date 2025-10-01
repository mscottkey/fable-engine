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
import { AlertTriangle } from 'lucide-react';

interface IntentWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divergenceReason: string;
  alternativeAction?: string;
  onProceed: () => void;
  onCancel: () => void;
}

export function IntentWarningDialog({
  open,
  onOpenChange,
  divergenceReason,
  alternativeAction,
  onProceed,
  onCancel
}: IntentWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <AlertDialogTitle>Off-Track Action Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div>
                <Badge variant="outline" className="mb-2">
                  AI Story Analyzer
                </Badge>
                <p className="text-sm text-foreground">{divergenceReason}</p>
              </div>

              {alternativeAction && (
                <div className="bg-accent/20 p-3 rounded-md border border-accent/30">
                  <p className="text-xs font-medium text-accent mb-1">Suggested Alternative:</p>
                  <p className="text-sm text-foreground">{alternativeAction}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                You can proceed with your action (the GM will adapt), or cancel to choose something else.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel & Revise
          </AlertDialogCancel>
          <AlertDialogAction onClick={onProceed}>
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
