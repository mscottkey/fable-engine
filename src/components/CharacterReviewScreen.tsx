import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
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
import { 
  ArrowLeft, 
  RefreshCw, 
  Shuffle, 
  CheckCircle, 
  Edit, 
  Users, 
  Zap, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface CharacterReviewScreenProps {}

export default function CharacterReviewScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [lineup, setLineup] = useState<CharacterLineup | null>(null);
  const [storyOverview, setStoryOverview] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [game, setGame] = useState<any>(null);
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);
  const [tempCharacter, setTempCharacter] = useState<Character | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingType, setRegeneratingType] = useState<string>('');
  const [showRemixDialog, setShowRemixDialog] = useState(false);
  const [remixBrief, setRemixBrief] = useState('');
  const [regenFeedback, setRegenFeedback] = useState('');

  useEffect(() => {
    // Get data from navigation state or load from database
    const state = location.state as any;
    if (state?.lineup && state?.storyOverview && state?.slots) {
      setLineup(state.lineup);
      setStoryOverview(state.storyOverview);
      setSlots(state.slots);
      loadGameData();
    } else {
      // Redirect back to build screen if no data
      navigate(`/game/${gameId}/build-characters`);
    }
  }, [gameId, location.state, navigate]);

  const loadGameData = async () => {
    try {
      const { data: gameData, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      setGame(gameData);
    } catch (error) {
      console.error('Failed to load game data:', error);
    }
  };

  const handleEditCharacter = (characterIndex: number) => {
    if (lineup) {
      setEditingCharacter(characterIndex);
      setTempCharacter({ ...lineup.characters[characterIndex] });
    }
  };

  const handleSaveCharacterEdit = () => {
    if (editingCharacter !== null && tempCharacter && lineup) {
      const newCharacters = [...lineup.characters];
      newCharacters[editingCharacter] = tempCharacter;
      setLineup({ ...lineup, characters: newCharacters });
      setEditingCharacter(null);
      setTempCharacter(null);
      
      toast({
        title: "Character Updated",
        description: "Your changes have been saved."
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCharacter(null);
    setTempCharacter(null);
  };

  const handleRegenerateCharacter = async (characterIndex: number) => {
    if (!lineup || !storyOverview) return;

    setIsRegenerating(true);
    setRegeneratingType(`character-${characterIndex}`);

    try {
      const seed = transformSlotToSeed(slots[characterIndex], characterIndex);
      const currentParty = lineup.characters.filter((_, i) => i !== characterIndex);
      
      const newCharacter = await regenerateCharacter(
        gameId!,
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
    if (!lineup || !storyOverview) return;

    setIsRegenerating(true);
    setRegeneratingType('bonds');

    try {
      const newBonds = await regenerateBonds(gameId!, lineup.characters, storyOverview);
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
    if (!lineup || !storyOverview) return;

    setIsRegenerating(true);
    setRegeneratingType('remix');

    try {
      const seeds = transformSlotsToSeeds(slots);
      const newLineup = await remixLineup(gameId!, seeds, storyOverview, lineup, remixBrief);
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
    if (!lineup || !game || !storyOverview) return;

    try {
      // First run IP sanitizer on the final lineup
      const { sanitizedLineup, changes } = await sanitizeCharacterLineup(lineup);
      
      if (changes.length > 0) {
        toast({
          title: "Content Sanitized",
          description: `${changes.length} potential IP issues were automatically fixed.`,
        });
      }
      
      // Save the approved lineup
      const lineupId = await saveCharacterLineup(
        gameId!,
        game.seed_id,
        storyOverview.id,
        sanitizedLineup,
        {
          provider: 'lovable-ai',
          model: 'google/gemini-2.5-flash',
          inputTokens: 0, // Would be tracked from generation
          outputTokens: 0,
          costUsd: 0
        }
      );

      // Save individual characters
      await saveCharacters(gameId!, game.seed_id, sanitizedLineup, slots);

      // Update game status to playing
      await supabase
        .from('games')
        .update({ status: 'playing' })
        .eq('id', gameId);

      toast({
        title: "Lineup Approved!",
        description: "Characters have been finalized and the game is ready to begin."
      });

      // Navigate to the main game interface
      navigate(`/game/${gameId}`);
      
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

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
    return slots.map((slot, index) => transformSlotToSeed(slot, index));
  };

  const runIPSanitizer = async (lineup: CharacterLineup): Promise<CharacterLineup> => {
    const { sanitizedLineup } = await sanitizeCharacterLineup(lineup);
    return sanitizedLineup;
  };

  const updateCharacterField = (field: keyof Character, value: any) => {
    if (tempCharacter) {
      setTempCharacter({ ...tempCharacter, [field]: value });
    }
  };

  if (!lineup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading character lineup...</p>
        </div>
      </div>
    );
  }

  if (!lineup || !storyOverview) {
  if (!lineup || !storyOverview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading character lineup...</div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading character lineup...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/game/${gameId}/build-characters`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Generation
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
              disabled={isRegenerating}
              className="gap-2"
            >
              {isRegenerating && regeneratingType === 'bonds' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Regenerate Bonds
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowRemixDialog(true)}
              disabled={isRegenerating}
              className="gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Full Remix
            </Button>

            <Button
              onClick={handleApproveLineup}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve Lineup
            </Button>
          </div>
        </div>

        {/* Character Cards */}
        <div className="grid gap-6 mb-8">
          {(lineup.characters || []).map((character, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {character.name}
                      <Badge variant="outline">{character.pronouns}</Badge>
                    </CardTitle>
                    <CardDescription>{character.concept}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCharacter(index)}
                      className="gap-2"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerateCharacter(index)}
                      disabled={isRegenerating}
                      className="gap-2"
                    >
                      {isRegenerating && regeneratingType === `character-${index}` ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="story" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="story">Story</TabsTrigger>
                    <TabsTrigger value="mechanics">Mechanics</TabsTrigger>
                    <TabsTrigger value="bonds">Bonds</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="story" className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Background</Label>
                      <p className="text-sm text-muted-foreground mt-1">{character.background}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Motivations</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(character.motivations || []).map((motivation, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{motivation}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Flaws</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(character.flaws || []).map((flaw, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{flaw}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="mechanics" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Mechanical Role</Label>
                        <Badge variant="default">{character.mechanicalRole}</Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Social Role</Label>
                        <Badge variant="secondary">{character.socialRole}</Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Exploration Role</Label>
                        <Badge variant="outline">{character.explorationRole}</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Archetypes</Label>
                      <div className="flex gap-2 mt-1">
                        <Badge>{character.primaryArchetype}</Badge>
                        {character.secondaryArchetype && (
                          <Badge variant="outline">{character.secondaryArchetype}</Badge>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="bonds" className="space-y-2">
                    {(lineup.bonds || [])
                      .filter(bond => bond.character1Index === index || bond.character2Index === index)
                      .map((bond, i) => {
                        const otherIndex = bond.character1Index === index ? bond.character2Index : bond.character1Index;
                        const otherCharacter = lineup.characters[otherIndex];
                        return (
                          <div key={i} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{otherCharacter.name}</span>
                              <Badge variant="outline" className="text-xs">{bond.relationship}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{bond.description}</p>
                          </div>
                        );
                      })}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Character Edit Dialog */}
        <Dialog open={editingCharacter !== null} onOpenChange={() => handleCancelEdit()}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Character</DialogTitle>
              <DialogDescription>
                Make changes to the character details. Click save to apply your changes.
              </DialogDescription>
            </DialogHeader>
            
            {tempCharacter && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={tempCharacter.name}
                      onChange={(e) => updateCharacterField('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <Input
                      id="pronouns"
                      value={tempCharacter.pronouns}
                      onChange={(e) => updateCharacterField('pronouns', e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="concept">Concept</Label>
                  <Input
                    id="concept"
                    value={tempCharacter.concept}
                    onChange={(e) => updateCharacterField('concept', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="background">Background</Label>
                  <Textarea
                    id="background"
                    value={tempCharacter.background}
                    onChange={(e) => updateCharacterField('background', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveCharacterEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remix Dialog */}
        <Dialog open={showRemixDialog} onOpenChange={setShowRemixDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Full Lineup Remix
              </DialogTitle>
              <DialogDescription>
                Completely reimagine your character lineup while preserving story connections and player preferences.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="remix-brief">Remix Brief (Optional)</Label>
                <Textarea
                  id="remix-brief"
                  placeholder="e.g., 'Make them all more mysterious and morally gray' or 'Focus on urban backgrounds instead of rural'"
                  value={remixBrief}
                  onChange={(e) => setRemixBrief(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRemixDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRemixLineup}
                disabled={isRegenerating && regeneratingType === 'remix'}
                className="gap-2"
              >
                {isRegenerating && regeneratingType === 'remix' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}
                Create New Lineup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}