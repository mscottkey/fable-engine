// Phase 2: Character Generation Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { getPrompt } from '../_shared/prompts.ts';
import { renderTemplate } from '../_shared/templates.ts';
import { callLlm } from '../_shared/llm.ts';
import { Phase2OutputSchema, validateFateSkillPyramid } from '../_shared/schemas.ts';
import { logAIEvent } from '../_shared/logger.ts';

interface CharacterSeed {
  index: number;
  mode: 'respect' | 'suggest' | 'decide';
  displayName?: string;
  pronouns?: string;
  archetypePrefs?: string[];
  roleTagsInterest?: string[];
  toneComfort?: Record<string, number>;
  violenceComfort?: string;
  complexity?: string;
  mechanicsComfort?: string;
  concept?: string;
  mustHave?: string[];
  noThanks?: string[];
  keepName?: boolean;
}

interface RequestBody {
  gameId: string;
  seedId: string;
  overview: any; // Story overview from Phase 1
  seeds: CharacterSeed[];
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string; // For regen: character index or 'bonds'
  feedback?: string;
  remixBrief?: string;
  currentData?: any;
}

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
  const repairPrompt = await getPrompt('phase2/repair@v2');

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

async function generateInitial(
  userId: string,
  gameId: string,
  seedId: string,
  overview: any,
  seeds: CharacterSeed[],
  supabase: any
) {
  const startTime = Date.now();

  const systemPromptTemplate = await getPrompt('phase2/system@v2');
  const userPromptTemplate = await getPrompt('phase2/user@v2');

  const templateData = {
    overview: JSON.stringify(overview, null, 2),
    seeds: JSON.stringify(seeds, null, 2),
    gameId,
    players: seeds.length,
  };

  const systemPrompt = renderTemplate(systemPromptTemplate, templateData);
  const userPrompt = renderTemplate(userPromptTemplate, templateData);

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
      provider: 'google',
      model: 'gemini-2.5-flash',
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
        latency,
        pyramidWarnings: pyramidErrors,
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
      prompt_text: systemPrompt + '\n\n' + userPrompt,
      completion_text: '',
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      latency_ms: latency,
      http_status: 500,
      error_code: 'GENERATION_ERROR',
      status: 'error',
    });

    throw error;
  }
}

async function generateRegen(
  userId: string,
  gameId: string,
  seedId: string,
  overview: any,
  seeds: CharacterSeed[],
  targetId: string,
  feedback: string,
  currentData: any,
  supabase: any
) {
  const startTime = Date.now();

  // Map targetId to prompt ID
  const promptId = targetId === 'bonds' ? 'phase2/regen/bonds@v1' : 'phase2/regen/pc@v1';

  const systemPromptTemplate = await getPrompt('phase2/system@v2');
  const userPromptTemplate = await getPrompt(promptId);

  const templateData = {
    overview: JSON.stringify(overview, null, 2),
    seeds: JSON.stringify(seeds, null, 2),
    currentData: JSON.stringify(currentData, null, 2),
    feedback,
    targetId,
  };

  const systemPrompt = renderTemplate(systemPromptTemplate, templateData);
  const userPrompt = renderTemplate(userPromptTemplate, templateData);

  const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.regen);
  const parsedData = JSON.parse(llmResponse.content);

  const latency = Date.now() - startTime;

  await logAIEvent({
    supabaseClient: supabase,
    user_id: userId,
    game_id: gameId,
    seed_id: seedId,
    feature: 'characters',
    phase: `phase2:regen:${targetId}`,
    provider: 'google',
    model: 'gemini-2.5-flash',
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
    data: parsedData,
    metadata: {
      tokensUsed: (llmResponse.usage?.promptTokens || 0) + (llmResponse.usage?.completionTokens || 0),
      latency,
    },
  };
}

async function generateRemix(
  userId: string,
  gameId: string,
  seedId: string,
  overview: any,
  seeds: CharacterSeed[],
  remixBrief: string,
  supabase: any
) {
  const startTime = Date.now();

  const systemPromptTemplate = await getPrompt('phase2/remix/system@v2');
  const userPromptTemplate = await getPrompt('phase2/remix/user@v2');

  const templateData = {
    overview: JSON.stringify(overview, null, 2),
    seeds: JSON.stringify(seeds, null, 2),
    remixBrief,
  };

  const systemPrompt = renderTemplate(systemPromptTemplate, templateData);
  const userPrompt = renderTemplate(userPromptTemplate, templateData);

  const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.remix);
  const parsedData = JSON.parse(llmResponse.content);
  const validated = Phase2OutputSchema.parse(parsedData);

  const latency = Date.now() - startTime;

  await logAIEvent({
    supabaseClient: supabase,
    user_id: userId,
    game_id: gameId,
    seed_id: seedId,
    feature: 'characters',
    phase: 'phase2:remix',
    provider: 'google',
    model: 'gemini-2.5-flash',
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
      latency,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const body: RequestBody = await req.json();
    const { gameId, seedId, overview, seeds, type = 'initial', targetId, feedback, remixBrief, currentData } = body;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create client with user auth context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route to appropriate handler
    let result;
    if (type === 'initial') {
      result = await generateInitial(user.id, gameId, seedId, overview, seeds, supabase);
    } else if (type === 'regen') {
      if (!targetId || !feedback) {
        return new Response(JSON.stringify({ error: 'Missing targetId or feedback for regen' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      result = await generateRegen(user.id, gameId, seedId, overview, seeds, targetId, feedback, currentData, supabase);
    } else if (type === 'remix') {
      if (!remixBrief) {
        return new Response(JSON.stringify({ error: 'Missing remixBrief for remix' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      result = await generateRemix(user.id, gameId, seedId, overview, seeds, remixBrief, supabase);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
