import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Plus, CheckCircle, Clock, Lock } from 'lucide-react';

interface PartySlotCardProps {
  slot: any;
  onClick: () => void;
  isHost: boolean;
}

export function PartySlotCard({ slot, onClick, isHost }: PartySlotCardProps) {
  const getSlotIcon = () => {
    switch (slot.status) {
      case 'empty':
        return <Plus className="h-4 w-4" />;
      case 'reserved':
        return <Clock className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'locked':
        return <Lock className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getSlotVariant = () => {
    switch (slot.status) {
      case 'empty':
        return 'outline';
      case 'reserved':
        return 'secondary';
      case 'ready':
        return 'default';
      case 'locked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getDisplayName = () => {
    if (slot.character_seeds?.[0]?.display_name) {
      return slot.character_seeds[0].display_name;
    }
    if (slot.status === 'reserved' && slot.claimed_by) {
      return 'Reserved Player';
    }
    return `Player ${slot.index_in_party + 1}`;
  };

  const getSlotDescription = () => {
    switch (slot.status) {
      case 'empty':
        return 'Click to claim this slot';
      case 'reserved':
        return 'Setting up character...';
      case 'ready':
        return slot.character_seeds?.[0]?.concept || 'Character ready!';
      case 'locked':
        return 'Slot locked for character generation';
      default:
        return '';
    }
  };

  const isClickable = () => {
    return slot.status === 'empty' || 
           (slot.status === 'reserved' && slot.claimed_by) ||
           (slot.status === 'ready' && slot.claimed_by);
  };

  return (
    <Card 
      className={`transition-all duration-200 ${
        isClickable() && slot.status !== 'locked' 
          ? 'cursor-pointer hover:shadow-md hover:scale-105' 
          : ''
      }`}
      onClick={isClickable() && slot.status !== 'locked' ? onClick : undefined}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getDisplayName().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{getDisplayName()}</span>
          </div>
          <Badge variant={getSlotVariant()} className="flex items-center gap-1 text-xs">
            {getSlotIcon()}
            <span className="capitalize">{slot.status}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {getSlotDescription()}
        </p>
        
        {slot.character_seeds?.[0] && (
          <div className="space-y-2">
            {slot.character_seeds[0].pronouns && (
              <Badge variant="outline" className="text-xs">
                {slot.character_seeds[0].pronouns}
              </Badge>
            )}
            
            {slot.character_seeds[0].archetype_prefs?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {slot.character_seeds[0].archetype_prefs.slice(0, 2).map((archetype: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {archetype}
                  </Badge>
                ))}
                {slot.character_seeds[0].archetype_prefs.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{slot.character_seeds[0].archetype_prefs.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
        
        {slot.status === 'empty' && (
          <Button 
            variant="ghost" 
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Claim Slot
          </Button>
        )}
        
        {(slot.status === 'reserved' || slot.status === 'ready') && slot.claimed_by && (
          <Button 
            variant="ghost" 
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {slot.status === 'ready' ? 'Edit Character' : 'Create Character'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}