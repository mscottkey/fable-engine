import React, { useState } from 'react';
import { CampaignSeed } from '@/types/database';
import { StoryOverview } from '@/types/storyOverview';
import { StoryGenerationScreen } from './StoryGenerationScreen';
import { StoryReviewScreen } from './StoryReviewScreen';
import { regenerateSection, remixStoryOverview, saveStoryOverview } from '@/services/storyBuilder';
import { useToast } from '@/hooks/use-toast';

interface StoryBuilderProps {
  campaignSeed: CampaignSeed;
  onComplete: (gameId: string) => void; // Changed from storyOverviewId to gameId
  onBack: () => void;
}

type BuilderStep = 'generating' | 'reviewing';

export const StoryBuilder: React.FC<StoryBuilderProps> = ({
  campaignSeed,
  onComplete,
  onBack
}) => {
  const [step, setStep] = useState<BuilderStep>('generating');
  const [storyOverview, setStoryOverview] = useState<StoryOverview | null>(null);
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerationComplete = (overview: StoryOverview, metrics: any) => {
    setStoryOverview(overview);
    setAiMetrics(metrics);
    setStep('reviewing');
  };

  const handleResume = (overview: StoryOverview) => {
    setStoryOverview(overview);
    setStep('reviewing');
  };

  const handleRegenerateSection = async (section: keyof StoryOverview, feedback?: string) => {
    if (!storyOverview) return;
    
    setIsLoading(true);
    try {
      const response = await regenerateSection(campaignSeed.id, storyOverview, section, feedback);
      if (response.success && response.data) {
        setStoryOverview({
          ...storyOverview,
          ...response.data
        });
      } else {
        throw new Error(response.error || 'Failed to regenerate section');
      }
    } catch (error) {
      console.error('Section regeneration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemixStory = async (remixBrief: string, keepNouns?: boolean) => {
    setIsLoading(true);
    try {
      const response = await remixStoryOverview(campaignSeed.id, remixBrief, keepNouns);
      if (response.success && response.data) {
        setStoryOverview(response.data as StoryOverview);
      } else {
        throw new Error(response.error || 'Failed to remix story');
      }
    } catch (error) {
      console.error('Story remix failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (finalOverview: StoryOverview, name: string) => {
    setIsLoading(true);
    try {
      const response = await saveStoryOverview(campaignSeed.id, finalOverview, name);
      if (response.success && response.id && response.gameId) {
        onComplete(response.gameId); // Pass gameId instead of storyOverviewId
      } else {
        throw new Error(response.error || 'Failed to save story overview');
      }
    } catch (error) {
      console.error('Story approval failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'generating') {
    return (
      <StoryGenerationScreen
        campaignSeed={campaignSeed}
        onComplete={handleGenerationComplete}
        onResume={handleResume}
        onBack={onBack}
      />
    );
  }

  if (step === 'reviewing' && storyOverview) {
    return (
      <StoryReviewScreen
        storyOverview={storyOverview}
        campaignSeed={campaignSeed}
        onRegenerateSection={handleRegenerateSection}
        onRemixStory={handleRemixStory}
        onApprove={handleApprove}
        onBack={() => setStep('generating')}
        isLoading={isLoading}
        aiMetrics={aiMetrics}
      />
    );
  }

  return null;
};