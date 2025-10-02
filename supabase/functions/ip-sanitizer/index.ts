import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SanitizationDetection {
  span: string;
  class: "ProtectedCharacter" | "FranchiseOrWorld" | "DistinctiveTerm" | "CreatorStyle";
  suggested_generic: string;
  confidence: number;
}

interface SanitizationResult {
  sanitized_text: string;
  detections: SanitizationDetection[];
  had_ip: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userText, genre } = await req.json();
    
    if (!userText || typeof userText !== 'string') {
      return new Response(JSON.stringify({ error: 'userText is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an IP-Safety Rewriter for a tabletop RPG setup tool.

Your job: 
1) Detect protected intellectual property references in a user's game idea. 
2) Return a sanitized version that preserves ROLE, GENRE, TONE, and PREMISE but removes protected names, worlds, and distinctive terms. 
3) Convert "in the style of <creator/franchise>" into neutral stylistic attributes.

Rules:
- No copyrighted proper nouns, titles, places, factions, or unique terms in the sanitized text.
- Replace with generic equivalents (e.g., "Jedi" → "an ancient knightly order of mystics").
- Preserve user intent concisely (1–3 sentences).
- Do not add extra lore, factions, or names.
- Output must strictly conform to the JSON schema provided.`;

    const userPrompt = `USER_IDEA:
${userText}

CONTEXT:
- If a genre was selected or inferred, it is: ${genre || 'unknown'}.
- Your job is ONLY to detect IP and rewrite to generic language while preserving the user's intended role, genre, tone, and premise.
- Do not invent proper nouns. Keep it concise (1–3 sentences).
- Convert "in the style of <X>" into neutral stylistic attributes.

Return STRICT JSON per schema. No extra text.`;

    // Call Google AI API directly with JSON mode
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nReturn a JSON object with this exact schema:\n{\n  "sanitized_text": "string",\n  "detections": [{\n    "span": "string",\n    "class": "ProtectedCharacter|FranchiseOrWorld|DistinctiveTerm|CreatorStyle",\n    "suggested_generic": "string",\n    "confidence": 0.0-1.0\n  }],\n  "had_ip": boolean\n}` }]
          }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 250,
          responseMimeType: 'application/json'
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Google AI API quota exceeded or payment required." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    // Extract result from Google AI response (JSON mode)
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.error('No valid content found in response');
      // Fallback: assume no IP detected
      return new Response(JSON.stringify({
        sanitized_text: userText.trim(),
        detections: [],
        had_ip: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: SanitizationResult = JSON.parse(content);
    
    // Validate result structure
    if (!result.sanitized_text || typeof result.had_ip !== 'boolean' || !Array.isArray(result.detections)) {
      console.error('Invalid result structure:', result);
      // Fallback: assume no IP detected
      return new Response(JSON.stringify({
        sanitized_text: userText.trim(),
        detections: [],
        had_ip: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log AI usage
    try {
      const { logAIEvent } = await import('../../src/lib/ai-usage-logger.ts');
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );

      const systemPrompt = `You are an IP-Safety Rewriter for a tabletop RPG setup tool.

Your job: 
1) Detect protected intellectual property references in a user's game idea. 
2) Return a sanitized version that preserves ROLE, GENRE, TONE, and PREMISE but removes protected names, worlds, and distinctive terms. 
3) Convert "in the style of <creator/franchise>" into neutral stylistic attributes.

Rules:
- No copyrighted proper nouns, titles, places, factions, or unique terms in the sanitized text.
- Replace with generic equivalents (e.g., "Jedi" → "an ancient knightly order of mystics").
- Preserve user intent concisely (1–3 sentences).
- Do not add extra lore, factions, or names.
- Output must strictly conform to the JSON schema provided.`;

      const userPrompt = `USER_IDEA:
${userText}

CONTEXT:
- If a genre was selected or inferred, it is: ${genre || 'unknown'}.
- Your job is ONLY to detect IP and rewrite to generic language while preserving the user's intended role, genre, tone, and premise.
- Do not invent proper nouns. Keep it concise (1–3 sentences).
- Convert "in the style of <X>" into neutral stylistic attributes.

Return STRICT JSON per schema. No extra text.`;

      const fullPrompt = systemPrompt + '\n\n' + userPrompt;
      const responseText = JSON.stringify(result);

      await logAIEvent({
        supabaseClient,
        user_id: null, // Anonymous usage for now
        feature: 'ip_sanitizer',
        phase: 'phase0',
        provider: 'google',
        model: 'gemini-2.5-flash-lite',
        response_mode: 'json',
        cache_hit: false,
        retry_count: 0,
        input_tokens: Math.ceil(fullPrompt.length / 4), // Rough estimate
        output_tokens: Math.ceil(responseText.length / 4), // Rough estimate
        prompt_text: fullPrompt,
        completion_text: responseText,
        latency_ms: 0, // Would need to track this properly
        http_status: response.status,
        error_code: null,
        status: 'success'
      });
    } catch (logError) {
      console.warn('Failed to log AI usage:', logError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ip-sanitizer function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      // Fallback: return original text if sanitization fails
      sanitized_text: '',
      detections: [],
      had_ip: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});