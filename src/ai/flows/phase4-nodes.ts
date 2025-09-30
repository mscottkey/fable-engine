// File: src/ai/flows/phase4-nodes.ts
import Handlebars from 'handlebars';
import { callLlm } from '../llm';
import { getPrompt, getSchemaVersion } from '../prompts';
import { Phase4OutputSchema, type Phase4Output, MicroSceneSchema } from '../schemas';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { createClient } from '@/integrations/supabase/client';

Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));

interface Phase4Context {
  overview: any;
  factions: any;
}

interface Phase4Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase4Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string;
  feedback?: string;
  remixBrief?: string;
  preserveNouns?: boolean;
  currentData?: Phase4Output;
  generateMicroScene?: boolean;
}

const MAX_TOKENS = {
  initial: 2000,
  regen: 1400,
  remix: 2000,
};

export async function generatePhase4Nodes(options: Phase4Options): Promise<{
  success: boolean;
  data?: Phase4Output | Partial<Phase4Output>;
  error?: string;
  metadata?: {
    tokensUsed: number;
    cost: number;
    latency: number;
    provider: string;
    model: string;
  };
}> {
  const { userId, gameId, seedId, context, type = 'initial', currentData, generateMicroScene } = options;
  const supabase = createClient();
  const startTime = Date.now();

  try {
    let systemPromptId: string;
    let userPromptId: string;
    let templateData: any;
    let maxTokens = MAX_TOKENS[type];

    if (type === 'initial') {
      systemPromptId = 'phase4/system@v1';
      userPromptId = 'phase4/user@v1';
      templateData = { overview: context.overview, factions: context.factions };
    } else if (type === 'regen') {
      const { targetId, feedback } = options;
      if (generateMicroScene) {
        const node = currentData?.nodes?.find(n => n.id === targetId);
        systemPromptId = 'phase4/system@v1';
        userPromptId = 'phase4/regen/scene@v1';
        templateData = { overview: context.overview, factions: context.factions, node };
      } else {
        systemPromptId = 'phase4/system@v1';
        userPromptId = 'phase4/regen/node@v1';
        const currentNodes = currentData?.nodes?.filter(n => n.id !== targetId) || [];
        templateData = {
          overview: context.overview,
          factions: context.factions,
          currentNodes,
          nodeId: targetId,
          feedback: feedback || 'No specific feedback',
        };
      }
    } else {
      systemPromptId = 'phase4/remix/system@v1';
      userPromptId = 'phase4/remix/user@v1';
      templateData = {
        overview: context.overview,
        factions: context.factions,
        currentNodes: currentData?.nodes || [],
        brief: options.remixBrief || 'Create a fresh node web',
        preserveNouns: options.preserveNouns || false,
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
      const repairPromptId = 'phase4/repair@v1';
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
    if (generateMicroScene) {
      validatedData = MicroSceneSchema.parse(parsedData);
    } else if (type === 'regen' && !generateMicroScene) {
      validatedData = { node: parsedData };
    } else {
      validatedData = Phase4OutputSchema.parse(parsedData);
    }

    const phase = type === 'initial' ? 'phase4' : 
                  type === 'regen' ? `phase4:regen:${generateMicroScene ? 'scene' : 'node'}` :
                  'phase4:remix';

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase4'),
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
      feature: 'phase4_nodes',
      phase: type === 'initial' ? 'phase4' : `phase4:${type}`,
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: 'phase4/system@v1',
      schema_version: getSchemaVersion('phase4'),
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