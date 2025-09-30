// File: src/components/campaign/Phase6Resolutions.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { generatePhase6Resolutions } from '@/ai/flows/phase6-resolutions';
import type { Phase6Output } from '@/ai/schemas';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Phase6ResolutionsProps {
  gameId: string;
  seedId: string;
  userId: string;
  overview: any;
  factions: any;
  nodes: any;
  arcs: any;
  onComplete: (data: Phase6Output) => void;
  onBack: () => void;
}

export function Phase6Resolutions({ 
  gameId, 
  seedId, 
  userId, 
  overview, 
  factions, 
  nodes, 
  arcs, 
  onComplete, 
  onBack 
}: Phase6ResolutionsProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Phase6Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await generatePhase6Resolutions({
        userId,
        gameId,
        seedId,
        context: { overview, factions, nodes, arcs },
        type: 'initial',
      });
      
      if (result.success && result.data) {
        setData(result.data as Phase6Output);
        setMetadata(result.metadata);
      } else {
        setError(result.error || 'Failed to generate resolutions');
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
          <h2 className="text-2xl font-bold">Phase 6: Resolution Paths</h2>
          <p className="text-muted-foreground">Endings, consequences, and epilogues</p>
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
          Generate Resolution Paths
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
          {data.twist && (
            <Card className="bg-accent/10 border-accent">
              <CardContent className="py-4">
                <p className="text-sm font-semibold mb-2">Hidden Twist</p>
                <p className="text-sm">{data.twist}</p>
              </CardContent>
            </Card>
          )}

          <Accordion type="multiple">
            {data.resolutionPaths.map((path) => (
              <AccordionItem key={path.id} value={path.id}>
                <AccordionTrigger className="hover:bg-muted/50 px-4">
                  <div>
                    <span className="font-semibold">{path.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      • {path.epilogues.length} epilogues
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Gates</p>
                    <ul className="text-sm space-y-1">
                      {path.gates.map((gate, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{gate}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Final Setpieces</p>
                    <ul className="text-sm space-y-1">
                      {path.finalSetpieces.map((setpiece, idx) => (
                        <li key={idx} className="border-l-2 border-accent pl-2">{setpiece}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Outcomes</p>
                    <ul className="text-sm space-y-1">
                      {path.outcomes.map((outcome, idx) => (
                        <li key={idx} className="text-muted-foreground">• {outcome}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Epilogues</p>
                    <div className="text-sm space-y-1">
                      {path.epilogues.map((epilogue, idx) => (
                        <p key={idx} className="italic">"{epilogue}"</p>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="flex gap-2 justify-between pt-4">
            <Button variant="outline" onClick={onBack}>Back</Button>
            <Button onClick={() => onComplete(data)} size="lg" className="bg-primary">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Complete Campaign Setup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}