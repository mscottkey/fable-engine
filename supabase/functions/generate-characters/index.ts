import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CharacterGenerationRequest {
  gameId: string;
  seeds?: any[];
  overview?: any;
  type: 'lineup' | 'regen-character' | 'regen-bonds' | 'remix';
  characterIndex?: number;
  seed?: any;
  currentParty?: any[];
  feedback?: string;
  characters?: any[];
  currentLineup?: any;
  brief?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const requestData: CharacterGenerationRequest = await req.json();
    const { gameId, type } = requestData;

    // Log the AI event
    const aiEventData = {
      feature: 'characters',
      phase: 'phase2',
      model: 'google/gemini-2.5-flash',
      provider: 'lovable-ai',
      response_mode: 'sync',
      game_id: gameId,
      status: 'started',
      prompt_chars: 0,
      completion_chars: 0,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
    };

    const { data: eventData } = await supabase.from('ai_events').insert(aiEventData).select('id').single();
    const eventId = eventData?.id;

    let promptTemplate = '';
    let userPrompt = '';
    let systemPrompt = '';

    // Load appropriate prompts based on type
    switch (type) {
      case 'lineup':
        systemPrompt = await loadPromptTemplate('phase2-characters/system.v2.md');
        userPrompt = await renderUserPrompt('phase2-characters/user.v2.hbs', {
          overview: requestData.overview,
          players: requestData.seeds?.length || 0,
          gameId,
          seeds: requestData.seeds || []
        });
        break;
        
      case 'regen-character':
        systemPrompt = await loadPromptTemplate('phase2-characters/system.v2.md');
        userPrompt = await renderUserPrompt('phase2-characters/regen/pc.v1.hbs', {
          overview: requestData.overview,
          currentParty: requestData.currentParty || [],
          seed: requestData.seed,
          feedback: requestData.feedback || ''
        });
        break;
        
      case 'regen-bonds':
        systemPrompt = await loadPromptTemplate('phase2-characters/system.v2.md');
        userPrompt = await renderUserPrompt('phase2-characters/regen/bonds.v1.hbs', {
          overview: requestData.overview,
          characters: requestData.characters || []
        });
        break;
        
      case 'remix':
        systemPrompt = await loadPromptTemplate('phase2-characters/remix/system.v2.md');
        userPrompt = await renderUserPrompt('phase2-characters/remix/user.v2.hbs', {
          overview: requestData.overview,
          seeds: requestData.seeds || [],
          brief: requestData.brief || '',
          currentLineup: requestData.currentLineup
        });
        break;
        
      default:
        throw new Error(`Unknown generation type: ${type}`);
    }

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      // Update event with error
      if (eventId) {
        await supabase.from('ai_events').update({
          status: 'error',
          error_code: `http_${response.status}`,
          http_status: response.status
        }).eq('id', eventId);
      }
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI usage limit reached. Please add credits to continue.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from AI');
    }

    // Parse JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Try to repair the JSON
      const repairPrompt = await loadPromptTemplate('phase2-characters/repair.v2.md');
      const repairResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: repairPrompt },
            { role: 'user', content: `Fix this JSON:\n\n${content}` }
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (repairResponse.ok) {
        const repairedResult = await repairResponse.json();
        const repairedContent = repairedResult.choices?.[0]?.message?.content;
        if (repairedContent) {
          try {
            parsedContent = JSON.parse(repairedContent);
          } catch {
            throw new Error('Failed to parse repaired JSON');
          }
        }
      }
      
      if (!parsedContent) {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Update AI event with success
    if (eventId) {
      await supabase.from('ai_events').update({
        status: 'success',
        prompt_chars: (systemPrompt + userPrompt).length,
        completion_chars: content.length,
        input_tokens: aiResponse.usage?.prompt_tokens || 0,
        output_tokens: aiResponse.usage?.completion_tokens || 0,
        // Note: Cost calculation would need model pricing data
      }).eq('id', eventId);
    }

    // Return appropriate response based on type
    let result;
    switch (type) {
      case 'lineup':
      case 'remix':
        result = { lineup: parsedContent };
        break;
      case 'regen-character':
        result = { character: parsedContent };
        break;
      case 'regen-bonds':
        result = { bonds: parsedContent };
        break;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Character generation error:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions for loading prompts
async function loadPromptTemplate(path: string): Promise<string> {
  try {
    // In a real implementation, you'd load from your prompts directory
    // For now, return basic templates
    if (path.includes('system.v2.md')) {
      return `You are an expert AI Game Master creating memorable player characters. 
      Follow the provided requirements exactly and return valid JSON only.
      Respect player preferences while ensuring party balance and story integration.`;
    }
    
    if (path.includes('repair.v2.md')) {
      return `Fix the invalid JSON structure. Return only the corrected JSON with no additional text.`;
    }
    
    if (path.includes('remix/system.v2.md')) {
      return `You are redesigning a character lineup. Create entirely new characters while preserving story connections and player comfort levels. Return valid JSON only.`;
    }
    
    return `Create characters following the provided requirements. Return valid JSON only.`;
  } catch {
    return `Create characters following the requirements. Return valid JSON only.`;
  }
}

async function renderUserPrompt(template: string, data: any): Promise<string> {
  // Simple template rendering - in production, use a proper template engine
  const overview = JSON.stringify(data.overview || {}, null, 2);
  const seeds = JSON.stringify(data.seeds || [], null, 2);
  
  if (template.includes('user.v2.hbs')) {
    return `STORY OVERVIEW
${overview}

PLAYERS: ${data.players || 0}   GAME_ID: ${data.gameId}

CHARACTER SEEDS (one per slot, index-based)
${seeds}

CONSTRAINTS
- For each slot, follow the mode: respect/suggest/decide
- Tie each PC to at least one location and one hook
- Keep output STRICT JSON
- Ensure party has complementary roles and skills
- All content must be IP-safe

SCHEMA REQUIREMENTS
Return a JSON object with:
- characters: Array of character objects (one per slot)
- bonds: Array of character relationship objects
- coverage: Object describing party capabilities

Each character must include:
- name (string)
- pronouns (string)
- concept (string)
- background (string)
- mechanicalRole (string)
- socialRole (string)
- explorationRole (string)
- primaryArchetype (string)
- secondaryArchetype (string, optional)
- personalityTraits (array of strings)
- motivations (array of strings)
- flaws (array of strings)
- connections (object with locations and hooks arrays)
- equipment (array of strings)
- abilities (array of strings)

Each bond must include:
- character1Index (number)
- character2Index (number)
- relationship (string)
- description (string)

Return the complete lineup following this exact schema.`;
  }
  
  if (template.includes('regen/pc.v1.hbs')) {
    return `REGENERATE SINGLE CHARACTER

STORY OVERVIEW
${overview}

CURRENT PARTY (exclude character being regenerated)
${JSON.stringify(data.currentParty || [], null, 2)}

CHARACTER SEED
${JSON.stringify(data.seed || {}, null, 2)}

PLAYER FEEDBACK
${data.feedback || 'No specific feedback provided'}

Return a single character object that fits the party and addresses feedback.`;
  }
  
  if (template.includes('regen/bonds.v1.hbs')) {
    return `REGENERATE CHARACTER BONDS

STORY OVERVIEW
${overview}

CURRENT PARTY
${JSON.stringify(data.characters || [], null, 2)}

Return an array of bond objects showing relationships between characters.`;
  }
  
  if (template.includes('remix/user.v2.hbs')) {
    return `FULL LINEUP REMIX

STORY OVERVIEW
${overview}

CHARACTER SEEDS
${seeds}

REMIX BRIEF
${data.brief || 'Create a completely different take on the party'}

CURRENT LINEUP (for reference - create something different)
${JSON.stringify(data.currentLineup || {}, null, 2)}

Return a completely reimagined character lineup.`;
  }
  
  return `Generate characters based on the provided data: ${JSON.stringify(data, null, 2)}`;
}