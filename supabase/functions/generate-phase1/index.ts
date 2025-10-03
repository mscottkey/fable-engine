// Phase 1: Story Overview Generation Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { getPrompt } from '../_shared/prompts.ts';
import { renderTemplate } from '../_shared/templates.ts';
import { callLlm } from '../_shared/llm.ts';
import { Phase1OutputSchema } from '../_shared/schemas.ts';
import { logAIEvent } from '../_shared/logger.ts';

interface RequestBody {
  seedId: string;
  type?: 'initial' | 'regen' | 'remix';
  section?: string; // For regen: expandedSetting, notableLocations, etc.
  feedback?: string;
  remixBrief?: string;
  preserveNouns?: boolean;
  currentData?: any;
}

const MAX_TOKENS = {
  initial: 8000,  // Increased to allow for thoughts + response
  regen: 4000,
  remix: 8000,
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
  const repairPrompt = await getPrompt('phase1/repair@v1');

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

async function generateInitial(userId: string, gameId: string | null, seedId: string, seed: any, supabase: any) {
  const startTime = Date.now();

  console.log('Starting phase1 generation for seedId:', seedId);

  const systemPromptTemplate = await getPrompt('phase1/system@v1');
  console.log('System prompt loaded, length:', systemPromptTemplate.length);

  const userPromptTemplate = await getPrompt('phase1/user@v1');
  console.log('User prompt loaded, length:', userPromptTemplate.length);

  const templateData = formatSeedData(seed);
  console.log('Template data prepared');

  const systemPrompt = renderTemplate(systemPromptTemplate, templateData);
  const userPrompt = renderTemplate(userPromptTemplate, templateData);
  console.log('Prompts rendered. Calling LLM...');

  try {
    const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.initial);
    let parsedData: any;

    console.log('LLM Response length:', llmResponse.content?.length || 0);
    console.log('LLM Response preview:', llmResponse.content?.substring(0, 200));

    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      console.error('Initial JSON parse failed:', parseError);
      console.log('Attempting repair cycle...');
      const repairResponse = await repairCycle(systemPrompt, userPrompt, llmResponse.content, MAX_TOKENS.initial);
      console.log('Repair response length:', repairResponse.content?.length || 0);
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
        promptTokens: llmResponse.usage?.promptTokens || 0,
        completionTokens: llmResponse.usage?.completionTokens || 0,
        thoughtsTokenCount: (llmResponse as any).usage?.thoughtsTokenCount || 0,
        latency,
      },
    };
  } catch (error) {
    console.error('Generation error:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');

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
      prompt_text: systemPrompt || '',
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
  gameId: string | null,
  seedId: string,
  seed: any,
  section: string,
  feedback: string,
  currentData: any,
  supabase: any
) {
  const startTime = Date.now();

  // Map section name to prompt ID
  const sectionPromptMap: Record<string, string> = {
    expandedSetting: 'phase1/regen/expandedSetting@v1',
    notableLocations: 'phase1/regen/notableLocations@v1',
    toneManifesto: 'phase1/regen/toneManifesto@v1',
    storyHooks: 'phase1/regen/storyHooks@v1',
    coreConflict: 'phase1/regen/coreConflict@v1',
    sessionZero: 'phase1/regen/sessionZero@v1',
  };

  const promptId = sectionPromptMap[section];
  if (!promptId) {
    throw new Error(`Unknown section: ${section}`);
  }

  const systemPromptTemplate = await getPrompt('phase1/system@v1');
  const userPromptTemplate = await getPrompt(promptId);

  const templateData = {
    ...formatSeedData(seed),
    currentData: JSON.stringify(currentData, null, 2),
    feedback,
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
    feature: 'phase1_story',
    phase: `phase1:regen:${section}`,
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
    data: { [section]: parsedData },
    metadata: {
      tokensUsed: (llmResponse.usage?.promptTokens || 0) + (llmResponse.usage?.completionTokens || 0),
      latency,
    },
  };
}

async function generateRemix(
  userId: string,
  gameId: string | null,
  seedId: string,
  seed: any,
  remixBrief: string,
  preserveNouns: boolean,
  supabase: any
) {
  const startTime = Date.now();

  const systemPromptTemplate = await getPrompt('phase1/remix/system@v1');
  const userPromptTemplate = await getPrompt('phase1/remix/user@v1');

  const templateData = {
    seed: JSON.stringify(seed, null, 2),
    remixBrief,
    preserveNouns: preserveNouns ? 'YES' : 'NO',
  };

  const systemPrompt = renderTemplate(systemPromptTemplate, templateData);
  const userPrompt = renderTemplate(userPromptTemplate, templateData);

  const llmResponse = await doCall(systemPrompt, userPrompt, MAX_TOKENS.remix);
  const parsedData = JSON.parse(llmResponse.content);
  const validated = Phase1OutputSchema.parse(parsedData);

  const latency = Date.now() - startTime;

  await logAIEvent({
    supabaseClient: supabase,
    user_id: userId,
    game_id: gameId,
    seed_id: seedId,
    feature: 'phase1_story',
    phase: 'phase1:remix',
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
    const { seedId, type = 'initial', section, feedback, remixBrief, preserveNouns = false, currentData } = body;

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

    // Get campaign seed
    const { data: seed, error: seedError } = await supabase
      .from('campaign_seeds')
      .select('*')
      .eq('id', seedId)
      .maybeSingle();

    if (seedError || !seed) {
      return new Response(JSON.stringify({ error: 'Campaign seed not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route to appropriate handler
    let result;
    if (type === 'initial') {
      result = await generateInitial(user.id, null, seedId, seed, supabase);

      // Update seed with generated story
      await supabase
        .from('campaign_seeds')
        .update({
          generation_status: 'story_generated',
          story_overview_draft: result.data
        })
        .eq('id', seedId);
    } else if (type === 'regen') {
      if (!section || !feedback) {
        return new Response(JSON.stringify({ error: 'Missing section or feedback for regen' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      result = await generateRegen(user.id, null, seedId, seed, section, feedback, currentData, supabase);
    } else if (type === 'remix') {
      if (!remixBrief) {
        return new Response(JSON.stringify({ error: 'Missing remixBrief for remix' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      result = await generateRemix(user.id, null, seedId, seed, remixBrief, preserveNouns, supabase);

      // Update seed with remixed story
      await supabase
        .from('campaign_seeds')
        .update({
          generation_status: 'story_generated',
          story_overview_draft: result.data
        })
        .eq('id', seedId);
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
