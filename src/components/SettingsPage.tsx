import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, User, Shield, Clock, Gamepad2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface UserProfile {
  display_name: string;
  default_pronouns: string;
  default_timezone: string;
  default_complexity: string;
  default_mechanics_comfort: string;
  default_violence_comfort: string;
  default_archetype_prefs: Record<string, boolean>;
  default_role_tags_interest: string[];
  default_tone_comfort: Record<string, number>;
  default_must_have: string[];
  default_no_thanks: string[];
}

const PRONOUN_OPTIONS = [
  { value: '', label: 'Select pronouns...' },
  { value: 'they/them', label: 'they/them' },
  { value: 'she/her', label: 'she/her' },
  { value: 'he/him', label: 'he/him' },
  { value: 'she/they', label: 'she/they' },
  { value: 'he/they', label: 'he/they' },
  { value: 'any pronouns', label: 'any pronouns' },
  { value: 'ask me', label: 'ask me' },
];

const COMPLEXITY_OPTIONS = [
  { value: 'simple', label: 'Simple - I like straightforward characters' },
  { value: 'moderate', label: 'Moderate - Some complexity is fine' },
  { value: 'complex', label: 'Complex - I enjoy intricate character builds' },
];

const MECHANICS_COMFORT_OPTIONS = [
  { value: 'minimal', label: 'Minimal - Keep rules light' },
  { value: 'moderate', label: 'Moderate - Some crunch is good' },
  { value: 'heavy', label: 'Heavy - I love detailed mechanics' },
];

const VIOLENCE_COMFORT_OPTIONS = [
  { value: 'minimal', label: 'Minimal - Prefer non-violent solutions' },
  { value: 'moderate', label: 'Moderate - Some action is fine' },
  { value: 'high', label: 'High - Bring on the combat' },
];

const ARCHETYPE_OPTIONS = [
  'warrior', 'mage', 'rogue', 'healer', 'leader', 'scholar', 'diplomat', 'crafter'
];

const ROLE_TAG_OPTIONS = [
  'tank', 'damage', 'support', 'control', 'utility', 'social', 'exploration', 'investigation'
];

const TONE_ASPECTS = [
  { key: 'humor', label: 'Humor & Comedy' },
  { key: 'romance', label: 'Romance' },
  { key: 'horror', label: 'Horror Elements' },
  { key: 'politics', label: 'Political Intrigue' },
  { key: 'mystery', label: 'Mystery & Investigation' },
];

const MUST_HAVE_OPTIONS = [
  'character growth', 'team cooperation', 'moral choices', 'exploration', 'combat', 
  'roleplay', 'puzzles', 'social interaction', 'character backstory integration'
];

const NO_THANKS_OPTIONS = [
  'pvp conflict', 'character death', 'betrayal', 'time pressure', 'complex rules',
  'public speaking', 'improv acting', 'mathematical calculations', 'note taking'
];

