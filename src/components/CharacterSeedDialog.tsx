import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { saveCharacterSeed, claimPartySlot } from '@/services/partyService';
import { GENRE_ARCHETYPES, ROLE_TAGS, VIOLENCE_COMFORT_OPTIONS, COMPLEXITY_OPTIONS, MECHANICS_COMFORT_OPTIONS } from '@/data/archetypes';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, X } from 'lucide-react';

interface CharacterSeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: any;
  gameId: string;
  genre: string;
  onSuccess: () => void;
}

export function CharacterSeedDialog({ open, onOpenChange, slot, gameId, genre, onSuccess }: CharacterSeedDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [existingSeed, setExistingSeed] = useState<any>(null);
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [concept, setConcept] = useState('');
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);
  const [selectedRoleTags, setSelectedRoleTags] = useState<string[]>([]);
  const [linesContent, setLinesContent] = useState('');
  const [veilsContent, setVeilsContent] = useState('');
  const [violenceComfort, setViolenceComfort] = useState('');
  const [complexity, setComplexity] = useState('');
  const [mechanicsComfort, setMechanicsComfort] = useState('');
  const [mustHave, setMustHave] = useState<string[]>([]);
  const [noThanks, setNoThanks] = useState<string[]>([]);
  const [keepName, setKeepName] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('');
  const [timezone, setTimezone] = useState('');
  const [newMustHave, setNewMustHave] = useState('');
  const [newNoThanks, setNewNoThanks] = useState('');

  useEffect(() => {
    if (open && slot) {
      loadExistingSeed();
    }
  }, [open, slot]);

  useEffect(() => {
    if (open && slot && !existingSeed) {
      // Load user defaults when there's no existing seed
      loadUserDefaults();
    }
  }, [open, slot, existingSeed]);

  const loadUserDefaults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || '');
        setPronouns(profile.default_pronouns || '');
        setComplexity(profile.default_complexity || '');
        setMechanicsComfort(profile.default_mechanics_comfort || '');
        setViolenceComfort(profile.default_violence_comfort || '');
        setTimezone(profile.default_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        // Load archetype preferences
        const archetypePrefs = profile.default_archetype_prefs as Record<string, boolean> || {};
        const preferredArchetypes = Object.entries(archetypePrefs)
          .filter(([_, value]) => value)
          .map(([key, _]) => key);
        setSelectedArchetypes(preferredArchetypes);
        
        // Load role tag interests
        setSelectedRoleTags((profile.default_role_tags_interest as string[]) || []);
        
        // Load must-have and no-thanks defaults
        setMustHave((profile.default_must_have as string[]) || []);
        setNoThanks((profile.default_no_thanks as string[]) || []);
        
        // Load tone comfort as lines/veils
        const toneComfort = profile.default_tone_comfort as Record<string, number> || {};
        const lines = Object.entries(toneComfort)
          .filter(([_, value]) => value <= 2) // Low comfort = lines
          .map(([key, _]) => key);
        const veils = Object.entries(toneComfort)
          .filter(([_, value]) => value >= 4) // High comfort = veils  
          .map(([key, _]) => key);
        
        setLinesContent(lines.join(', '));
        setVeilsContent(veils.join(', '));
      }
    } catch (error) {
      console.error('Error loading user defaults:', error);
    }
  };

  const resetForm = () => {
    setDisplayName('');
    setPronouns('');
    setConcept('');
    setSelectedArchetypes([]);
    setSelectedRoleTags([]);
    setLinesContent('');
    setVeilsContent('');
    setViolenceComfort('');
    setComplexity('');
    setMechanicsComfort('');
    setMustHave([]);
    setNoThanks([]);
    setKeepName(false);
    setTtsVoice('');
    setTimezone('');
    setNewMustHave('');
    setNewNoThanks('');
  };

  const loadExistingSeed = async () => {
    if (!slot?.id) return;
    
    try {
      const { data: seedData } = await supabase
        .from('character_seeds')
        .select('*')
        .eq('slot_id', slot.id)
        .maybeSingle();

      setExistingSeed(seedData);
      
      if (seedData) {
        setDisplayName(seedData.display_name || '');
        setPronouns(seedData.pronouns || '');
        setConcept(seedData.concept || '');
        setSelectedArchetypes(Array.isArray(seedData.archetype_prefs) ? seedData.archetype_prefs.map(String) : []);
        setSelectedRoleTags(Array.isArray(seedData.role_tags_interest) ? seedData.role_tags_interest.map(String) : []);
        const toneComfort = seedData.tone_comfort as any;
        setLinesContent(Array.isArray(toneComfort?.lines) ? toneComfort.lines.map(String).join(', ') : '');
        setVeilsContent(Array.isArray(toneComfort?.veils) ? toneComfort.veils.map(String).join(', ') : '');
        setViolenceComfort(String(seedData.violence_comfort || ''));
        setComplexity(String(seedData.complexity || ''));
        setMechanicsComfort(String(seedData.mechanics_comfort || ''));
        setMustHave(Array.isArray(seedData.must_have) ? seedData.must_have.map(String) : []);
        setNoThanks(Array.isArray(seedData.no_thanks) ? seedData.no_thanks.map(String) : []);
        setKeepName(seedData.keep_name || false);
        setTtsVoice(seedData.tts_voice || '');
        setTimezone(seedData.timezone || '');
      }
    } catch (error) {
      console.error('Failed to load existing seed:', error);
    }
  };

  const handleSubmit = async () => {
    if (!slot || !displayName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a display name for your character.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Claim slot if not already claimed
      if (slot.status === 'empty') {
        await claimPartySlot(slot.id, gameId);
      }

      // Prepare seed data
      const seedData = {
        display_name: displayName.trim(),
        pronouns: pronouns.trim() || null,
        concept: concept.trim() || null,
        archetype_prefs: selectedArchetypes,
        role_tags_interest: selectedRoleTags,
        tone_comfort: {
          lines: linesContent.split(',').map(s => s.trim()).filter(Boolean),
          veils: veilsContent.split(',').map(s => s.trim()).filter(Boolean)
        },
        violence_comfort: violenceComfort || null,
        complexity: complexity || null,
        mechanics_comfort: mechanicsComfort || null,
        must_have: mustHave,
        no_thanks: noThanks,
        keep_name: keepName,
        tts_voice: ttsVoice.trim() || null,
        timezone: timezone.trim() || null
      };

      await saveCharacterSeed(slot.id, gameId, seedData);
      
      toast({
        title: "Character Saved!",
        description: "Your character preferences have been saved.",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to Save",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArchetype = (archetype: string) => {
    setSelectedArchetypes(prev => 
      prev.includes(archetype) 
        ? prev.filter(a => a !== archetype)
        : [...prev, archetype]
    );
  };

  const toggleRoleTag = (tag: string) => {
    setSelectedRoleTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addMustHave = () => {
    if (newMustHave.trim() && !mustHave.includes(newMustHave.trim())) {
      setMustHave(prev => [...prev, newMustHave.trim()]);
      setNewMustHave('');
    }
  };

  const addNoThanks = () => {
    if (newNoThanks.trim() && !noThanks.includes(newNoThanks.trim())) {
      setNoThanks(prev => [...prev, newNoThanks.trim()]);
      setNewNoThanks('');
    }
  };

  const removeMustHave = (item: string) => {
    setMustHave(prev => prev.filter(i => i !== item));
  };

  const removeNoThanks = (item: string) => {
    setNoThanks(prev => prev.filter(i => i !== item));
  };

  const availableArchetypes = GENRE_ARCHETYPES[genre as keyof typeof GENRE_ARCHETYPES] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Character Preferences - Player {slot?.index_in_party + 1}
          </DialogTitle>
          <DialogDescription>
            Share your character preferences with the GM. This helps create a character you'll love to play.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    placeholder="What should we call you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pronouns">Pronouns</Label>
                  <Select value={pronouns} onValueChange={setPronouns}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pronouns..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="they/them">they/them</SelectItem>
                      <SelectItem value="she/her">she/her</SelectItem>
                      <SelectItem value="he/him">he/him</SelectItem>
                      <SelectItem value="she/they">she/they</SelectItem>
                      <SelectItem value="he/they">he/they</SelectItem>
                      <SelectItem value="any pronouns">any pronouns</SelectItem>
                      <SelectItem value="ask me">ask me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="concept">Character Concept (Optional)</Label>
                <Textarea
                  id="concept"
                  placeholder="1-2 sentences describing your character idea..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Archetype Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Archetype Preferences</CardTitle>
              <CardDescription>Select archetypes you'd like to play (order matters)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableArchetypes.map((archetype) => (
                  <Badge
                    key={archetype}
                    variant={selectedArchetypes.includes(archetype) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArchetype(archetype)}
                  >
                    {archetype}
                    {selectedArchetypes.includes(archetype) && (
                      <span className="ml-1 text-xs">
                        #{selectedArchetypes.indexOf(archetype) + 1}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role Interests</CardTitle>
              <CardDescription>What roles do you enjoy in the party?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ROLE_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedRoleTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleRoleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Safety & Comfort */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Safety & Comfort</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lines">Lines (Hard No's)</Label>
                  <Input
                    id="lines"
                    placeholder="Separate with commas..."
                    value={linesContent}
                    onChange={(e) => setLinesContent(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="veils">Veils (Fade to Black)</Label>
                  <Input
                    id="veils"
                    placeholder="Separate with commas..."
                    value={veilsContent}
                    onChange={(e) => setVeilsContent(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="violence">Violence Comfort Level</Label>
                <Select value={violenceComfort} onValueChange={setViolenceComfort}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select comfort level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VIOLENCE_COMFORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Experience & Complexity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Experience & Complexity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complexity">Rules Complexity</Label>
                  <Select value={complexity} onValueChange={setComplexity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLEXITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mechanics">Mechanics Comfort</Label>
                  <Select value={mechanicsComfort} onValueChange={setMechanicsComfort}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select comfort level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MECHANICS_COMFORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Must Have / No Thanks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Character Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Must Have</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add element..."
                      value={newMustHave}
                      onChange={(e) => setNewMustHave(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addMustHave()}
                    />
                    <Button onClick={addMustHave} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mustHave.map((item) => (
                      <Badge key={item} variant="outline" className="cursor-pointer" onClick={() => removeMustHave(item)}>
                        {item} <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>No Thanks</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add element..."
                      value={newNoThanks}
                      onChange={(e) => setNewNoThanks(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNoThanks()}
                    />
                    <Button onClick={addNoThanks} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {noThanks.map((item) => (
                      <Badge key={item} variant="outline" className="cursor-pointer" onClick={() => removeNoThanks(item)}>
                        {item} <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="keepName" 
                  checked={keepName} 
                  onCheckedChange={(checked) => setKeepName(checked === true)}
                />
                <Label htmlFor="keepName">Keep my display name as character name</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ttsVoice">TTS Voice (Optional)</Label>
                  <Input
                    id="ttsVoice"
                    placeholder="Voice preference for text-to-speech"
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone (Optional)</Label>
                  <Input
                    id="timezone"
                    placeholder="e.g., PST, EST, UTC+2"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !displayName.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingSeed ? 'Update Character' : 'Save Character'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}