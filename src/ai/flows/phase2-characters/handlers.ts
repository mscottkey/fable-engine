import Handlebars from 'handlebars';
import { callLlm } from '../../llm';
import { getPrompt } from '../../prompts';
import { Phase2OutputSchema, CharacterSchema, validateFateSkillPyramid } from '../../schemas/phase2';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { supabase } from '@/integrations/supabase/client';
import type { Phase2Options } from './types';

Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));

const MAX_TOKENS = {
  initial: 8000,
  regen: 4000,
  remix: 8000,
};

async function doCall(systemPrompt: string, userPrompt: string, maxTokens: number) {
  return callLlm({
    provider: 'google',
    model: 'gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    maxTokens,
    responseFormat: 'json',
  });
}

async function repairCycle(systemPrompt: string, userPrompt: string, llmContent: string, maxTokens: number) {
  const repairPromptId = 'phase2/repair@v2';
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

export async function generateInitial(options: Phase2Options) {
  const { userId, gameId, seedId, context } = options;
  const startTime = Date.now();

  const systemPromptId = 'phase2/system@v2';
  const userPromptId = 'phase2/user@v2';
  const templateData = {
    overview: context.overview,
    seeds: context.seeds,
    gameId: context.gameId,
    players: context.seeds.length,
  };

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

    const validated = Phase2OutputSchema.parse(parsedData);

    // Validate FATE pyramid for each character
    const pyramidErrors: string[] = [];
    validated.characters.forEach((char, index) => {
      const pyramidValidation = validateFateSkillPyramid(char.skills);
      if (!pyramidValidation.valid) {
        pyramidErrors.push(`Character ${index} (${char.name}): ${pyramidValidation.errors.join(', ')}`);
      }
    });

    if (pyramidErrors.length > 0) {
      console.warn('FATE pyramid validation issues:', pyramidErrors);
    }

    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'characters',
      phase: 'phase2',
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
        pyramidWarnings: pyramidErrors.length > 0 ? pyramidErrors : undefined,
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'characters',
      phase: 'phase2',
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

export async function generateRegen(options: Phase2Options) {
  const { userId, gameId, seedId, context, targetId, feedback, currentData } = options;
  const startTime = Date.now();

  if (!targetId || !currentData) {
    return { success: false, error: 'Regen requires targetId and currentData' };
  }

  try {
    let systemPromptId: string;
    let userPromptId: string;
    let templateData: any;
    let maxTokens = MAX_TOKENS.regen;

    if (targetId === 'bonds') {
      // Regenerate bonds
      systemPromptId = 'phase2/system@v2';
      userPromptId = 'phase2/regen/bonds@v1';
      templateData = {
        characters: currentData.characters,
        overview: context.overview,
        feedback: feedback || 'No specific feedback',
      };
    } else {
      // Regenerate specific character
      const characterIndex = parseInt(targetId.replace('pc-', ''));
      systemPromptId = 'phase2/system@v2';
      userPromptId = 'phase2/regen/pc@v1';
      templateData = {
        characterIndex,
        currentParty: currentData.characters.filter((_: any, i: number) => i !== characterIndex),
        overview: context.overview,
        seed: context.seeds[characterIndex],
        feedback: feedback || 'No specific feedback',
      };
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

    if (targetId === 'bonds') {
      validatedData = { bonds: parsedData };
    } else {
      const character = CharacterSchema.parse(parsedData);
      const pyramidValidation = validateFateSkillPyramid(character.skills);
      if (!pyramidValidation.valid) {
        console.warn('FATE pyramid validation issues:', pyramidValidation.errors);
      }
      validatedData = { character };
    }

    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'characters',
      phase: 'phase2',
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
      feature: 'characters',
      phase: 'phase2',
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

export async function generateRemix(options: Phase2Options) {
  const { userId, gameId, seedId, context, currentData, remixBrief } = options;
  const startTime = Date.now();

  const systemPromptId = 'phase2/remix/system@v2';
  const userPromptId = 'phase2/remix/user@v2';
  const templateData = {
    overview: context.overview,
    seeds: context.seeds,
    currentLineup: currentData || {},
    brief: remixBrief || 'Create a fresh take on the party lineup',
    gameId: context.gameId,
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

    const validated = Phase2OutputSchema.parse(parsedData);

    // Validate FATE pyramid for each character
    const pyramidErrors: string[] = [];
    validated.characters.forEach((char, index) => {
      const pyramidValidation = validateFateSkillPyramid(char.skills);
      if (!pyramidValidation.valid) {
        pyramidErrors.push(`Character ${index} (${char.name}): ${pyramidValidation.errors.join(', ')}`);
      }
    });

    if (pyramidErrors.length > 0) {
      console.warn('FATE pyramid validation issues:', pyramidErrors);
    }

    const latency = Date.now() - startTime;

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'characters',
      phase: 'phase2',
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
        pyramidWarnings: pyramidErrors.length > 0 ? pyramidErrors : undefined,
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'characters',
      phase: 'phase2',
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
