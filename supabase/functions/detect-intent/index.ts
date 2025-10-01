// Intent Detection Edge Function
// Classifies player actions for off-rails warnings
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { callLlm } from '../_shared/llm.ts';
import { logAIEvent } from '../_shared/logger.ts';

interface RequestBody {
  gameId: string;
  playerAction: string;
  currentBeat: any;
  recentEvents: any[];
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

  try {
    const body: RequestBody = await req.json();
    const { gameId, playerAction, currentBeat, recentEvents } = body;

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

    const startTime = Date.now();

    const systemPrompt = `You are a campaign analyzer for a tabletop RPG. Analyze player actions to determine if they align with the current story beat or diverge from the campaign plan.

Classification Rules:
- "on-track": Action directly advances the current beat's objectives
- "tangent": Action is related but doesn't advance beat (e.g., shopping, side conversations)
- "divergent": Action completely ignores beat and goes in different direction

Return JSON: {
  "classification": "on-track" | "tangent" | "divergent",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "alternativeAction": "suggestion if divergent"
}`;

    const userPrompt = `# Current Beat
**Title**: ${currentBeat?.title || 'Unknown'}
**Description**: ${currentBeat?.description || 'No beat active'}
**Objectives**: ${currentBeat?.objectives?.join(', ') || 'None'}
**Key Info to Reveal**: ${currentBeat?.completionConditions?.requiredInfo?.join(', ') || 'None'}

# Recent Context
${recentEvents.slice(-3).map((e: any) => `- ${e.narration}`).join('\n')}

# Player Action
${playerAction}

Classify this action's intent.`;

    try {
      const response = await callLlm({
        provider: 'google',
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: 500,
        responseFormat: 'json'
      });

      const result = JSON.parse(response.content);
      const latency = Date.now() - startTime;

      await logAIEvent({
        supabaseClient: supabase,
        user_id: user.id,
        game_id: gameId,
        seed_id: null,
        feature: 'runtime_turn',
        phase: 'runtime',
        provider: 'google',
        model: 'gemini-2.5-flash',
        input_tokens: response.usage?.promptTokens || 0,
        output_tokens: response.usage?.completionTokens || 0,
        prompt_text: systemPrompt + '\n\n' + userPrompt,
        completion_text: response.content,
        response_mode: 'json',
        cache_hit: false,
        retry_count: 0,
        latency_ms: latency,
        http_status: 200,
        error_code: null,
        status: 'success',
      });

      const isOnTrack = result.classification === 'on-track';
      const confidence = result.confidence;

      const classification: IntentClassification = {
        isOnTrack,
        confidence,
        intendedBeat: currentBeat?.beatId || null,
        divergenceReason: result.classification === 'divergent' ? result.reasoning : undefined,
        alternativeAction: result.alternativeAction
      };

      return new Response(JSON.stringify({
        success: true,
        classification,
        metadata: {
          tokensUsed: (response.usage?.promptTokens || 0) + (response.usage?.completionTokens || 0),
          latency
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Intent detection failed:', error);

      const latency = Date.now() - startTime;
      await logAIEvent({
        supabaseClient: supabase,
        user_id: user.id,
        game_id: gameId,
        seed_id: null,
        feature: 'runtime_turn',
        phase: 'runtime',
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
        error_code: 'DETECTION_ERROR',
        status: 'error',
      });

      // Default to allowing action if detection fails
      return new Response(JSON.stringify({
        success: true,
        classification: {
          isOnTrack: true,
          confidence: 50,
          intendedBeat: currentBeat?.beatId || null
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
