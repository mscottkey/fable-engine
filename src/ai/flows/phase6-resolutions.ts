// File: src/ai/flows/phase6-resolutions.ts
import Handlebars from 'handlebars';
import { callLlm } from '../llm';
import { getPrompt, getSchemaVersion } from '../prompts';
import { Phase6OutputSchema, type Phase6Output } from '../schemas';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { createClient } from '@/integrations/supabase/client';

Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));

interface Phase6Context {
  overview: any;
  factions: any;
  nodes: any;
  arcs: any;
}

interface Phase6Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase6Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string;
  feedback?: string;
  remixBrief?: string;
  currentData?: Phase6Output;
}

const MAX_TOKENS = {
  initial: 1600,
  regen: 1200,
  remix: 1600,
};

export async function generatePhase6Resolutions(options: Phase6Options): Promise<{
  success: boolean;
  data?: Phase6Output | Partial<Phase6Output>;
  error?: string;
  metadata?: {
    tokensUsed: number;
    cost: number;
    latency: number;
    provider: string;
    model: string;
  };
}> {
  const { userId, gameId, seedId, context, type = 'initial', currentData } = options;
  const supabase = createClient();
  const startTime = Date.now();

  try {
    let systemPromptId: string;
    let userPromptId: string;
    let templateData: any;
    let maxTokens = MAX_TOKENS[type];

    if (type === 'initial') {
      systemPromptId = 'phase6/system@v1';
      userPromptId = 'phase6/user@v1';
      templateData = {
        overview: context.overview,
        factions: context.factions,
        nodes: context.nodes,
        arcs: context.arcs,
      };
    } else if (type === 'regen') {
      const { targetId, feedback } = options;
      
      if (targetId === 'epilogues') {
        const path = currentData?.resolutionPaths?.[0];
        systemPromptId = 'phase6/system@v1';
        userPromptId = 'phase6/regen/epilogue@v1';
        templateData = {
          overview: context.overview,
          path,
          feedback: feedback || 'No specific feedback',
        };
      } else {
        const currentPaths = currentData?.resolutionPaths?.filter(p => p.id !== targetId) || [];
        systemPromptId = 'phase6/system@v1';
        userPromptId = 'phase6/regen/branch@v1';
        templateData = {
          overview: context.overview,
          factions: context.factions,
          arcs: context.arcs,
          currentPaths,
          pathId: targetId,
          feedback: feedback || 'No specific feedback',
        };
      }
    } else {
      systemPromptId = 'phase6/remix/system@v1';
      userPromptId = 'phase6/remix/user@v1';
      templateData = {
        overview: context.overview,
        factions: context.factions,
        arcs: context.arcs,
        currentPaths: currentData?.resolutionPaths || [],
        brief: options.remixBrief || 'Create fresh resolution paths',
      };
    }

    const systemPromptTemplate = getPrompt(systemPromptId);
    const userPromptTemplate = getPrompt(userPromptId);
    
    const systemPrompt = Handlebars.compile(systemPromptTemplate)(templateData);
    const userPrompt = Handlebars.compile(userPromptTemplate)(templateData);

    const llmResponse = await callLlm({
      provider: 'google',
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens,
      responseFormat: 'json',
    });

    const latency = Date.now() - startTime;

    let parsedData: any;
    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      const repairPromptId = 'phase6/repair@v1';
      const repairTemplate = getPrompt(repairPromptId);
      const repairPrompt = Handlebars.compile(repairTemplate)({
        error: (parseError as Error).message,
      });

      const repairResponse = await callLlm({
        provider: 'google',
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: llmResponse.content },
          { role: 'user', content: repairPrompt },
        ],
        temperature: 0.5,
        maxTokens,
        responseFormat: 'json',
      });

      try {
        parsedData = JSON.parse(repairResponse.content);
      } catch {
        throw new Error('Failed to parse JSON even after repair attempt');
      }
    }

    let validatedData: any;
    if (type === 'regen') {
      validatedData = options.targetId === 'epilogues' ? { epilogues: parsedData.epilogues } : { path: parsedData };
    } else {
      validatedData = Phase6OutputSchema.parse(parsedData);
    }

    const phase = type === 'initial' ? 'phase6' : 
                  type === 'regen' ? `phase6:regen:${options.targetId === 'epilogues' ? 'epilogue' : 'branch'}` :
                  'phase6:remix';

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase6_resolution',
      phase,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase6'),
      input_tokens: llmResponse.usage?.promptTokens || 0,
      output_tokens: llmResponse.usage?.completionTokens || 0,
      prompt_text: systemPrompt + '\n\n' + userPrompt,
      completion_text: llmResponse.content,
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      latency_ms: latency,
      http_status: 200,
      status: 'success',
    });

    return {
      success: true,
      data: validatedData,
      metadata: {
        tokensUsed: (llmResponse.usage?.promptTokens || 0) + (llmResponse.usage?.completionTokens || 0),
        cost: llmResponse.usage?.totalCost || 0,
        latency,
        provider: llmResponse.provider || 'google',
        model: llmResponse.model || 'gemini-2.5-flash',
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase6_resolution',
      phase: type === 'initial' ? 'phase6' : `phase6:${type}`,
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: 'phase6/system@v1',
      schema_version: getSchemaVersion('phase6'),
      input_tokens: 0,
      output_tokens: 0,
      prompt_text: '',
      completion_text: '',
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      latency_ms: latency,
      http_status: 500,
      error_code: (error as Error).name,
      status: 'error',
    });

    return { success: false, error: (error as Error).message };
  }
}
