import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, Shuffle, Check, Edit3, Clock, Zap, Users } from 'lucide-react';
import { StoryOverview } from '@/types/storyOverview';
import { CampaignSeed } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface StoryReviewScreenProps {
  storyOverview: StoryOverview;
  campaignSeed: CampaignSeed;
  onRegenerateSection: (section: keyof StoryOverview, feedback?: string) => Promise<void>;
  onRemixStory: (remixBrief: string, keepNouns?: boolean) => Promise<void>;
  onApprove: (finalOverview: StoryOverview, name: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  aiMetrics?: {
    model: string;
    tokensUsed: number;
    cost: number;
    latency: number;
  };
}

export const StoryReviewScreen: React.FC<StoryReviewScreenProps> = ({
  storyOverview: initialOverview,
  campaignSeed,
  onRegenerateSection,
  onRemixStory,
  onApprove,
  onBack,
  isLoading,
  aiMetrics
}) => {
  const [storyOverview, setStoryOverview] = useState<StoryOverview>(initialOverview);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, any>>({});
  const [storyName, setStoryName] = useState(campaignSeed.name || "Untitled Story");
  const { toast } = useToast();

  const handleRegenerateSection = async (section: keyof StoryOverview) => {
    const feedback = tempValues[`${section}_feedback`] || '';
    try {
      await onRegenerateSection(section, feedback);
      setTempValues(prev => ({ ...prev, [`${section}_feedback`]: '' }));
      toast({
        title: "Section Regenerated",
        description: `${section} has been updated.`,
      });
    } catch (error) {
      toast({
        title: "Regeneration Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemix = async (brief: string, keepNouns: boolean = false) => {
    try {
      await onRemixStory(brief, keepNouns);
      toast({
        title: "Story Remixed",
        description: "Your story has been completely regenerated.",
      });
    } catch (error) {
      toast({
        title: "Remix Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditField = (field: string, value: any) => {
    setEditingField(field);
    setTempValues(prev => ({ ...prev, [field]: value }));
  };

  const saveFieldEdit = (field: string) => {
    const keys = field.split('.');
    let updatedOverview = { ...storyOverview };
    
    if (keys.length === 1) {
      updatedOverview = { ...updatedOverview, [keys[0]]: tempValues[field] };
    } else if (keys.length === 2) {
      const parentKey = keys[0] as keyof StoryOverview;
      updatedOverview = {
        ...updatedOverview,
        [parentKey]: {
          ...(updatedOverview[parentKey] as any),
          [keys[1]]: tempValues[field]
        }
      };
    }
    
    setStoryOverview(updatedOverview);
    setEditingField(null);
    setTempValues(prev => {
      const newState = { ...prev };
      delete newState[field];
      return newState;
    });
  };

  const handleApprove = async () => {
    try {
      await onApprove(storyOverview, storyName);
      toast({
        title: "Story Approved",
        description: "Your story overview has been saved and is ready for adventure!",
      });
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const SectionCard: React.FC<{
    title: string;
    description: string;
    content: React.ReactNode;
    sectionKey: keyof StoryOverview;
  }> = ({ title, description, content, sectionKey }) => (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Regenerate {title}</DialogTitle>
                <DialogDescription>
                  Provide feedback on what you'd like to change (optional)
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="e.g., More mysterious, less combat-focused..."
                value={tempValues[`${sectionKey}_feedback`] || ''}
                onChange={(e) => setTempValues(prev => ({ 
                  ...prev, 
                  [`${sectionKey}_feedback`]: e.target.value 
                }))}
              />
              <Button 
                onClick={() => handleRegenerateSection(sectionKey)}
                disabled={isLoading}
              >
                {isLoading ? "Regenerating..." : "Regenerate Section"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );

  const EditableField: React.FC<{
    value: string;
    field: string;
    multiline?: boolean;
    className?: string;
  }> = ({ value, field, multiline = false, className = "" }) => {
    const isEditing = editingField === field;
    
    if (isEditing) {
      return (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={tempValues[field] || ''}
              onChange={(e) => setTempValues(prev => ({ ...prev, [field]: e.target.value }))}
              className="min-h-[100px]"
            />
          ) : (
            <Input
              value={tempValues[field] || ''}
              onChange={(e) => setTempValues(prev => ({ ...prev, [field]: e.target.value }))}
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveFieldEdit(field)}>
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`group cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors ${className}`}
        onClick={() => handleEditField(field, value)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {multiline ? (
              <div className="whitespace-pre-wrap">{value}</div>
            ) : (
              <div>{value}</div>
            )}
          </div>
          <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold">Story Overview Review</h1>
            <p className="text-muted-foreground mt-2">
              Review and refine your AI-generated story overview
            </p>
          </div>
          
          {/* AI Metrics */}
          {aiMetrics && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {aiMetrics.model}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {aiMetrics.tokensUsed} tokens
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {aiMetrics.latency}ms
              </Badge>
            </div>
          )}
        </div>

        {/* Story Name */}
        <Card className="mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle>Story Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={storyName}
              onChange={(e) => setStoryName(e.target.value)}
              placeholder="Enter story name..."
            />
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex gap-4 mb-8 animate-fade-in">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isLoading}>
                <Shuffle className="h-4 w-4 mr-2" />
                Full Remix
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remix Entire Story</DialogTitle>
                <DialogDescription>
                  Provide a brief describing what you'd like to change about the entire story
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="e.g., More noir intrigue, lighter tone, focus on exploration..."
                value={tempValues.remix_brief || ''}
                onChange={(e) => setTempValues(prev => ({ ...prev, remix_brief: e.target.value }))}
              />
              <Button 
                onClick={() => handleRemix(tempValues.remix_brief || '', false)}
                disabled={isLoading || !tempValues.remix_brief}
              >
                {isLoading ? "Remixing..." : "Remix Story"}
              </Button>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isLoading}>
                <Check className="h-4 w-4 mr-2" />
                Approve & Continue
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Story Overview</AlertDialogTitle>
                <AlertDialogDescription>
                  This will save your story overview and proceed to the next phase. You can always come back and edit it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprove}>
                  Approve & Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" onClick={onBack}>
            Back to Setup
          </Button>
        </div>

        {/* Story Sections */}
        <div className="space-y-6">
          <SectionCard
            title="Expanded Setting"
            description="The world and environment where adventures take place"
            sectionKey="expandedSetting"
            content={
              <EditableField
                value={storyOverview.expandedSetting}
                field="expandedSetting"
                multiline
              />
            }
          />

          <SectionCard
            title="Notable Locations"
            description="Key places where adventures unfold"
            sectionKey="notableLocations"
            content={
              <div className="space-y-4">
                {storyOverview.notableLocations.map((location, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <EditableField
                      value={location.name}
                      field={`notableLocations.${index}.name`}
                      className="font-semibold"
                    />
                    <EditableField
                      value={location.description}
                      field={`notableLocations.${index}.description`}
                      multiline
                      className="text-muted-foreground"
                    />
                  </div>
                ))}
              </div>
            }
          />

          <SectionCard
            title="Tone Manifesto"
            description="The emotional and thematic direction of the campaign"
            sectionKey="toneManifesto"
            content={
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Vibe</Label>
                  <EditableField
                    value={storyOverview.toneManifesto.vibe}
                    field="toneManifesto.vibe"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Expanded Description</Label>
                  <EditableField
                    value={storyOverview.toneManifesto.expanded}
                    field="toneManifesto.expanded"
                    multiline
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(storyOverview.toneManifesto.levers).map(([key, value]) => (
                    <div key={key}>
                      <Label className="text-sm font-medium capitalize">{key}</Label>
                      <EditableField
                        value={value}
                        field={`toneManifesto.levers.${key}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          <SectionCard
            title="Story Hooks"
            description="Initial adventure opportunities and plot threads"
            sectionKey="storyHooks"
            content={
              <div className="space-y-4">
                {storyOverview.storyHooks.map((hook, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <EditableField
                      value={hook.title}
                      field={`storyHooks.${index}.title`}
                      className="font-semibold"
                    />
                    <EditableField
                      value={hook.description}
                      field={`storyHooks.${index}.description`}
                      multiline
                      className="text-muted-foreground"
                    />
                  </div>
                ))}
              </div>
            }
          />

          <SectionCard
            title="Core Conflict"
            description="The central tension driving the campaign forward"
            sectionKey="coreConflict"
            content={
              <EditableField
                value={storyOverview.coreConflict}
                field="coreConflict"
                multiline
              />
            }
          />

          <SectionCard
            title="Session Zero"
            description="Questions and guidelines for the first session"
            sectionKey="sessionZero"
            content={
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Open Questions</Label>
                  <div className="mt-2 space-y-1">
                    {storyOverview.sessionZero.openQuestions.map((question, index) => (
                      <EditableField
                        key={index}
                        value={question}
                        field={`sessionZero.openQuestions.${index}`}
                        className="text-sm"
                      />
                    ))}
                  </div>
                </div>
                
                {storyOverview.sessionZero.contentAdvisories.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Content Advisories</Label>
                    <div className="mt-2 space-y-1">
                      {storyOverview.sessionZero.contentAdvisories.map((advisory, index) => (
                        <EditableField
                          key={index}
                          value={advisory}
                          field={`sessionZero.contentAdvisories.${index}`}
                          className="text-sm"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium">Calibration Levers</Label>
                  <div className="mt-2 space-y-1">
                    {storyOverview.sessionZero.calibrationLevers.map((lever, index) => (
                      <EditableField
                        key={index}
                        value={lever}
                        field={`sessionZero.calibrationLevers.${index}`}
                        className="text-sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};