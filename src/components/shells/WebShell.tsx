import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { layoutPrefs } from '@/lib/layoutPrefs';
import { LayoutGrid, MessageSquare, Map, Focus } from 'lucide-react';

interface WebShellProps {
  left: React.ReactNode;
  right: React.ReactNode;
  header?: React.ReactNode;
}

export function WebShell({ left, right, header }: WebShellProps) {
  const [splitRatio, setSplitRatio] = useState(() => layoutPrefs.get().splitRatio * 100);
  const [focusPanel, setFocusPanel] = useState(() => layoutPrefs.get().focusPanel);

  useEffect(() => {
    layoutPrefs.setSplitRatio(splitRatio / 100);
  }, [splitRatio]);

  useEffect(() => {
    layoutPrefs.setFocusPanel(focusPanel);
  }, [focusPanel]);

  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    if (e.altKey) {
      switch (e.key) {
        case '1':
          e.preventDefault();
          setFocusPanel('chat');
          break;
        case '2':
          e.preventDefault();
          setFocusPanel('board');
          break;
        case '0':
          e.preventDefault();
          setFocusPanel(null);
          break;
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, []);

  if (focusPanel === 'chat') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {header && (
          <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
            {header}
          </header>
        )}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            {left}
          </div>
          <div className="absolute top-4 right-4 z-10">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusPanel('board')}
                className="gap-2"
              >
                <Map className="w-4 h-4" />
                Board
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusPanel(null)}
                className="gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Split
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (focusPanel === 'board') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {header && (
          <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
            {header}
          </header>
        )}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            {right}
          </div>
          <div className="absolute top-4 left-4 z-10">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusPanel('chat')}
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusPanel(null)}
                className="gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Split
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {header && (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          {header}
        </header>
      )}

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute bottom-4 right-4 z-10">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusPanel('board')}
              className="gap-2"
            >
              <Focus className="w-4 h-4" />
              Focus Board
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusPanel('chat')}
              className="gap-2"
            >
              <Focus className="w-4 h-4" />
              Focus Chat
            </Button>
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={splitRatio} minSize={20} maxSize={80}>
            <div className="h-full min-w-0">
              {left}
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />
          
          <ResizablePanel defaultSize={100 - splitRatio} minSize={20} maxSize={80}>
            <div className="h-full min-w-0">
              {right}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}