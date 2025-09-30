import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Share2, QrCode, Copy, Users, Link as LinkIcon } from 'lucide-react';

interface HostControlsProps {
  gameId: string;
  inviteCode: string;
  partySize: number;
  onPartySizeChange: (newSize: number) => void;
}

export function HostControls({ gameId, inviteCode, partySize, onPartySizeChange }: HostControlsProps) {
  const { toast } = useToast();
  const [showQRCode, setShowQRCode] = useState(false);
  const [newPartySize, setNewPartySize] = useState(partySize);

  const getInviteLink = () => {
    return `${window.location.origin}/join/${gameId}?code=${inviteCode}`;
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteLink());
      toast({
        title: "Link Copied!",
        description: "Invite link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Couldn't copy link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast({
        title: "Code Copied!",
        description: "Invite code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Couldn't copy code. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const handlePartySizeSubmit = () => {
    if (newPartySize >= 3 && newPartySize <= 6 && newPartySize !== partySize) {
      onPartySizeChange(newPartySize);
    }
  };

  const generateQRCode = () => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getInviteLink())}`;
    return qrCodeUrl;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Host Controls
        </CardTitle>
        <CardDescription>
          Manage your party and share invite codes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Party Size Control */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Party Size</Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min={3}
                max={6}
                value={newPartySize}
                onChange={(e) => setNewPartySize(parseInt(e.target.value) || 3)}
                className="w-20"
              />
            </div>
            <Button 
              onClick={handlePartySizeSubmit}
              disabled={newPartySize === partySize || newPartySize < 3 || newPartySize > 6}
              variant="outline"
              size="sm"
            >
              Update
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current: {partySize} players (3-6 allowed)
          </p>
        </div>

        {/* Invite Code Display */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Game Code</Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-lg px-4 py-2">
              {inviteCode}
            </Badge>
            <Button onClick={copyInviteCode} variant="outline" size="sm">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Players can join by entering this code
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={copyInviteLink} variant="outline" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Copy Invite Link
          </Button>
          
          <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Show QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Join Game QR Code</DialogTitle>
                <DialogDescription>
                  Scan this QR code with a phone to join the game
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center p-6">
                <img 
                  src={generateQRCode()} 
                  alt="Game invite QR code"
                  className="border rounded-lg"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Or use code:</p>
                <Badge variant="outline" className="font-mono text-lg">
                  {inviteCode}
                </Badge>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}