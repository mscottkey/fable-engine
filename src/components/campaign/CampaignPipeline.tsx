// File: src/components/campaign/CampaignPipeline.tsx
// Main orchestrator component for all phases
import React, { useState } from 'react';
import { Phase3Factions } from './Phase3Factions';
import { Phase4Nodes } from './Phase4Nodes';
import { Phase5Arcs } from './Phase5Arcs';
import { Phase6Resolutions } from './Phase6Resolutions';
import { CampaignProgressBar } from '@/components/CampaignProgressBar';
import { supabase } from '@/integrations/supabase/client';
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

  // Track saved DB record IDs for foreign key chaining
  const [factionsId, setFactionsId] = useState<string | null>(null);
  const [nodesId, setNodesId] = useState<string | null>(null);
  const [arcsId, setArcsId] = useState<string | null>(null);

  const handlePhase3Complete = async (data: Phase3Output) => {
    setPhase3Data(data);

    // Save Phase 3 immediately
    try {
      const { data: factionsRecord, error } = await supabase
        .from('factions')
        .insert({
          game_id: gameId,
          seed_id: seedId,
          factions_json: data.factions,
          relationships: data.relationships,
          fronts: data.fronts || [],
          provider: 'google',
          model: 'gemini-2.5-flash',
          input_tokens: 0,
          output_tokens: 0,
          status: 'approved',
        })
        .select()
        .single();

      if (error) throw error;
      setFactionsId(factionsRecord.id);
      console.log('Phase 3 saved:', factionsRecord.id);
    } catch (err) {
      console.error('Error saving Phase 3:', err);
      alert('Failed to save Phase 3. Continue anyway?');
    }

    setCurrentPhase(4);
  };

  const handlePhase4Complete = async (data: Phase4Output) => {
    setPhase4Data(data);

    // Save Phase 4 immediately
    if (factionsId) {
      try {
        const { data: nodesRecord, error } = await supabase
          .from('story_nodes')
          .insert({
            game_id: gameId,
            seed_id: seedId,
            factions_id: factionsId,
            nodes_json: data.nodes,
            provider: 'google',
            model: 'gemini-2.5-flash',
            input_tokens: 0,
            output_tokens: 0,
            status: 'approved',
          })
          .select()
          .single();

        if (error) throw error;
        setNodesId(nodesRecord.id);
        console.log('Phase 4 saved:', nodesRecord.id);
      } catch (err) {
        console.error('Error saving Phase 4:', err);
        alert('Failed to save Phase 4. Continue anyway?');
      }
    }

    setCurrentPhase(5);
  };

  const handlePhase5Complete = async (data: Phase5Output) => {
    setPhase5Data(data);

    // Save Phase 5 immediately
    if (nodesId) {
      try {
        const { data: arcsRecord, error } = await supabase
          .from('campaign_arcs')
          .insert({
            game_id: gameId,
            seed_id: seedId,
            story_nodes_id: nodesId,
            arcs_json: data.arcs,
            provider: 'google',
            model: 'gemini-2.5-flash',
            input_tokens: 0,
            output_tokens: 0,
            status: 'approved',
          })
          .select()
          .single();

        if (error) throw error;
        setArcsId(arcsRecord.id);
        console.log('Phase 5 saved:', arcsRecord.id);
      } catch (err) {
        console.error('Error saving Phase 5:', err);
        alert('Failed to save Phase 5. Continue anyway?');
      }
    }

    setCurrentPhase(6);
  };

  const handlePhase6Complete = async (data: Phase6Output) => {
    setPhase6Data(data);

    // Save Phase 6 immediately
    if (arcsId) {
      try {
        const { error } = await supabase
          .from('resolutions')
          .insert({
            game_id: gameId,
            seed_id: seedId,
            campaign_arcs_id: arcsId,
            resolution_paths_json: data.resolutionPaths,
            twist: data.twist,
            provider: 'google',
            model: 'gemini-2.5-flash',
            input_tokens: 0,
            output_tokens: 0,
            status: 'approved',
          });

        if (error) throw error;
        console.log('Phase 6 saved successfully');
      } catch (err) {
        console.error('Error saving Phase 6:', err);
        alert('Failed to save Phase 6');
        return;
      }
    }

    // All phases saved, notify parent
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