interface SettingsPageProps {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    default_pronouns: '',
    default_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    default_complexity: '',
    default_mechanics_comfort: '',
    default_violence_comfort: '',
    default_archetype_prefs: {},
    default_role_tags_interest: [],
    default_tone_comfort: {},
    default_must_have: [],
    default_no_thanks: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfile({
          display_name: data.display_name || '',
          default_pronouns: data.default_pronouns || '',
          default_timezone: data.default_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          default_complexity: data.default_complexity || '',
          default_mechanics_comfort: data.default_mechanics_comfort || '',
          default_violence_comfort: data.default_violence_comfort || '',
          default_archetype_prefs: (data.default_archetype_prefs as Record<string, boolean>) || {},
          default_role_tags_interest: (data.default_role_tags_interest as string[]) || [],
          default_tone_comfort: (data.default_tone_comfort as Record<string, number>) || {},
          default_must_have: (data.default_must_have as string[]) || [],
          default_no_thanks: (data.default_no_thanks as string[]) || [],
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save settings.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Settings saved",
        description: "Your default preferences have been updated."
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchetypeChange = (archetype: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      default_archetype_prefs: {
        ...prev.default_archetype_prefs,
        [archetype]: checked
      }
    }));
  };

  const handleRoleTagChange = (tag: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      default_role_tags_interest: checked 
        ? [...prev.default_role_tags_interest, tag]
        : prev.default_role_tags_interest.filter(t => t !== tag)
    }));
  };

  const handleToneComfortChange = (aspect: string, value: number) => {
    setProfile(prev => ({
      ...prev,
      default_tone_comfort: {
        ...prev.default_tone_comfort,
        [aspect]: value
      }
    }));
  };

  const handleMustHaveChange = (item: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      default_must_have: checked 
        ? [...prev.default_must_have, item]
        : prev.default_must_have.filter(i => i !== item)
    }));
  };

  const handleNoThanksChange = (item: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      default_no_thanks: checked 
        ? [...prev.default_no_thanks, item]
        : prev.default_no_thanks.filter(i => i !== item)
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your default character creation preferences</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Your display name and pronouns for character creation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profile.display_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Your preferred name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronouns">Default Pronouns</Label>
                <Select 
                  value={profile.default_pronouns} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, default_pronouns: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pronouns..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRONOUN_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={profile.default_timezone}
                onChange={(e) => setProfile(prev => ({ ...prev, default_timezone: e.target.value }))}
                placeholder="e.g., America/New_York"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gameplay Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Gameplay Preferences
            </CardTitle>
            <CardDescription>
              Your preferred style of play and character complexity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Character Complexity</Label>
                <Select 
                  value={profile.default_complexity} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, default_complexity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select complexity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLEXITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mechanics Comfort</Label>
                <Select 
                  value={profile.default_mechanics_comfort} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, default_mechanics_comfort: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select comfort level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MECHANICS_COMFORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Violence Comfort</Label>
                <Select 
                  value={profile.default_violence_comfort} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, default_violence_comfort: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select comfort level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VIOLENCE_COMFORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Preferred Archetypes</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ARCHETYPE_OPTIONS.map(archetype => (
                  <div key={archetype} className="flex items-center space-x-2">
                    <Checkbox
                      id={`archetype-${archetype}`}
                      checked={profile.default_archetype_prefs[archetype] || false}
                      onCheckedChange={(checked) => handleArchetypeChange(archetype, checked as boolean)}
                    />
                    <Label htmlFor={`archetype-${archetype}`} className="capitalize">
                      {archetype}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Role Interests</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ROLE_TAG_OPTIONS.map(tag => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${tag}`}
                      checked={profile.default_role_tags_interest.includes(tag)}
                      onCheckedChange={(checked) => handleRoleTagChange(tag, checked as boolean)}
                    />
                    <Label htmlFor={`role-${tag}`} className="capitalize">
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety & Comfort */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Safety & Comfort
            </CardTitle>
            <CardDescription>
              Content preferences and boundaries for a comfortable gaming experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Content Comfort Levels (1 = Not comfortable, 5 = Very comfortable)</Label>
              {TONE_ASPECTS.map(aspect => (
                <div key={aspect.key} className="flex items-center justify-between">
                  <Label className="flex-1">{aspect.label}</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(value => (
                      <Button
                        key={value}
                        variant={profile.default_tone_comfort[aspect.key] === value ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleToneComfortChange(aspect.key, value)}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Must-Have Elements</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MUST_HAVE_OPTIONS.map(item => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`must-have-${item}`}
                      checked={profile.default_must_have.includes(item)}
                      onCheckedChange={(checked) => handleMustHaveChange(item, checked as boolean)}
                    />
                    <Label htmlFor={`must-have-${item}`} className="capitalize">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>No Thanks (Things to avoid)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {NO_THANKS_OPTIONS.map(item => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`no-thanks-${item}`}
                      checked={profile.default_no_thanks.includes(item)}
                      onCheckedChange={(checked) => handleNoThanksChange(item, checked as boolean)}
                    />
                    <Label htmlFor={`no-thanks-${item}`} className="capitalize">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={saveProfile} disabled={saving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}