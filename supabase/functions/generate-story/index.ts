import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt registry (simplified version for edge function)
const PROMPT_TEMPLATES: Record<string, string> = {
  'phase1/system@v1': `You are an Expert Game Master and campaign designer. Expand a curated CampaignSeed into a structured, playable Story Overview for Phase 1.

Rules:
- Be evocative yet concise; write for play at the table (short paragraphs).
- No copyrighted or franchise names. Create original proper nouns.
- Respect genre, tone levers, difficulty, and initial hooks.
- Output STRICT JSON matching the provided schema. No extra keys, no commentary.`,

  'phase1/user@v1': `CAMPAIGN_SEED
Name: {{name}}
Genre: {{genre}}
Vibe: {{tone_vibe}}
Tone Levers:
- Pace: {{pace}}
- Danger: {{danger}}
- Morality: {{morality}}
- Scale: {{scale}}
Difficulty: {{difficulty_label}} — {{difficulty_desc}}

Setting (seed):
{{setting}}

Notable Locations (seed):
{{notable_locations}}

Initial Hooks (seed):
{{hooks}}

INSTRUCTIONS
- Expand the seed into a Story Overview matching the JSON schema exactly.
- Keep paragraphs tight (2–4 sentences). Avoid lore dumps.
- Build on the seed's hooks/locations; you may add up to 2 hidden/emergent locations.
- Do not use franchise or IP terms.
- Return STRICT JSON only.`,

  'phase1/repair@v1': `You returned invalid JSON. Fix it to match the provided schema exactly.
Return STRICT, minified JSON. No comments, no prose.`
};

// Simple template renderer
function renderTemplate(template: string, data: any): string {
  let result = template;
  
  // Replace all {{variable}} patterns
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(data[key] || ''));
  });
  
  return result;
}

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

async function logAIEvent(
  userId: string,
  gameId: string | null,
  seedId: string | null,
  phase: string,
  promptTemplateId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  latencyMs: number,
  status: string,
  httpStatus: number,
  errorCode?: string,
  promptText: string = '',
  completionText: string = ''
): Promise<number> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Lookup pricing for cost calculation
  const { data: pricingData } = await supabase
    .from('model_pricing')
    .select('id, input_rate, output_rate')
    .eq('provider', 'google')
    .eq('model', model)
    .lte('effective_from', new Date().toISOString())
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  let cost = 0;
  let pricingId = null;
  
  if (pricingData) {
    pricingId = pricingData.id;
    const inputRate = Number(pricingData.input_rate);
    const outputRate = Number(pricingData.output_rate);
    cost = (inputTokens / 1000 * inputRate) + (outputTokens / 1000 * outputRate);
    cost = Math.round(cost * 1000000) / 1000000; // Round to 6 decimals
  }

  await supabase.from('ai_events').insert({
    user_id: userId,
    game_id: gameId,
    seed_id: seedId,
    pricing_id: pricingId,
    feature: 'phase1_story',
    phase,
    prompt_hash: await hashString(promptText || promptTemplateId),
    completion_hash: await hashString(completionText || `${model}-${Date.now()}`),
    model,
    provider: 'google',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    prompt_chars: promptText.length,
    completion_chars: completionText.length,
    cost_usd: cost,
    latency_ms: latencyMs,
    status,
    http_status: httpStatus,
    error_code: errorCode,
    response_mode: 'json',
    cache_hit: false,
    retry_count: 0
  });

  return cost;
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seedId, type, section, feedback, remixBrief, schema } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user from auth header
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

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
      .eq('user_id', user.id)
      .single();

    if (seedError || !seed) {
      console.error('Seed fetch error:', seedError);
      return new Response(JSON.stringify({ error: 'Campaign seed not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare prompt based on type
    let systemPrompt = PROMPT_TEMPLATES['phase1/system@v1'];
    let userPrompt = '';
    let promptTemplateId = 'phase1/user@v1';
    let phase = 'phase1:initial';

    if (type === 'remix') {
      systemPrompt = `You are an Expert Game Master. Rebuild the entire Story Overview from the given CampaignSeed, honoring the Remix Brief.

Rules:
- Respect genre, sanitized seed, and tone levers unless the brief requests targeted changes.
- Do not re-use prior proper nouns unless the brief explicitly says to keep them.
- Output STRICT JSON matching the schema. No commentary.`;
      
      userPrompt = `CAMPAIGN_SEED
${JSON.stringify(seed, null, 2)}

REMIX BRIEF
${remixBrief}

ADDITIONAL RULES
- Keep content IP-safe and original.
- Balance novelty with coherence: hooks should map to locations and core conflict.
- Return STRICT JSON only.`;
      
      promptTemplateId = 'phase1/remix/user@v1';
      phase = 'phase1:remix';
    } else {
      userPrompt = renderTemplate(PROMPT_TEMPLATES['phase1/user@v1'], formatSeedData(seed));
    }

    const startTime = Date.now();

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
          { role: 'user', content: `JSON Schema to follow strictly:\n${JSON.stringify(schema, null, 2)}` }
        ],
        temperature: undefined // Gemini doesn't support temperature
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      await logAIEvent(
        user.id,
        null,
        seedId,
        phase,
        promptTemplateId,
        'gemini-2.5-flash',
        0,
        0,
        latencyMs,
        'error',
        response.status,
        `API_ERROR_${response.status}`,
        userPrompt,
        ''
      );

      return new Response(JSON.stringify({ 
        error: response.status === 429 ? 'Rate limit exceeded' : 'AI service error' 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      await logAIEvent(
        user.id,
        null,
        seedId,
        phase,
        promptTemplateId,
        'gemini-2.5-flash',
        data.usage?.prompt_tokens || 0,
        data.usage?.completion_tokens || 0,
        latencyMs,
        'error',
        200,
        'NO_CONTENT',
        userPrompt,
        ''
      );

      return new Response(JSON.stringify({ error: 'No content generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try to parse JSON
    let storyData;
    try {
      storyData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Try repair
      const repairResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: PROMPT_TEMPLATES['phase1/repair@v1'] },
            { role: 'user', content: `Fix this JSON:\n${content}\n\nSchema:\n${JSON.stringify(schema, null, 2)}` }
          ]
        }),
      });

      if (repairResponse.ok) {
        const repairData = await repairResponse.json();
        const repairedContent = repairData.choices[0]?.message?.content;
        try {
          storyData = JSON.parse(repairedContent);
        } catch (repairParseError) {
          console.error('Repair parse error:', repairParseError);
          
          await logAIEvent(
            user.id,
            null,
            seedId,
            phase,
            promptTemplateId,
            'gemini-2.5-flash',
            data.usage?.prompt_tokens || 0,
            data.usage?.completion_tokens || 0,
            latencyMs,
            'error',
            200,
            'JSON_PARSE_ERROR',
            userPrompt,
            content
          );

          return new Response(JSON.stringify({ error: 'Failed to generate valid JSON' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    const calculatedCost = await logAIEvent(
      user.id,
      null,
      seedId,
      phase,
      promptTemplateId,
      'gemini-2.5-flash',
      data.usage?.prompt_tokens || 0,
      data.usage?.completion_tokens || 0,
      latencyMs,
      'success',
      200,
      undefined,
      userPrompt,
      content
    );

    return new Response(JSON.stringify({
      story: storyData,
      tokensUsed: data.usage?.total_tokens || 0,
      cost: calculatedCost,
      latency: latencyMs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});