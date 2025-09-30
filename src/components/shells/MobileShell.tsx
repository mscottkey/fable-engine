import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { layoutPrefs } from '@/lib/layoutPrefs';
import { MessageSquare, Map, Users, Plus } from 'lucide-react';

interface MobileShellProps {
  tabs: {
    chat: React.ReactNode;
    board: React.ReactNode;
    lobby: React.ReactNode;
  };
  header?: React.ReactNode;
  onFabAction?: () => void;
}

export function MobileShell({ tabs, header, onFabAction }: MobileShellProps) {
  const [activeTab, setActiveTab] = useState(() => layoutPrefs.get().lastTab);

  useEffect(() => {
    layoutPrefs.setLastTab(activeTab as 'chat' | 'board' | 'lobby');
  }, [activeTab]);

  const triggerHapticFeedback = () => {
    try {
      // Try Capacitor Haptics if available
      if ((window as any).Capacitor?.Plugins?.Haptics) {
        (window as any).Capacitor.Plugins.Haptics.impact({ style: 'light' });
      }
    } catch (error) {
      // Gracefully fail on web
    }
  };

  const handleTabChange = (value: string) => {
    triggerHapticFeedback();
    setActiveTab(value as 'chat' | 'board' | 'lobby');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {header && (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          {header}
        </header>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full m-0">
            <div className="h-full relative">
              {tabs.chat}
            </div>
          </TabsContent>
          
          <TabsContent value="board" className="h-full m-0">
            <div className="h-full relative">
              {tabs.board}
            </div>
          </TabsContent>
          
          <TabsContent value="lobby" className="h-full m-0">
            <div className="h-full relative">
              {tabs.lobby}
            </div>
          </TabsContent>
        </div>

        {/* Bottom Tab Bar */}
        <div className="shrink-0 border-t border-border bg-card/90 backdrop-blur-sm">
          <TabsList className="grid w-full grid-cols-3 h-16 bg-transparent p-2">
            <TabsTrigger 
              value="chat" 
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs">Chat</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="board" 
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <Map className="w-5 h-5" />
              <span className="text-xs">Board</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="lobby" 
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <Users className="w-5 h-5" />
              <span className="text-xs">Lobby</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Floating Action Button */}
      {onFabAction && (
        <Button
          onClick={() => {
            triggerHapticFeedback();
            onFabAction();
          }}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg crimson-glow z-50"
          size="sm"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}