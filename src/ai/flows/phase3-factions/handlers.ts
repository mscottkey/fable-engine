import Handlebars from 'handlebars';
import { callLlm } from '../../llm';
import { getPrompt, getSchemaVersion } from '../../prompts';
import { Phase3OutputSchema, ProjectClockSchema, RelationshipSchema } from '../../schemas';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { createClient } from '@/integrations/supabase/client';
import type { Phase3Options } from './types';

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
  const repairPromptId = 'phase3/repair@v1';
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

export async function generateInitial(options: Phase3Options) {
  const { userId, gameId, seedId, context } = options;
  const supabase = createClient();
  const startTime = Date.now();

  const systemPromptId = 'phase3/system@v1';
  const userPromptId = 'phase3/user@v1';
  const templateData = { overview: context.overview, lineup: context.lineup };

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

    const validated = Phase3OutputSchema.parse(parsedData);
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase3_factions',
      phase: 'phase3',
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase3'),
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
      feature: 'phase3_factions',
      phase: 'phase3',
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase3'),
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

export async function generateRegen(options: Phase3Options) {
  const { userId, gameId, seedId, context, targetId, feedback, currentData } = options;
  const supabase = createClient();
  const startTime = Date.now();

  if (!targetId || !currentData) {
    return { success: false, error: 'Regen requires targetId and currentData' };
  }

  try {
    let systemPromptId: string;
    let userPromptId: string;
    let templateData: any;
    let maxTokens = MAX_TOKENS.regen;

    if (targetId === 'relations') {
      systemPromptId = 'phase3/system@v1';
      userPromptId = 'phase3/regen/relations@v1';
      templateData = { overview: context.overview, factions: currentData.factions, feedback: feedback || 'No specific feedback' };
    } else if (targetId.startsWith('clock-')) {
      const [_, factionId, clockName] = targetId.split('-');
      const faction = currentData.factions?.find((f: any) => f.id === factionId);
      const clock = faction?.projects.find((p: any) => p.name === clockName);

      systemPromptId = 'phase3/system@v1';
      userPromptId = 'phase3/regen/clock@v1';
      templateData = { overview: context.overview, faction, currentClock: clock, feedback: feedback || 'No specific feedback' };
    } else {
      systemPromptId = 'phase3/system@v1';
      userPromptId = 'phase3/regen/faction@v1';
      const currentFactions = currentData.factions?.filter((f: any) => f.id !== targetId) || [];
      templateData = { overview: context.overview, currentFactions, factionId: targetId, feedback: feedback || 'No specific feedback' };
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

    let validatedData: any;

    if (targetId === 'relations') {
      validatedData = { relationships: parsedData.relationships };
      parsedData.relationships.forEach((rel: any) => RelationshipSchema.parse(rel));
    } else if (targetId.startsWith('clock-')) {
      validatedData = { clock: parsedData };
      ProjectClockSchema.parse(parsedData);
    } else {
      validatedData = { faction: parsedData };
    }

    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase3_factions',
      phase: `phase3:regen:${targetId?.split('-')[0] || 'faction'}`,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase3'),
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
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase3_factions',
      phase: `phase3:regen`,
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: 'phase3/system@v1',
      schema_version: getSchemaVersion('phase3'),
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

export async function generateRemix(options: Phase3Options) {
  const { userId, gameId, seedId, context, currentData, remixBrief, preserveNouns } = options;
  const supabase = createClient();
  const startTime = Date.now();

  const systemPromptId = 'phase3/remix/system@v1';
  const userPromptId = 'phase3/remix/user@v1';
  const templateData = {
    overview: context.overview,
    lineup: context.lineup,
    currentFactions: currentData?.factions || [],
    brief: remixBrief || 'Create a fresh take on the faction landscape',
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

    const validated = Phase3OutputSchema.parse(parsedData);
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase3_factions',
      phase: 'phase3:remix',
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase3'),
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
      feature: 'phase3_factions',
      phase: 'phase3:remix',
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase3'),
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
