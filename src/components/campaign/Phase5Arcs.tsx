// File: src/components/campaign/Phase5Arcs.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { generatePhase5Arcs } from '@/ai/flows/phase5-arcs';
import type { Phase5Output } from '@/ai/schemas';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Phase5ArcsProps {
  gameId: string;
  seedId: string;
  userId: string;
  overview: any;
  factions: any;
  nodes: any;
  onComplete: (data: Phase5Output) => void;
  onBack: () => void;
}

export function Phase5Arcs({ gameId, seedId, userId, overview, factions, nodes, onComplete, onBack }: Phase5ArcsProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Phase5Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await generatePhase5Arcs({
        userId,
        gameId,
        seedId,
        context: { overview, factions, nodes },
        type: 'initial',
      });
      
      if (result.success && result.data) {
        setData(result.data as Phase5Output);
        setMetadata(result.metadata);
      } else {
        setError(result.error || 'Failed to generate arcs');
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
          <h2 className="text-2xl font-bold">Phase 5: Campaign Arcs</h2>
          <p className="text-muted-foreground">Escalation map with beats and conditions</p>
        </div>
        {metadata && (
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded">
            {metadata.tokensUsed} tokens • ${metadata.cost.toFixed(4)}
          </div>
        )}
      </div>

      {!data && !loading && (
        <Button onClick={handleGenerate} size="lg" className="w-full">
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Campaign Arcs
        </Button>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            {data.arcs.map((arc) => (
              <AccordionItem key={arc.id} value={arc.id}>
                <AccordionTrigger className="hover:bg-muted/50 px-4">
                  <div>
                    <span className="font-semibold">{arc.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">• {arc.beats.length} beats</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 space-y-3">
                  <p className="text-sm italic">{arc.theme}</p>
                  <div className="space-y-2">
                    {arc.beats.map((beat) => (
                      <div key={beat.id} className="border-l-2 border-primary pl-3">
                        <p className="text-sm font-medium">{beat.title}</p>
                        <p className="text-xs text-muted-foreground">{beat.objective}</p>
                        <p className="text-xs mt-1"><em>{beat.foreshadow}</em></p>
                      </div>
                    ))}
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