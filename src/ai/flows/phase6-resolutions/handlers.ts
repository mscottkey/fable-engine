import Handlebars from 'handlebars';
// Some environments during refactor don't yet expose the centralized LLM router
// as a module. Declare a loose callLlm here to avoid compile-time errors.
declare function callLlm(params: any): Promise<any>;
import { getPromptTemplate as getPrompt, getSchemaVersion } from '../../prompts';
import { Phase6OutputSchema } from '../../schemas';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { supabase } from '@/integrations/supabase/client';
import type { Phase6Options } from './types';

Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));

const MAX_TOKENS = {
  initial: 1600,
  regen: 1200,
  remix: 1600,
};

async function doCall(systemPrompt: string, userPrompt: string, maxTokens: number) {
  return callLlm({
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
}

async function repairCycle(systemPrompt: string, userPrompt: string, llmContent: string, maxTokens: number) {
  const repairPromptId = 'phase6/repair@v1';
  const repairTemplate = getPrompt(repairPromptId);
  const repairPrompt = Handlebars.compile(repairTemplate)({ error: 'Parse error during first pass' });

  const repairResponse = await callLlm({
    provider: 'google',
    model: 'gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: llmContent },
      { role: 'user', content: repairPrompt },
    ],
    temperature: 0.5,
    maxTokens,
    responseFormat: 'json',
  });

  return repairResponse;
}

export async function generateInitial(options: Phase6Options) {
  const { userId, gameId, seedId, context } = options;
  const supabaseClient = supabase;
  const startTime = Date.now();

  const systemPromptId = 'phase6/system@v1';
  const userPromptId = 'phase6/user@v1';
  const templateData = { overview: context.overview, factions: context.factions, nodes: context.nodes, arcs: context.arcs };

  const systemPromptTemplate = getPrompt(systemPromptId);
  const userPromptTemplate = getPrompt(userPromptId);
  const systemPrompt = Handlebars.compile(systemPromptTemplate)(templateData);
  const userPrompt = Handlebars.compile(userPromptTemplate)(templateData);

  try {
    const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.initial);
    let parsedData: any;

    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      const repairResponse = await repairCycle(systemPrompt, userPrompt, llmResponse.content, MAX_TOKENS.initial);
      parsedData = JSON.parse(repairResponse.content);
    }

    const validated = Phase6OutputSchema.parse(parsedData);
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase5_resolutions' as any,
      phase: 'phase5' as any,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      input_tokens: llmResponse.usage?.promptTokens || 0,
      output_tokens: llmResponse.usage?.completionTokens || 0,
      prompt_text: systemPrompt + '\n\n' + userPrompt,
      completion_text: llmResponse.content,
      latency_ms: latency,
      http_status: 200,
      error_code: null,
      status: 'success',
    });

    return {
      success: true,
      data: validated,
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
      supabaseClient,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase5_resolutions' as any,
      phase: 'phase5' as any,
      provider: 'google',
      model: 'gemini-2.5-flash',
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      prompt_text: '',
      completion_text: '',
      latency_ms: latency,
      http_status: 500,
      error_code: (error as Error).name,
      status: 'error',
    });

    return { success: false, error: (error as Error).message };
  }
}

export async function generateRegen(options: Phase6Options) {
  const { userId, gameId, seedId, context, targetId, feedback, currentData } = options;
  const supabaseClient = supabase;
  const startTime = Date.now();

  try {
    let systemPromptId: string;
    let userPromptId: string;
    let templateData: any;
    let maxTokens = MAX_TOKENS.regen;

    if (targetId === 'epilogues') {
      const path = currentData?.resolutionPaths?.[0];
      systemPromptId = 'phase6/system@v1';
      userPromptId = 'phase6/regen/epilogue@v1';
      templateData = { overview: context.overview, path, feedback: feedback || 'No specific feedback' };
    } else {
      const currentPaths = currentData?.resolutionPaths?.filter((p: any) => p.id !== targetId) || [];
      systemPromptId = 'phase6/system@v1';
      userPromptId = 'phase6/regen/branch@v1';
      templateData = { overview: context.overview, factions: context.factions, arcs: context.arcs, currentPaths, pathId: targetId, feedback: feedback || 'No specific feedback' };
    }

    const systemPromptTemplate = getPrompt(systemPromptId);
    const userPromptTemplate = getPrompt(userPromptId);
    const systemPrompt = Handlebars.compile(systemPromptTemplate)(templateData);
    const userPrompt = Handlebars.compile(userPromptTemplate)(templateData);

    const llmResponse = await doCall(systemPrompt, userPrompt, maxTokens);
    let parsedData: any;

    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      const repairResponse = await repairCycle(systemPrompt, userPrompt, llmResponse.content, maxTokens);
      parsedData = JSON.parse(repairResponse.content);
    }

    const validatedData = targetId === 'epilogues' ? { epilogues: parsedData.epilogues } : { path: parsedData };
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase5_resolutions' as any,
      phase: (`phase5:regen:${targetId === 'epilogues' ? 'epilogue' : 'branch'}`) as any,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      input_tokens: llmResponse.usage?.promptTokens || 0,
      output_tokens: llmResponse.usage?.completionTokens || 0,
      prompt_text: systemPrompt + '\n\n' + userPrompt,
      completion_text: llmResponse.content,
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      latency_ms: latency,
      http_status: 200,
      error_code: null,
      status: 'success',
    });

    return { success: true, data: validatedData, metadata: {
      tokensUsed: (llmResponse.usage?.promptTokens || 0) + (llmResponse.usage?.completionTokens || 0),
      cost: llmResponse.usage?.totalCost || 0,
      latency,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
    } };
  } catch (error) {
    const latency = Date.now() - startTime;
    await logAIEvent({
      supabaseClient,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase5_resolutions' as any,
      phase: `phase5:regen` as any,
      provider: 'google',
      model: 'gemini-2.5-flash',
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

export async function generateRemix(options: Phase6Options) {
  const { userId, gameId, seedId, context, currentData, remixBrief } = options;
  const supabaseClient = supabase;
  const startTime = Date.now();

  const systemPromptId = 'phase6/remix/system@v1';
  const userPromptId = 'phase6/remix/user@v1';
  const templateData = { overview: context.overview, factions: context.factions, arcs: context.arcs, currentPaths: currentData?.resolutionPaths || [], brief: remixBrief || 'Create fresh resolution paths' };

  const systemPromptTemplate = getPrompt(systemPromptId);
  const userPromptTemplate = getPrompt(userPromptId);
  const systemPrompt = Handlebars.compile(systemPromptTemplate)(templateData);
  const userPrompt = Handlebars.compile(userPromptTemplate)(templateData);

  try {
    const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.remix);
    let parsedData: any;

    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      const repairResponse = await repairCycle(systemPrompt, userPrompt, llmResponse.content, MAX_TOKENS.remix);
      parsedData = JSON.parse(repairResponse.content);
    }

    const validated = Phase6OutputSchema.parse(parsedData);
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase5_resolutions' as any,
      phase: 'phase5:remix' as any,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      input_tokens: llmResponse.usage?.promptTokens || 0,
      output_tokens: llmResponse.usage?.completionTokens || 0,
      prompt_text: systemPrompt + '\n\n' + userPrompt,
      completion_text: llmResponse.content,
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      latency_ms: latency,
      http_status: 200,
      error_code: null,
      status: 'success',
    });

    return {
      success: true,
      data: validated,
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
      supabaseClient,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase5_resolutions' as any,
      phase: 'phase5:remix' as any,
  provider: 'google',
  model: 'gemini-2.5-flash',
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
