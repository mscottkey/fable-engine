import Handlebars from 'handlebars';
import { callLlm } from '../../llm';
import { getPrompt, getSchemaVersion } from '../../prompts';
import { Phase4OutputSchema, MicroSceneSchema } from '../../schemas';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { createClient } from '@/integrations/supabase/client';
import type { Phase4Options } from './types';

Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));

const MAX_TOKENS = {
  initial: 2000,
  regen: 1400,
  remix: 2000,
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
  const repairPromptId = 'phase4/repair@v1';
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

export async function generateInitial(options: Phase4Options) {
  const { userId, gameId, seedId, context } = options;
  const supabase = createClient();
  const startTime = Date.now();

  const systemPromptId = 'phase4/system@v1';
  const userPromptId = 'phase4/user@v1';
  const templateData = { overview: context.overview, factions: context.factions };

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

    const validated = Phase4OutputSchema.parse(parsedData);

    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase: 'phase4',
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
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase: 'phase4',
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
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

export async function generateRegenNode(options: Phase4Options) {
  const { userId, gameId, seedId, context, targetId, feedback, currentData } = options;
  const supabase = createClient();
  const startTime = Date.now();

  const systemPromptId = 'phase4/system@v1';
  const userPromptId = 'phase4/regen/node@v1';
  const currentNodes = currentData?.nodes?.filter((n: any) => n.id !== targetId) || [];
  const templateData = {
    overview: context.overview,
    factions: context.factions,
    currentNodes,
    nodeId: targetId,
    feedback: feedback || 'No specific feedback',
  };

  const systemPromptTemplate = getPrompt(systemPromptId);
  const userPromptTemplate = getPrompt(userPromptId);
  const systemPrompt = Handlebars.compile(systemPromptTemplate)(templateData);
  const userPrompt = Handlebars.compile(userPromptTemplate)(templateData);

  try {
    const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.regen);
    let parsedData: any;

    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      const repairResponse = await repairCycle(systemPrompt, userPrompt, llmResponse.content, MAX_TOKENS.regen);
      parsedData = JSON.parse(repairResponse.content);
    }

    const validated = { node: parsedData };
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase: 'phase4:regen:node',
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
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase: 'phase4:regen:node',
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
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

export async function generateRegenScene(options: Phase4Options) {
  const { userId, gameId, seedId, context, targetId, currentData } = options;
  const supabase = createClient();
  const startTime = Date.now();

  const systemPromptId = 'phase4/system@v1';
  const userPromptId = 'phase4/regen/scene@v1';
  const node = currentData?.nodes?.find((n: any) => n.id === targetId);
  const templateData = { overview: context.overview, factions: context.factions, node };

  const systemPromptTemplate = getPrompt(systemPromptId);
  const userPromptTemplate = getPrompt(userPromptId);
  const systemPrompt = Handlebars.compile(systemPromptTemplate)(templateData);
  const userPrompt = Handlebars.compile(userPromptTemplate)(templateData);

  try {
    const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.regen);
    let parsedData: any;

    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      const repairResponse = await repairCycle(systemPrompt, userPrompt, llmResponse.content, MAX_TOKENS.regen);
      parsedData = JSON.parse(repairResponse.content);
    }

    const validated = MicroSceneSchema.parse(parsedData);
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase: 'phase4:regen:scene',
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
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase: 'phase4:regen:scene',
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
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

export async function generateRemix(options: Phase4Options) {
  const { userId, gameId, seedId, context, currentData, remixBrief, preserveNouns } = options;
  const supabase = createClient();
  const startTime = Date.now();

  const systemPromptId = 'phase4/remix/system@v1';
  const userPromptId = 'phase4/remix/user@v1';
  const templateData = {
    overview: context.overview,
    factions: context.factions,
    currentNodes: currentData?.nodes || [],
    brief: remixBrief || 'Create a fresh node web',
    preserveNouns: preserveNouns || false,
  };

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

    const validated = Phase4OutputSchema.parse(parsedData);
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase: 'phase4:remix',
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
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase4_nodes',
      phase: 'phase4:remix',
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
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
