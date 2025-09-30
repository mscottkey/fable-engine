
// File: src/ai/flows/phase5-arcs.ts
import Handlebars from 'handlebars';
import { callLlm } from '../llm';
import { getPrompt, getSchemaVersion } from '../prompts';
import { Phase5OutputSchema, type Phase5Output } from '../schemas';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { createClient } from '@/integrations/supabase/client';

Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));

interface Phase5Context {
  overview: any;
  factions: any;
  nodes: any;
}

interface Phase5Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase5Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string;
  feedback?: string;
  remixBrief?: string;
  currentData?: Phase5Output;
}

const MAX_TOKENS = {
  initial: 1800,
  regen: 1400,
  remix: 1800,
};

export async function generatePhase5Arcs(options: Phase5Options): Promise<{
  success: boolean;
  data?: Phase5Output | Partial<Phase5Output>;
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
      systemPromptId = 'phase5/system@v1';
      userPromptId = 'phase5/user@v1';
      templateData = {
        overview: context.overview,
        factions: context.factions,
        nodes: context.nodes,
      };
    } else if (type === 'regen') {
      const { targetId, feedback } = options;
      
      if (targetId?.includes('-')) {
        const [arcId, beatId] = targetId.split('-');
        const arc = currentData?.arcs?.find(a => a.id === arcId);
        systemPromptId = 'phase5/system@v1';
        userPromptId = 'phase5/regen/beat@v1';
        templateData = {
          overview: context.overview,
          factions: context.factions,
          nodes: context.nodes,
          arc,
          arcId,
          beatId,
          feedback: feedback || 'No specific feedback',
        };
      } else {
        const otherArcs = currentData?.arcs?.filter(a => a.id !== targetId) || [];
        systemPromptId = 'phase5/system@v1';
        userPromptId = 'phase5/regen/arc@v1';
        templateData = {
          overview: context.overview,
          factions: context.factions,
          nodes: context.nodes,
          otherArcs,
          arcId: targetId,
          feedback: feedback || 'No specific feedback',
        };
      }
    } else {
      systemPromptId = 'phase5/remix/system@v1';
      userPromptId = 'phase5/remix/user@v1';
      templateData = {
        overview: context.overview,
        factions: context.factions,
        nodes: context.nodes,
        currentArcs: currentData?.arcs || [],
        brief: options.remixBrief || 'Create a fresh escalation structure',
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
      const repairPromptId = 'phase5/repair@v1';
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
      validatedData = options.targetId?.includes('-') ? { beat: parsedData } : { arc: parsedData };
    } else {
      validatedData = Phase5OutputSchema.parse(parsedData);
    }

    const phase = type === 'initial' ? 'phase5' : 
                  type === 'regen' ? `phase5:regen:${options.targetId?.includes('-') ? 'beat' : 'arc'}` :
                  'phase5:remix';

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase5_arcs',
      phase,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase5'),
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
      feature: 'phase5_arcs',
      phase: type === 'initial' ? 'phase5' : `phase5:${type}`,
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: 'phase5/system@v1',
      schema_version: getSchemaVersion('phase5'),
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