import Handlebars from 'handlebars';
import { callLlm } from '../../llm';
import { getPrompt } from '../../prompts';
import { Phase1OutputSchema } from '../../schemas/phase1';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { supabase } from '@/integrations/supabase/client';
import type { Phase1Options } from './types';

Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));

const MAX_TOKENS = {
  initial: 2000,
  regen: 1500,
  remix: 2000,
};

// Helper to format seed data for templates
function formatSeedData(seed: any): any {
  return {
    name: seed.name,
    genre: seed.genre,
    tone_vibe: seed.tone_vibe,
    pace: seed.tone_levers?.pace || '',
    danger: seed.tone_levers?.danger || '',
    morality: seed.tone_levers?.morality || '',
    scale: seed.tone_levers?.scale || '',
    difficulty_label: seed.difficulty_label,
    difficulty_desc: seed.difficulty_desc,
    setting: seed.setting,
    notable_locations: seed.notable_locations?.map((loc: any) => `- ${loc.name}: ${loc.description}`).join('\n') || '',
    hooks: seed.hooks?.map((hook: any) => `- ${hook.title}: ${hook.description}`).join('\n') || ''
  };
}

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
  const repairPromptId = 'phase1/repair@v1';
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

export async function generateInitial(options: Phase1Options) {
  const { userId, gameId, seedId, context } = options;
  const startTime = Date.now();

  const systemPromptId = 'phase1/system@v1';
  const userPromptId = 'phase1/user@v1';
  const templateData = formatSeedData(context.seed);

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

    const validated = Phase1OutputSchema.parse(parsedData);
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase1_story',
      phase: 'phase1',
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
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase1_story',
      phase: 'phase1',
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

export async function generateRegen(options: Phase1Options) {
  const { userId, gameId, seedId, context, section, feedback, currentData } = options;
  const startTime = Date.now();

  if (!section || !currentData) {
    return { success: false, error: 'Regen requires section and currentData' };
  }

  try {
    const systemPromptId = 'phase1/system@v1';
    const userPromptId = `phase1/regen/${section}@v1`;
    const templateData = {
      seed: context.seed,
      currentData,
      section,
      feedback: feedback || 'No specific feedback',
    };

    const systemPromptTemplate = getPrompt(systemPromptId);
    const userPromptTemplate = getPrompt(userPromptId);
    const systemPrompt = Handlebars.compile(systemPromptTemplate)(templateData);
    const userPrompt = Handlebars.compile(userPromptTemplate)(templateData);

    const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.regen);
    let parsedData: any;

    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      const repairResponse = await repairCycle(systemPrompt, userPrompt, llmResponse.content, MAX_TOKENS.regen);
      parsedData = JSON.parse(repairResponse.content);
    }

    // Validate the specific section being regenerated
    const validatedData = { [section]: parsedData };
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase1_story',
      phase: 'phase1',
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
      feature: 'phase1_story',
      phase: 'phase1',
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

export async function generateRemix(options: Phase1Options) {
  const { userId, gameId, seedId, context, currentData, remixBrief, preserveNouns } = options;
  const startTime = Date.now();

  const systemPromptId = 'phase1/remix/system@v1';
  const userPromptId = 'phase1/remix/user@v1';
  const templateData = {
    seed: context.seed,
    currentData: currentData || {},
    brief: remixBrief || 'Create a fresh take on the story overview',
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

    const validated = Phase1OutputSchema.parse(parsedData);
    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase1_story',
      phase: 'phase1',
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
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase1_story',
      phase: 'phase1',
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
