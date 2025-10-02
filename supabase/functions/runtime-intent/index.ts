// Runtime: Player Intent Detection Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { getPrompt } from '../_shared/prompts.ts';
import { renderTemplate } from '../_shared/templates.ts';
import { callLlm } from '../_shared/llm.ts';
import { logAIEvent } from '../_shared/logger.ts';

interface RequestBody {
  gameId: string;
  playerAction: string;
  currentBeat: any;
  recentEvents: any[];
}

interface IntentDetectionResult {
  classification: 'on-track' | 'tangent' | 'divergent';
  confidence: number;
  reasoning: string;
  alternativeAction?: string;
}

interface IntentClassification {
  isOnTrack: boolean;
  confidence: number;
  intendedBeat: string | null;
  divergenceReason?: string;
  alternativeAction?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  const startTime = Date.now();

  try {
    const body: RequestBody = await req.json();
    const { gameId, playerAction, currentBeat, recentEvents } = body;

    if (!gameId || !playerAction) {
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

    // Load prompts
    const systemPrompt = await getPrompt('gm/detect-intent/system@v1');
    const userTemplate = await getPrompt('gm/detect-intent@v1');

    // Render user prompt with context
    const userPrompt = renderTemplate(userTemplate, {
      currentBeat,
      recentEvents: (recentEvents || []).slice(-3),
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
      maxTokens: 500,
      responseFormat: 'json'
    });

    // Parse response
    const result: IntentDetectionResult = JSON.parse(llmResponse.content);

    // Convert to IntentClassification format
    const isOnTrack = result.classification === 'on-track';
    const classification: IntentClassification = {
      isOnTrack,
      confidence: result.confidence,
      intendedBeat: currentBeat?.beatId || null,
      divergenceReason: result.classification === 'divergent' ? result.reasoning : undefined,
      alternativeAction: result.alternativeAction
    };

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
      data: classification,
      metadata: {
        tokensUsed: (llmResponse.usage?.promptTokens || 0) + (llmResponse.usage?.completionTokens || 0),
        latency
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('Intent detection failed:', error);

    // Default to allowing action if detection fails
    return new Response(JSON.stringify({
      success: true,
      data: {
        isOnTrack: true,
        confidence: 50,
        intendedBeat: null
      },
      metadata: {
        tokensUsed: 0,
        latency,
        fallback: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
