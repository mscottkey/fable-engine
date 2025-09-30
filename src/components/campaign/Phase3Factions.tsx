// File: src/components/campaign/Phase3Factions.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { generatePhase3Factions } from '@/ai/flows/phase3-factions';
import type { Phase3Output, Faction, ProjectClock } from '@/ai/schemas';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Phase3FactionsProps {
  gameId: string;
  seedId: string;
  userId: string;
  overview: any;
  lineup: any;
  onComplete: (data: Phase3Output) => void;
  onBack: () => void;
}

export function Phase3Factions({
  gameId,
  seedId,
  userId,
  overview,
  lineup,
  onComplete,
  onBack,
}: Phase3FactionsProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Phase3Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  
  // Regen state
  const [regenTarget, setRegenTarget] = useState<string | null>(null);
  const [regenFeedback, setRegenFeedback] = useState('');
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  
  // Remix state
  const [remixDialogOpen, setRemixDialogOpen] = useState(false);
  const [remixBrief, setRemixBrief] = useState('');
  const [preserveNouns, setPreserveNouns] = useState(false);
  
  // Inline editing
  const [editedData, setEditedData] = useState<Phase3Output | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await generatePhase3Factions({
        userId,
        gameId,
        seedId,
        context: { overview, lineup },
        type: 'initial',
      });
      
      if (result.success && result.data) {
        setData(result.data as Phase3Output);
        setEditedData(result.data as Phase3Output);
        setMetadata(result.metadata);
      } else {
        setError(result.error || 'Failed to generate factions');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegen = async () => {
    if (!regenTarget || !data) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await generatePhase3Factions({
        userId,
        gameId,
        seedId,
        context: { overview, lineup },
        type: 'regen',
        targetId: regenTarget,
        feedback: regenFeedback,
        currentData: data,
      });
      
      if (result.success && result.data) {
        // Merge regen result back into data
        const updated = { ...data };
        
        if (regenTarget === 'relations') {
          updated.relationships = (result.data as any).relationships;
        } else if (regenTarget.startsWith('clock-')) {
          // Update specific clock
          const [_, factionId, clockName] = regenTarget.split('-');
          const factionIndex = updated.factions.findIndex(f => f.id === factionId);
          if (factionIndex >= 0) {
            const clockIndex = updated.factions[factionIndex].projects.findIndex(p => p.name === clockName);
            if (clockIndex >= 0) {
              updated.factions[factionIndex].projects[clockIndex] = (result.data as any).clock;
            }
          }
        } else {
          // Update faction
          const factionIndex = updated.factions.findIndex(f => f.id === regenTarget);
          if (factionIndex >= 0) {
            updated.factions[factionIndex] = (result.data as any).faction;
          }
        }
        
        setData(updated);
        setEditedData(updated);
        setMetadata(result.metadata);
        setRegenDialogOpen(false);
        setRegenFeedback('');
      } else {
        setError(result.error || 'Failed to regenerate');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemix = async () => {
    if (!data) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await generatePhase3Factions({
        userId,
        gameId,
        seedId,
        context: { overview, lineup },
        type: 'remix',
        remixBrief,
        preserveNouns,
        currentData: data,
      });
      
      if (result.success && result.data) {
        setData(result.data as Phase3Output);
        setEditedData(result.data as Phase3Output);
        setMetadata(result.metadata);
        setRemixDialogOpen(false);
        setRemixBrief('');
      } else {
        setError(result.error || 'Failed to remix');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openRegenDialog = (targetId: string) => {
    setRegenTarget(targetId);
    setRegenFeedback('');
    setRegenDialogOpen(true);
  };

  const handleApprove = () => {
    if (editedData) {
      onComplete(editedData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Phase 3: Factions & Clocks</h2>
          <p className="text-muted-foreground">Build the power map and project clocks</p>
        </div>
        
        {metadata && (
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded">
            {metadata.provider}/{metadata.model} • {metadata.tokensUsed} tokens • 
            ${metadata.cost.toFixed(4)} • {metadata.latency}ms
          </div>
        )}
      </div>

      {/* Context Panel */}
      <Card className="bg-sidebar">
        <CardHeader>
          <CardTitle className="text-sm">Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>Story:</strong> {overview.coreConflict}
          </div>
          <div>
            <strong>Characters:</strong> {lineup.characters.length} PCs ready
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      {!data && !loading && (
        <Button onClick={handleGenerate} size="lg" className="w-full">
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Factions & Clocks
        </Button>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Generating factions...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
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

      {/* Results */}
      {editedData && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => setRemixDialogOpen(true)} variant="outline">
              <Sparkles className="mr-2 h-4 w-4" />
              Full Remix
            </Button>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {/* Factions */}
            {editedData.factions.map((faction, idx) => (
              <AccordionItem key={faction.id} value={faction.id}>
                <AccordionTrigger className="hover:bg-muted/50 px-4">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold">{faction.name}</span>
                    <span className="text-xs text-muted-foreground">{faction.oneLine}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-2 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Goal</Label>
                    <p className="text-sm">{faction.goal}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Methods</Label>
                    <p className="text-sm">{faction.methods}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Leader</Label>
                    <p className="text-sm"><strong>{faction.leader.name}</strong> ({faction.leader.pronouns})</p>
                    <p className="text-sm">{faction.leader.profile}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Project Clocks</Label>
                    <div className="space-y-2 mt-1">
                      {faction.projects.map((clock) => (
                        <div key={clock.name} className="border rounded p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{clock.name}</span>
                            <span className="text-xs">{clock.filled}/{clock.clockSize}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{clock.impact}</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => openRegenDialog(`clock-${faction.id}-${clock.name}`)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Regenerate Clock
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openRegenDialog(faction.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Faction
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}

            {/* Relationships */}
            <AccordionItem value="relationships">
              <AccordionTrigger className="hover:bg-muted/50 px-4">
                <span className="font-semibold">Relationships ({editedData.relationships.length})</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2 space-y-2">
                {editedData.relationships.map((rel, idx) => (
                  <div key={idx} className="border-l-2 border-primary pl-3">
                    <p className="text-sm">
                      <strong>{rel.a}</strong> ↔ <strong>{rel.b}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">{rel.type}: {rel.why}</p>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => openRegenDialog('relations')}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate Relationships
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Actions */}
          <div className="flex gap-2 justify-between pt-4">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleApprove} size="lg">
              Approve & Continue
            </Button>
          </div>
        </div>
      )}

      {/* Regen Dialog */}
      <Dialog open={regenDialogOpen} onOpenChange={setRegenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate</DialogTitle>
            <DialogDescription>
              Provide feedback to improve this element
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>What would you like to improve?</Label>
              <Textarea
                value={regenFeedback}
                onChange={(e) => setRegenFeedback(e.target.value)}
                placeholder="E.g., Make this faction more mysterious..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegen} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remix Dialog */}
      <Dialog open={remixDialogOpen} onOpenChange={setRemixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Remix</DialogTitle>
            <DialogDescription>
              Completely reimagine the faction landscape
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Remix Brief</Label>
              <Textarea
                value={remixBrief}
                onChange={(e) => setRemixBrief(e.target.value)}
                placeholder="E.g., More shadow wars, less bureaucracy..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserveNouns"
                checked={preserveNouns}
                onCheckedChange={(checked) => setPreserveNouns(checked as boolean)}
              />
              <Label htmlFor="preserveNouns" className="text-sm">
                Preserve current proper nouns
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemixDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRemix} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}