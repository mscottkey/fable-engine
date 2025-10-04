// File: src/components/campaign/Phase4Nodes.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, RefreshCw, Brain } from 'lucide-react';
import { AIGMThinking } from '@/components/AIGMThinking';
import { supabase } from '@/integrations/supabase/client';
import type { Phase4Output } from '@/ai/schemas';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Phase4NodesProps {
  gameId: string;
  seedId: string;
  userId: string;
  overview: any;
  factions: any;
  onComplete: (data: Phase4Output) => void;
  onBack: () => void;
}

export function Phase4Nodes({ gameId, seedId, userId, overview, factions, onComplete, onBack }: Phase4NodesProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Phase4Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('generate-phase4', {
        body: {
          gameId,
          seedId,
          overview,
          factions,
          type: 'initial',
        }
      });

      if (fnError) throw fnError;

      const actualResult = result || { success: false, error: 'No result returned' };

      if (actualResult.success && actualResult.data) {
        setData(actualResult.data as Phase4Output);
        setMetadata(actualResult.metadata);
      } else {
        throw new Error(actualResult.error || 'Failed to generate nodes');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Phase 4: Story Nodes</h2>
          <p className="text-muted-foreground">Connected web of scenes and encounters</p>
        </div>
        {metadata && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded">
              {metadata.tokensUsed} tokens • ${metadata.cost?.toFixed(4) || '0.0000'}
            </div>
            {metadata.thoughtsTokenCount > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-primary border-l-2 border-primary/50 pl-2">
                  <Brain className="w-3 h-3 inline mr-1" />
                  <span className="font-medium">AI Reasoning:</span> Used {metadata.thoughtsTokenCount} thinking tokens
                </div>
                {metadata.thoughts && (
                  <div className="max-h-32 overflow-y-auto bg-card/50 border border-primary/20 rounded p-2">
                    <p className="text-xs text-foreground/80 italic whitespace-pre-wrap">
                      {metadata.thoughts}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!data && !loading && (
        <Button onClick={handleGenerate} size="lg" className="w-full">
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Story Nodes
        </Button>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-muted-foreground">Generating story nodes and scenes...</span>
              <AIGMThinking stage="Building Story Structure" className="w-full max-w-md" />
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={handleGenerate} variant="outline" className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-4">
          <Accordion type="multiple">
            {data.nodes.map((node) => (
              <AccordionItem key={node.id} value={node.id}>
                <AccordionTrigger className="hover:bg-muted/50 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{node.title}</span>
                    {node.entry && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">ENTRY</span>}
                    {node.setpiece && <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">SETPIECE</span>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 space-y-2">
                  <p className="text-sm">{node.summary}</p>
                  <div className="text-xs text-muted-foreground">
                    Kind: {node.kind} • Stakes: {node.stakes.length} • Obstacles: {node.obstacles.length}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="flex gap-2 justify-between pt-4">
            <Button variant="outline" onClick={onBack}>Back</Button>
            <Button onClick={() => onComplete(data)} size="lg">Approve & Continue</Button>
          </div>
        </div>
      )}
    </div>
  );
}