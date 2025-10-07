// Runtime: Narrative Turn Generation Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { getPrompt } from '../_shared/prompts.ts';
import { renderTemplate } from '../_shared/templates.ts';
import { callLlm } from '../_shared/llm.ts';
import { logAIEvent } from '../_shared/logger.ts';

interface NarrativeTurnContext {
  storyOverview: any;
  storyState: any;
  characters: any[];
  recentEvents: any[];
  lastEvent?: any;
  currentBeat?: any;
  campaignStructure?: any;
}

interface RequestBody {
  gameId: string;
  context: NarrativeTurnContext;
  playerAction: string;
  characterId: string;
}

interface NarrativeTurnResult {
  narration: string;
  consequences: string[];
  decisionPoint: {
    prompt: string;
    options: Array<{
      label: string;
      description: string;
      estimatedConsequences: string[];
    }>;
  };
  stateChanges: {
    worldFacts?: Record<string, any>;
    locationStates?: Record<string, any>;
    npcStates?: Record<string, any>;
    characterRelationships?: Record<string, any>;
  };
  diceRolls?: Array<{
    character: string;
    skill: string;
    result: number;
    outcome: string;
  }>;
  gmNotes: string;
  beatProgress?: {
    keyInfoRevealed?: string[];
    beatComplete?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  const startTime = Date.now();

  try {
    const body: RequestBody = await req.json();
    const { gameId, context, playerAction, characterId } = body;

    if (!gameId || !context || !playerAction || !characterId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    // Find character name
    const character = context.characters.find(c => c.id === characterId);
    const characterName = character?.pc_json?.name || 'Unknown';

    // Load prompts
    const systemPrompt = await getPrompt('gm/system@v1');
    const userTemplate = await getPrompt('gm/narrate-turn@v1');

    // Render user prompt with context
    const userPrompt = renderTemplate(userTemplate, {
      context,
      characterName,
      playerAction
    });

    // Call LLM
    const llmResponse = await callLlm({
      provider: 'google',
      model: 'gemini-2.0-flash-exp',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      maxTokens: 2048,
      responseFormat: 'json'
    });

    // Parse and validate response
    let result: NarrativeTurnResult;
    try {
      result = JSON.parse(llmResponse.content);
    } catch (error) {
      console.error('Failed to parse narrative turn JSON:', error);
      console.error('Raw response:', llmResponse.content);
      throw new Error('AI returned invalid JSON for narrative turn');
    }

    // Validate required fields
    if (!result.narration || !result.decisionPoint || !result.stateChanges) {
      throw new Error('AI response missing required fields');
    }

    const latency = Date.now() - startTime;

    // Log AI event
    await logAIEvent({
      supabaseClient: supabase,
      user_id: user.id,
      game_id: gameId,
      seed_id: null,
      feature: 'runtime_turn',
      phase: 'runtime',
      provider: 'google',
      model: 'gemini-2.0-flash-exp',
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

    return new Response(JSON.stringify({
      success: true,
      data: result,
      metadata: {
        tokensUsed: (llmResponse.usage?.promptTokens || 0) + (llmResponse.usage?.completionTokens || 0),
        latency
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const latency = Date.now() - startTime;
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
