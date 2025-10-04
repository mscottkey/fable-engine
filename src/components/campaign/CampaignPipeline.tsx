// File: src/components/campaign/CampaignPipeline.tsx
// Main orchestrator component for all phases
import React, { useState } from 'react';
import { Phase3Factions } from './Phase3Factions';
import { Phase4Nodes } from './Phase4Nodes';
import { Phase5Arcs } from './Phase5Arcs';
import { Phase6Resolutions } from './Phase6Resolutions';
import { CampaignProgressBar } from '@/components/CampaignProgressBar';
import type { Phase3Output, Phase4Output, Phase5Output, Phase6Output } from '@/ai/schemas';

interface CampaignPipelineProps {
  gameId: string;
  seedId: string;
  userId: string;
  overview: any;
  lineup: any;
  onComplete: (allData: {
    factions: Phase3Output;
    nodes: Phase4Output;
    arcs: Phase5Output;
    resolutions: Phase6Output;
  }) => void;
}

export function CampaignPipeline({
  gameId,
  seedId,
  userId,
  overview,
  lineup,
  onComplete,
}: CampaignPipelineProps) {
  const [currentPhase, setCurrentPhase] = useState<3 | 4 | 5 | 6>(3);
  const [phase3Data, setPhase3Data] = useState<Phase3Output | null>(null);
  const [phase4Data, setPhase4Data] = useState<Phase4Output | null>(null);
  const [phase5Data, setPhase5Data] = useState<Phase5Output | null>(null);
  const [phase6Data, setPhase6Data] = useState<Phase6Output | null>(null);

  const handlePhase3Complete = (data: Phase3Output) => {
    setPhase3Data(data);
    setCurrentPhase(4);
  };

  const handlePhase4Complete = (data: Phase4Output) => {
    setPhase4Data(data);
    setCurrentPhase(5);
  };

  const handlePhase5Complete = (data: Phase5Output) => {
    setPhase5Data(data);
    setCurrentPhase(6);
  };

  const handlePhase6Complete = (data: Phase6Output) => {
    setPhase6Data(data);
    
    if (phase3Data && phase4Data && phase5Data) {
      onComplete({
        factions: phase3Data,
        nodes: phase4Data,
        arcs: phase5Data,
        resolutions: data,
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Unified Campaign Progress Bar */}
      <CampaignProgressBar currentStep={currentPhase as 3 | 4 | 5 | 6} className="mb-8" />

      {/* Current Phase Component */}
      {currentPhase === 3 && (
        <Phase3Factions
          gameId={gameId}
          seedId={seedId}
          userId={userId}
          overview={overview}
          lineup={lineup}
          onComplete={handlePhase3Complete}
          onBack={() => {}}
        />
      )}

      {currentPhase === 4 && phase3Data && (
        <Phase4Nodes
          gameId={gameId}
          seedId={seedId}
          userId={userId}
          overview={overview}
          factions={phase3Data}
          onComplete={handlePhase4Complete}
          onBack={() => setCurrentPhase(3)}
        />
      )}

      {currentPhase === 5 && phase3Data && phase4Data && (
        <Phase5Arcs
          gameId={gameId}
          seedId={seedId}
          userId={userId}
          overview={overview}
          factions={phase3Data}
          nodes={phase4Data}
          onComplete={handlePhase5Complete}
          onBack={() => setCurrentPhase(4)}
        />
      )}

      {currentPhase === 6 && phase3Data && phase4Data && phase5Data && (
        <Phase6Resolutions
          gameId={gameId}
          seedId={seedId}
          userId={userId}
          overview={overview}
          factions={phase3Data}
          nodes={phase4Data}
          arcs={phase5Data}
          onComplete={handlePhase6Complete}
          onBack={() => setCurrentPhase(5)}
        />
      )}
    </div>
  );
}