// src/components/CharacterReviewScreen.tsx
// Production-grade version with proper state management

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  getGameWithRelations,
  getExistingCharacterLineup,
  subscribeToGameUpdates,
  transitionGameState,
  withRetry,
  DatabaseError
} from '@/services/database/gameService';
import { 
  regenerateCharacter, 
  regenerateBonds, 
  remixLineup, 
  saveCharacterLineup, 
  saveCharacters,
  type CharacterLineup, 
  type Character 
} from '@/services/characterService';
import { sanitizeCharacterLineup } from '@/services/ipSanitizerService';
import { GameSessionErrorBoundary } from '@/components/ErrorBoundary';
import { 
  ArrowLeft, 
  RefreshCw, 
  Shuffle, 
  CheckCircle, 
  Edit, 
  Users, 
  Zap, 
  AlertCircle,
  Sparkles,
  Loader2,
  Save,
  X
} from 'lucide-react';

export default function CharacterReviewScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Core state
  const [lineup, setLineup] = useState<CharacterLineup | null>(null);
  const [storyOverview, setStoryOverview] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [game, setGame] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);
  const [tempCharacter, setTempCharacter] = useState<Character | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingType, setRegeneratingType] = useState<string>('');
  const [showRemixDialog, setShowRemixDialog] = useState(false);
  const [remixBrief, setRemixBrief] = useState('');
  const [regenFeedback, setRegenFeedback] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Load data on mount and subscribe to real-time updates
  useEffect(() => {
    if (!gameId) return;

    loadLineupData();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToGameUpdates(gameId, (payload) => {
      console.log('Real-time update in CharacterReview:', payload);
      loadLineupData();
    });

    return () => {
      unsubscribe();
    };
  }, [gameId]);

  const loadLineupData = async () => {
    if (!gameId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load game with all relations using retry logic
      const gameData = await withRetry(() => getGameWithRelations(gameId), {
        maxRetries: 3,
        retryDelay: 1000
      });

      console.log('Loaded game data:', gameData);

      // Validate game is in correct state
      if (gameData.status !== 'char_review' && gameData.status !== 'characters') {
        throw new Error(
          `Game is in ${gameData.status} state. Cannot review characters.`
        );
      }

      setGame(gameData);

      // Extract story overview
      const storyOverviewData = gameData.campaign_seeds?.story_overview_draft;
      if (!storyOverviewData) {
        throw new Error('No story overview found.');
      }
      setStoryOverview(storyOverviewData);

      // Extract slots
      setSlots(gameData.party_slots || []);

      // Try to load from database first (PRIMARY SOURCE)
      const existingLineup = await getExistingCharacterLineup(gameId);
      
      if (existingLineup) {
        console.log('Loaded existing lineup from database');
        setLineup(existingLineup.lineup_json as any);
      } else {
        // Fallback to navigation state (only on first load from generation)
        const state = location.state as any;
        if (state?.lineup) {
          console.log('Using lineup from navigation state');
          setLineup(state.lineup);
        } else {
          // No lineup found anywhere - redirect back to generation
          throw new Error('No character lineup found. Please generate characters first.');
        }
      }

      // Ensure game is in char_review state
      if (gameData.status === 'characters') {
        try {
          await transitionGameState(gameId, 'char_review');
          console.log('Transitioned game to char_review state');
        } catch (transitionError) {
          console.error('Failed to transition to char_review:', transitionError);
          // Non-fatal, continue
        }
      }

    } catch (error) {
      console.error('Error loading lineup data:', error);
      
      const errorMessage = error instanceof DatabaseError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Failed to load character lineup';
      
      setError(errorMessage);
      
      toast({
        title: "Error Loading Characters",
        description: errorMessage,
        variant: "destructive"
      });

      // Redirect back to character generation
      setTimeout(() => {
        navigate(`/game/${gameId}/build-characters`);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCharacter = useCallback((characterIndex: number) => {
    if (lineup) {
      setEditingCharacter(characterIndex);
      setTempCharacter({ ...lineup.characters[characterIndex] });
    }
  }, [lineup]);

  const handleSaveCharacterEdit = useCallback(() => {
    if (editingCharacter !== null && tempCharacter && lineup) {
      const newCharacters = [...lineup.characters];
      newCharacters[editingCharacter] = tempCharacter;
      setLineup({ ...lineup, characters: newCharacters });
      setEditingCharacter(null);
      setTempCharacter(null);
      
      toast({
        title: "Character Updated",
        description: "Your changes have been saved locally. Remember to approve the lineup to persist changes."
      });
    }
  }, [editingCharacter, tempCharacter, lineup, toast]);

  const handleCancelEdit = useCallback(() => {
    setEditingCharacter(null);
    setTempCharacter(null);
  }, []);

  const handleRegenerateCharacter = async (characterIndex: number) => {
    if (!lineup || !storyOverview || !gameId) return;

    setIsRegenerating(true);
    setRegeneratingType(`character-${characterIndex}`);

    try {
      const seed = transformSlotToSeed(slots[characterIndex], characterIndex);
      const currentParty = lineup.characters.filter((_, i) => i !== characterIndex);
      
      const newCharacter = await regenerateCharacter(
        gameId,
        characterIndex,
        seed,
        currentParty,
        storyOverview,
        regenFeedback
      );

      const newCharacters = [...lineup.characters];
      newCharacters[characterIndex] = newCharacter;
      setLineup({ ...lineup, characters: newCharacters });
      
      toast({
        title: "Character Regenerated",
        description: "A new version has been created."
      });
      
      setRegenFeedback('');
    } catch (error: any) {
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRegenerating(false);
      setRegeneratingType('');
    }
  };

  const handleRegenerateBonds = async () => {
    if (!lineup || !storyOverview || !gameId) return;

    setIsRegenerating(true);
    setRegeneratingType('bonds');

    try {
      const newBonds = await regenerateBonds(gameId, lineup.characters, storyOverview);
      setLineup({ ...lineup, bonds: newBonds });
      
      toast({
        title: "Bonds Regenerated",
        description: "New character relationships have been created."
      });
    } catch (error: any) {
      toast({
        title: "Bond Regeneration Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRegenerating(false);
      setRegeneratingType('');
    }
  };

  const handleRemixLineup = async () => {
    if (!lineup || !storyOverview || !gameId) return;

    setIsRegenerating(true);
    setRegeneratingType('remix');

    try {
      const seeds = transformSlotsToSeeds(slots);
      const newLineup = await remixLineup(gameId, seeds, storyOverview, lineup, remixBrief);
      setLineup(newLineup);
      
      toast({
        title: "Lineup Remixed",
        description: "A completely new character lineup has been created."
      });
      
      setShowRemixDialog(false);
      setRemixBrief('');
    } catch (error: any) {
      toast({
        title: "Remix Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRegenerating(false);
      setRegeneratingType('');
    }
  };

  const handleApproveLineup = async () => {
    if (!lineup || !game || !storyOverview || !gameId) return;

    setIsApproving(true);

    try {
      // Try to run IP sanitizer on the final lineup (optional, won't block if it fails)
      let sanitizedLineup = lineup;
      try {
        const result = await sanitizeCharacterLineup(lineup);
        sanitizedLineup = result.sanitizedLineup;
        
        if (result.changes.length > 0) {
          toast({
            title: "Content Sanitized",
            description: `${result.changes.length} potential IP issues were automatically fixed.`,
          });
        }
      } catch (sanitizeError) {
        console.warn('IP sanitization failed, continuing with original content:', sanitizeError);
        // Continue with original lineup - sanitization is optional
      }
      
      // Save the approved lineup to character_lineups table
      const lineupId = await saveCharacterLineup(
        gameId,
        game.seed_id,
        null, // Story data is in campaign_seeds.story_overview_draft, not a separate table
        sanitizedLineup,
        {
          provider: 'lovable-ai',
          model: 'google/gemini-2.5-flash',
          inputTokens: 0, // Would be tracked from generation
          outputTokens: 0,
          costUsd: 0
        }
      );

      console.log('Saved character lineup:', lineupId);

      // Save individual characters to characters table
      await saveCharacters(gameId, game.seed_id, sanitizedLineup, slots);

      console.log('Saved individual characters');

      // Transition game to playing state
      await transitionGameState(gameId, 'playing');

      console.log('Transitioned to playing state');

      toast({
        title: "Lineup Approved!",
        description: "Characters have been finalized and the game is ready to begin."
      });

      // Navigate to the main game interface
      navigate(`/game/${gameId}`);
      
    } catch (error: any) {
      console.error('Approval failed:', error);
      
      toast({
        title: "Approval Failed",
        description: error instanceof DatabaseError 
          ? error.message 
          : error.message || 'Failed to approve lineup',
        variant: "destructive"
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleBack = useCallback(() => {
    // Transition back to characters state if needed
    if (gameId && game?.status === 'char_review') {
      transitionGameState(gameId, 'characters')
        .then(() => {
          navigate(`/game/${gameId}/build-characters`);
        })
        .catch(() => {
          // Just navigate even if transition fails
          navigate(`/game/${gameId}/build-characters`);
        });
    } else {
      navigate(`/game/${gameId}/build-characters`);
    }
  }, [navigate, gameId, game]);

  // Helper functions
  const transformSlotToSeed = (slot: any, index: number) => {
    const seed = slot.character_seeds?.[0];
    return {
      index,
      mode: 'suggest' as const,
      displayName: seed?.display_name,
      pronouns: seed?.pronouns,
      archetypePrefs: seed?.archetype_prefs || [],
      concept: seed?.concept,
      keepName: seed?.keep_name || false,
    };
  };

  const transformSlotsToSeeds = (slots: any[]) => {
    return (slots || []).map((slot, index) => transformSlotToSeed(slot, index));
  };

  const updateCharacterField = (field: keyof Character, value: any) => {
    if (tempCharacter) {
      setTempCharacter({ ...tempCharacter, [field]: value });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="text-foreground">Loading character lineup...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <div className="text-destructive font-semibold">Error</div>
          <div className="text-muted-foreground">{error}</div>
          <div className="text-sm text-muted-foreground">
            Redirecting to character generation...
          </div>
        </div>
      </div>
    );
  }

  // Missing data state
  if (!lineup || !storyOverview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">No Character Lineup Found</h2>
          <p className="text-muted-foreground">Please generate characters first.</p>
          <Button onClick={() => navigate(`/game/${gameId}/build-characters`)}>
            Generate Characters
          </Button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <GameSessionErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                disabled={isApproving}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Character Review & Approval</h1>
                <p className="text-muted-foreground">Review, edit, and approve your character lineup</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRegenerateBonds}
                disabled={isRegenerating || isApproving}
                className="gap-2"
              >
                {isRegenerating && regeneratingType === 'bonds' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate Bonds
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowRemixDialog(true)}
                disabled={isRegenerating || isApproving}
                className="gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Remix Lineup
              </Button>

              <Button
                onClick={handleApproveLineup}
                disabled={isRegenerating || isApproving}
                className="gap-2"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve & Start Game
              </Button>
            </div>
          </div>

          {/* Character Cards */}
          <div className="grid gap-6 mb-8">
            {lineup.characters.map((character, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {character.name}
                        <Badge variant="secondary">{character.pronouns}</Badge>
                      </CardTitle>
                      <CardDescription>{character.concept}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCharacter(index)}
                        disabled={isRegenerating || isApproving || editingCharacter === index}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateCharacter(index)}
                        disabled={isRegenerating || isApproving}
                      >
                        {isRegenerating && regeneratingType === `character-${index}` ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {editingCharacter === index && tempCharacter ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={tempCharacter.name}
                            onChange={(e) => updateCharacterField('name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Pronouns</Label>
                          <Input
                            value={tempCharacter.pronouns}
                            onChange={(e) => updateCharacterField('pronouns', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Concept</Label>
                        <Input
                          value={tempCharacter.concept}
                          onChange={(e) => updateCharacterField('concept', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Background</Label>
                        <Textarea
                          value={tempCharacter.background}
                          onChange={(e) => updateCharacterField('background', e.target.value)}
                          rows={4}
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSaveCharacterEdit}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="mechanics">Mechanics</TabsTrigger>
                        <TabsTrigger value="connections">Connections</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Background</h4>
                          <p className="text-sm text-muted-foreground">{character.background}</p>
                        </div>

                        {(character as any).aspects && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Aspects</h4>
                            <div className="space-y-1">
                              <p className="text-sm"><strong>High Concept:</strong> {(character as any).aspects.highConcept}</p>
                              <p className="text-sm"><strong>Trouble:</strong> {(character as any).aspects.trouble}</p>
                              {(character as any).aspects.aspect3 && (
                                <p className="text-sm">{(character as any).aspects.aspect3}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="mechanics" className="space-y-4">
                        {(character as any).skills && (character as any).skills.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Skills</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {(character as any).skills.map((skill: any, skillIdx: number) => (
                                <div key={skillIdx} className="flex justify-between text-sm">
                                  <span>{skill.name}</span>
                                  <Badge variant="outline">+{skill.rating}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(character as any).stunts && (character as any).stunts.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Stunts</h4>
                            <ul className="space-y-1">
                              {(character as any).stunts.map((stunt: string, stuntIdx: number) => (
                                <li key={stuntIdx} className="text-sm text-muted-foreground">• {stunt}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(character as any).stress && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Stress</h4>
                            <div className="flex gap-4 text-sm">
                              <span>Physical: {(character as any).stress.physical}</span>
                              <span>Mental: {(character as any).stress.mental}</span>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="connections" className="space-y-4">
                        {character.connections?.locations && character.connections.locations.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Connected Locations</h4>
                            <div className="flex flex-wrap gap-2">
                              {character.connections.locations.map((loc: string, locIdx: number) => (
                                <Badge key={locIdx} variant="secondary">{loc}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {character.connections?.hooks && character.connections.hooks.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Story Hooks</h4>
                            <div className="flex flex-wrap gap-2">
                              {character.connections.hooks.map((hook: string, hookIdx: number) => (
                                <Badge key={hookIdx} variant="outline">{hook}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Party Bonds */}
          {lineup.bonds && lineup.bonds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Party Bonds
                </CardTitle>
                <CardDescription>Relationships between characters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lineup.bonds.map((bond: any, bondIdx: number) => (
                    <div key={bondIdx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {lineup.characters[bond.character1Index]?.name}
                          </span>
                          <Badge variant="secondary">{bond.relationship}</Badge>
                          <span className="font-medium">
                            {lineup.characters[bond.character2Index]?.name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{bond.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Remix Dialog */}
          <Dialog open={showRemixDialog} onOpenChange={setShowRemixDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remix Character Lineup</DialogTitle>
                <DialogDescription>
                  Generate a completely new set of characters while maintaining story connections.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="remix-brief">What would you like to change?</Label>
                  <Textarea
                    id="remix-brief"
                    placeholder="e.g., Make the party more combat-focused, Add more diversity..."
                    value={remixBrief}
                    onChange={(e) => setRemixBrief(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRemixDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRemixLineup}
                  disabled={isRegenerating || !remixBrief.trim()}
                >
                  {isRegenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Remix Lineup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </GameSessionErrorBoundary>
  );
}