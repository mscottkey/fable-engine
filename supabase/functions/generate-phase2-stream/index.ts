// Phase 2: Character Generation - Streaming Edition
// Returns real-time thoughts via Server-Sent Events (SSE)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { getPrompt } from '../_shared/prompts.ts';
import { renderTemplate } from '../_shared/templates.ts';
import { callLlmStream, createSSEStream } from '../_shared/llm-stream.ts';
import { Phase2OutputSchema } from '../_shared/schemas.ts';
import { logAIEvent } from '../_shared/logger.ts';

interface RequestBody {
  gameId: string;
  seedId: string;
  overview: any;
  seeds: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const body: RequestBody = await req.json();
    const { gameId, seedId, overview, seeds } = body;

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

    // Create SSE stream
    const stream = createSSEStream(async (send) => {
      const startTime = Date.now();
      let fullContent = '';
      let fullThoughts = '';
      let usageData: any = null;

      // Load prompts
      const systemPromptTemplate = await getPrompt('phase2/system@v2');
      const userPromptTemplate = await getPrompt('phase2/user@v2');

      const templateData = {
        overview: JSON.stringify(overview, null, 2),
        seeds: JSON.stringify(seeds, null, 2),
        gameId,
        players: seeds.length,
        multipleCharacters: seeds.length > 1,
      };

      const systemPrompt = renderTemplate(systemPromptTemplate, templateData);
      const userPrompt = renderTemplate(userPromptTemplate, templateData);

      send({ type: 'content', text: 'Preparing character generation...' });

      // Call streaming LLM
      await callLlmStream(
        {
          provider: 'google',
          model: 'gemini-2.5-flash', // Can upgrade to gemini-2.0-flash-thinking-exp for better thoughts
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          maxTokens: 50000,
          responseFormat: 'json',
        },
        {
          onThought: (thought) => {
            fullThoughts += thought;
            send({ type: 'thought', text: thought });
          },
          onContent: (chunk) => {
            fullContent += chunk;
            // Don't stream content chunks for JSON - only show when complete
            // Could optionally stream if we parse partial JSON
          },
          onUsage: (usage) => {
            usageData = usage;
            send({ type: 'usage', usage });
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            send({ type: 'content', text: `Error: ${error.message}` });
          }
        }
      );

      // Validate response
      let validated;
      try {
        const parsed = JSON.parse(fullContent);
        validated = Phase2OutputSchema.parse(parsed);
        send({ type: 'content', text: 'Characters generated successfully!' });
      } catch (parseError) {
        console.error('Parse/validation error:', parseError);
        send({ type: 'content', text: `Validation error: ${parseError.message}` });
        throw parseError;
      }

      const latency = Date.now() - startTime;

      // Log AI event
      await logAIEvent({
        supabaseClient: supabase,
        user_id: user.id,
        game_id: gameId,
        seed_id: seedId,
        feature: 'characters_streaming',
        phase: 'phase2',
        provider: 'google',
        model: 'gemini-2.5-flash',
        input_tokens: usageData?.promptTokens || 0,
        output_tokens: usageData?.completionTokens || 0,
        prompt_text: systemPrompt + '\n\n' + userPrompt,
        completion_text: fullContent,
        response_mode: 'json',
        cache_hit: false,
        retry_count: 0,
        latency_ms: latency,
        http_status: 200,
        error_code: null,
        status: 'success',
      });

      // Send final validated data
      send({
        type: 'content',
        text: JSON.stringify({
          success: true,
          data: validated,
          metadata: {
            tokensUsed: (usageData?.promptTokens || 0) + (usageData?.completionTokens || 0),
            promptTokens: usageData?.promptTokens || 0,
            completionTokens: usageData?.completionTokens || 0,
            thoughtsTokenCount: usageData?.thoughtsTokenCount || 0,
            thoughts: fullThoughts,
            latency,
          }
        })
      });
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      }
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
