import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Map, 
  Plus, 
  Eye, 
  MapPin, 
  Clock, 
  Users,
  BookOpen,
  Sparkles,
  Mountain,
  Building,
  TreePine
} from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  description: string;
  image?: string;
  isActive: boolean;
  location: string;
  timestamp: string;
}

interface StoryboardPanelProps {
  gameId: string;
}

export function StoryboardPanel({ gameId }: StoryboardPanelProps) {
  const [scenes] = useState<Scene[]>([
    {
      id: '1',
      title: 'The Adventure Begins',
      description: 'Heroes gather at the crossroads, ready to embark on their epic journey.',
      isActive: true,
      location: 'Crossroads Tavern',
      timestamp: '5 minutes ago'
    },
    {
      id: '2', 
      title: 'Mysterious Forest',
      description: 'Ancient trees whisper secrets as the party ventures deeper.',
      isActive: false,
      location: 'Whispering Woods',
      timestamp: 'Upcoming'
    },
    {
      id: '3',
      title: 'Hidden Cave',
      description: 'Strange glowing runes mark the entrance to forgotten depths.',
      isActive: false,
      location: 'Runic Caves',
      timestamp: 'Upcoming'
    }
  ]);

  const [gmNotes] = useState([
    'Party is investigating the missing merchant caravan',
    'Goblin scouts have been spotted in the area',
    'The ancient seal is weakening',
    'Players seem interested in the local folklore'
  ]);

  const activeScene = scenes.find(scene => scene.isActive);

  const getLocationIcon = (location: string) => {
    if (location.includes('Forest') || location.includes('Woods')) return <TreePine className="w-4 h-4" />;
    if (location.includes('Cave') || location.includes('Underground')) return <Mountain className="w-4 h-4" />;
    if (location.includes('Tavern') || location.includes('Town')) return <Building className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-card">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Story Board</h2>
              <p className="text-xs text-muted-foreground">Visual narrative tracking</p>
            </div>
          </div>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Scene
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {/* Active Scene */}
            {activeScene && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="gap-1">
                        <Eye className="w-3 h-3" />
                        Active Scene
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        {getLocationIcon(activeScene.location)}
                        {activeScene.location}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {activeScene.timestamp}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{activeScene.title}</CardTitle>
                  <CardDescription>{activeScene.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-border/50 flex items-center justify-center mb-4">
                    <div className="text-center text-muted-foreground">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Scene visualization</p>
                      <p className="text-xs">Images coming soon</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>4 players active</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>Main storyline</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scene Timeline */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Scene Timeline
              </h3>
              
              <div className="space-y-3">
                {scenes.map((scene, index) => (
                  <Card 
                    key={scene.id} 
                    className={`transition-all cursor-pointer hover:border-accent/50 ${
                      scene.isActive ? 'ring-1 ring-primary/30' : ''
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            scene.isActive ? 'bg-primary' : 
                            scene.timestamp === 'Upcoming' ? 'bg-muted-foreground' : 'bg-accent'
                          }`} />
                          <CardTitle className="text-sm">{scene.title}</CardTitle>
                        </div>
                        <Badge variant="outline" className="gap-1 text-xs">
                          {getLocationIcon(scene.location)}
                          {scene.location}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs ml-4">{scene.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* GM Notes */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                GM Notes
              </h3>
              
              <div className="space-y-2">
                {gmNotes.map((note, index) => (
                  <Card key={index} className="p-3 bg-muted/30">
                    <p className="text-sm text-muted-foreground">{note}</p>
                  </Card>
                ))}
                
                <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                  <Plus className="w-4 h-4" />
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}