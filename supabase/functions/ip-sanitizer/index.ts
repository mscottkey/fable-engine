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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Fast and cheap model for this task
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        max_tokens: 250,
        tools: [
          {
            type: "function",
            function: {
              name: "sanitize_ip",
              description: "Sanitize IP references and return structured result",
              parameters: {
                type: "object",
                properties: {
                  sanitized_text: { type: "string" },
                  detections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        span: { type: "string" },
                        class: { 
                          type: "string", 
                          enum: ["ProtectedCharacter","FranchiseOrWorld","DistinctiveTerm","CreatorStyle"] 
                        },
                        suggested_generic: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 }
                      },
                      required: ["span","class","suggested_generic","confidence"],
                      additionalProperties: false
                    }
                  },
                  had_ip: { type: "boolean" }
                },
                required: ["sanitized_text","detections","had_ip"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "sanitize_ip" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
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

    // Extract result from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'sanitize_ip') {
      console.error('No valid tool call found in response');
      // Fallback: assume no IP detected
      return new Response(JSON.stringify({
        sanitized_text: userText.trim(),
        detections: [],
        had_ip: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: SanitizationResult = JSON.parse(toolCall.function.arguments);
    
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