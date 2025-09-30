import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Edit2, 
  Save, 
  Sparkles, 
  Clock, 
  DollarSign, 
  Cpu,
  Shuffle,
  CheckCircle
} from "lucide-react";
import type { StoryOverview } from "@/types/storyOverview";
import { generateStoryOverview, regenerateSection, remixStoryOverview, saveStoryOverview } from "@/services/storyBuilder";

interface StoryBuilderProps {
  seedId: string;
  onApprove: (storyId: string) => void;
  onBack: () => void;
}

interface GenerationProgress {
  stage: string;
  progress: number;
}

export function StoryBuilder({ seedId, onApprove, onBack }: StoryBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState<GenerationProgress>({ stage: "Initializing...", progress: 0 });
  const [overview, setOverview] = useState<StoryOverview | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<Record<string, boolean>>({});
  const [isRemixing, setIsRemixing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [remixBrief, setRemixBrief] = useState("");
  const [keepNouns, setKeepNouns] = useState(false);
  const [generationStats, setGenerationStats] = useState<{
    tokens: number;
    cost: number;
    latency: number;
  } | null>(null);

  useEffect(() => {
    generateInitialStory();
  }, [seedId]);

  const generateInitialStory = async () => {
    setIsGenerating(true);
    setProgress({ stage: "Connecting to AI...", progress: 20 });
    
    try {
      const result = await generateStoryOverview({
        seedId,
        type: 'initial'
      });

      if (result.success && result.data) {
        setOverview(result.data as StoryOverview);
        setGenerationStats({
          tokens: result.tokensUsed || 0,
          cost: result.cost || 0,
          latency: result.latency || 0
        });
        setProgress({ stage: "Story generated!", progress: 100 });
        setTimeout(() => setIsGenerating(false), 1000);
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Story generation error:', error);
      toast.error('Failed to generate story. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (section: keyof StoryOverview, feedback?: string) => {
    if (!overview) return;
    
    setIsRegenerating(prev => ({ ...prev, [section]: true }));
    
    try {
      const result = await regenerateSection(seedId, overview, section, feedback);
      
      if (result.success && result.data) {
        setOverview(prev => prev ? { ...prev, ...result.data } : null);
        toast.success(`${section} regenerated successfully`);
      } else {
        throw new Error(result.error || 'Regeneration failed');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error(`Failed to regenerate ${section}`);
    } finally {
      setIsRegenerating(prev => ({ ...prev, [section]: false }));
    }
  };

  const handleRemix = async () => {
    if (!remixBrief.trim()) {
      toast.error('Please provide a remix brief');
      return;
    }
    
    setIsRemixing(true);
    
    try {
      const result = await remixStoryOverview(seedId, remixBrief, keepNouns);
      
      if (result.success && result.data) {
        setOverview(result.data as StoryOverview);
        toast.success('Story remixed successfully');
        setRemixBrief("");
        setKeepNouns(false);
      } else {
        throw new Error(result.error || 'Remix failed');
      }
    } catch (error) {
      console.error('Remix error:', error);
      toast.error('Failed to remix story');
    } finally {
      setIsRemixing(false);
    }
  };

  const handleSave = async () => {
    if (!overview) return;
    
    try {
      const result = await saveStoryOverview(seedId, overview, `Story Overview ${Date.now()}`);
      
      if (result.success && result.id) {
        toast.success('Story overview saved!');
        onApprove(result.id);
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save story overview');
    }
  };

  const startEdit = (section: string, value: any) => {
    setEditingSection(section);
    setEditValues({ [section]: value });
  };

  const saveEdit = (section: string) => {
    if (!overview) return;
    
    setOverview(prev => prev ? { ...prev, [section]: editValues[section] } : null);
    setEditingSection(null);
    setEditValues({});
    toast.success('Section updated');
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center gap-2 justify-center">
              <Sparkles className="w-5 h-5 animate-spin" />
              Generating Story Overview
            </CardTitle>
            <CardDescription>
              Creating your adventure from the campaign seed...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress.progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {progress.stage}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Failed to generate story overview</p>
            <Button onClick={generateInitialStory}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Story Overview</h1>
            <p className="text-muted-foreground">Review and refine your generated story</p>
          </div>
          
          <div className="flex items-center gap-2">
            {generationStats && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Cpu className="w-4 h-4" />
                  {generationStats.tokens} tokens
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  ${generationStats.cost.toFixed(4)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {generationStats.latency}ms
                </div>
              </div>
            )}
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Shuffle className="w-4 h-4 mr-2" />
                  Full Remix
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Full Story Remix</DialogTitle>
                  <DialogDescription>
                    Provide a brief description of what you'd like to change about the story
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="e.g., 'More noir intrigue' or 'Lighter tone, less body horror'"
                    value={remixBrief}
                    onChange={(e) => setRemixBrief(e.target.value)}
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="keepNouns"
                      checked={keepNouns}
                      onChange={(e) => setKeepNouns(e.target.checked)}
                    />
                    <label htmlFor="keepNouns" className="text-sm">
                      Keep existing names/locations
                    </label>
                  </div>
                  <Button 
                    onClick={handleRemix} 
                    disabled={isRemixing || !remixBrief.trim()}
                    className="w-full"
                  >
                    {isRemixing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Remixing...
                      </>
                    ) : (
                      <>
                        <Shuffle className="w-4 h-4 mr-2" />
                        Remix Story
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button onClick={handleSave} size="lg">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve & Save
            </Button>
          </div>
        </div>

        {/* Story Sections */}
        <div className="grid gap-6">
          {/* Expanded Setting */}
          <SectionCard
            title="Expanded Setting"
            content={overview.expandedSetting}
            isEditing={editingSection === 'expandedSetting'}
            isRegenerating={isRegenerating.expandedSetting}
            onEdit={() => startEdit('expandedSetting', overview.expandedSetting)}
            onSave={() => saveEdit('expandedSetting')}
            onCancel={() => setEditingSection(null)}
            onRegenerate={() => handleRegenerateSection('expandedSetting')}
            editValue={editValues.expandedSetting}
            onEditValueChange={(value) => setEditValues(prev => ({ ...prev, expandedSetting: value }))}
          />

          {/* Notable Locations */}
          <SectionCard
            title="Notable Locations"
            content={overview.notableLocations}
            isEditing={editingSection === 'notableLocations'}
            isRegenerating={isRegenerating.notableLocations}
            onEdit={() => startEdit('notableLocations', overview.notableLocations)}
            onSave={() => saveEdit('notableLocations')}
            onCancel={() => setEditingSection(null)}
            onRegenerate={() => handleRegenerateSection('notableLocations')}
            editValue={editValues.notableLocations}
            onEditValueChange={(value) => setEditValues(prev => ({ ...prev, notableLocations: value }))}
            renderContent={(content) => (
              <div className="space-y-4">
                {content.map((location: any, index: number) => (
                  <div key={index} className="border-l-4 border-primary/20 pl-4">
                    <h4 className="font-semibold">{location.name}</h4>
                    <p className="text-muted-foreground">{location.description}</p>
                  </div>
                ))}
              </div>
            )}
          />

          {/* More sections would follow similar pattern... */}
        </div>
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  content: any;
  isEditing: boolean;
  isRegenerating: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
  editValue: any;
  onEditValueChange: (value: any) => void;
  renderContent?: (content: any) => React.ReactNode;
}

function SectionCard({
  title,
  content,
  isEditing,
  isRegenerating,
  onEdit,
  onSave,
  onCancel,
  onRegenerate,
  editValue,
  onEditValueChange,
  renderContent
}: SectionCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button size="sm" onClick={onSave}>
                <Save className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={typeof editValue === 'string' ? editValue : JSON.stringify(editValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onEditValueChange(parsed);
              } catch {
                onEditValueChange(e.target.value);
              }
            }}
            rows={8}
            className="font-mono text-sm"
          />
        ) : (
          renderContent ? renderContent(content) : (
            <div className="prose prose-sm max-w-none">
              {typeof content === 'string' ? (
                <p>{content}</p>
              ) : (
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(content, null, 2)}
                </pre>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}