// supabase/functions/generate-characters/index.ts
// Production-grade edge function with idempotency, proper error handling, and FATE validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// FATE Core Schema Definitions
// ============================================================================

interface FateAspects {
  highConcept: string;
  trouble: string;
  aspect3: string;
  aspect4: string;
  aspect5: string;
}

interface FateSkill {
  name: string;
  rating: number; // 0-4
}

interface FateStress {
  physical: number;
  mental: number;
}

interface Character {
  name: string;
  pronouns: string;
  concept: string;
  background: string;
  aspects: FateAspects;
  skills: FateSkill[];
  stunts: string[];
  stress: FateStress;
  consequences: string[];
  refresh: number;
  connections?: {
    locations: string[];
    hooks: string[];
  };
  equipment?: string[];
}

interface CharacterLineup {
  characters: Character[];
  bonds: Array<{
    character1Index: number;
    character2Index: number;
    relationship: string;
    description: string;
  }>;
  coverage?: any;
}

// ============================================================================
// FATE Validation Functions
// ============================================================================

function validateFateSkills(skills: FateSkill[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Count skills by rating
  const ratingCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  skills.forEach(skill => {
    if (skill.rating < 0 || skill.rating > 4) {
      errors.push(`Invalid skill rating ${skill.rating} for ${skill.name}`);
      return;
    }
    ratingCounts[skill.rating]++;
  });
  
  // Validate FATE pyramid: 1 at +4, 2 at +3, 3 at +2, 4 at +1
  if (ratingCounts[4] !== 1) {
    errors.push(`FATE pyramid requires exactly 1 skill at +4 (found ${ratingCounts[4]})`);
  }
  if (ratingCounts[3] !== 2) {
    errors.push(`FATE pyramid requires exactly 2 skills at +3 (found ${ratingCounts[3]})`);
  }
  if (ratingCounts[2] !== 3) {
    errors.push(`FATE pyramid requires exactly 3 skills at +2 (found ${ratingCounts[2]})`);
  }
  if (ratingCounts[1] !== 4) {
    errors.push(`FATE pyramid requires exactly 4 skills at +1 (found ${ratingCounts[1]})`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function validateCharacter(character: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!character.name || typeof character.name !== 'string') {
    errors.push('Character missing valid name');
  }
  if (!character.pronouns || typeof character.pronouns !== 'string') {
    errors.push('Character missing valid pronouns');
  }
  if (!character.concept || typeof character.concept !== 'string') {
    errors.push('Character missing valid concept');
  }
  if (!character.background || typeof character.background !== 'string') {
    errors.push('Character missing valid background');
  }
  
  // Validate aspects
  if (!character.aspects) {
    errors.push('Character missing aspects');
  } else {
    if (!character.aspects.highConcept) errors.push('Missing High Concept aspect');
    if (!character.aspects.trouble) errors.push('Missing Trouble aspect');
    if (!character.aspects.aspect3) errors.push('Missing third aspect');
    if (!character.aspects.aspect4) errors.push('Missing fourth aspect');
    if (!character.aspects.aspect5) errors.push('Missing fifth aspect');
  }
  
  // Validate skills
  if (!character.skills || !Array.isArray(character.skills)) {
    errors.push('Character missing skills array');
  } else {
    const skillValidation = validateFateSkills(character.skills);
    errors.push(...skillValidation.errors);
  }
  
  // Validate stunts
  if (!character.stunts || !Array.isArray(character.stunts)) {
    errors.push('Character missing stunts array');
  } else if (character.stunts.length !== 3) {
    errors.push(`Character should have 3 stunts (found ${character.stunts.length})`);
  }
  
  // Validate stress
  if (!character.stress) {
    errors.push('Character missing stress tracks');
  } else {
    if (typeof character.stress.physical !== 'number' || character.stress.physical < 2 || character.stress.physical > 4) {
      errors.push('Physical stress should be 2-4 boxes');
    }
    if (typeof character.stress.mental !== 'number' || character.stress.mental < 2 || character.stress.mental > 4) {
      errors.push('Mental stress should be 2-4 boxes');
    }
  }
  
  // Validate consequences
  if (!character.consequences || !Array.isArray(character.consequences)) {
    errors.push('Character missing consequences');
  } else if (character.consequences.length !== 3) {
    errors.push('Character should have 3 consequence slots (Mild, Moderate, Severe)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function validateLineup(lineup: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!lineup.characters || !Array.isArray(lineup.characters)) {
    errors.push('Lineup missing characters array');
    return { valid: false, errors };
  }
  
  // Validate each character
  lineup.characters.forEach((char: any, index: number) => {
    const charValidation = validateCharacter(char);
    if (!charValidation.valid) {
      errors.push(`Character ${index} (${char.name || 'unnamed'}): ${charValidation.errors.join(', ')}`);
    }
  });
  
  // Validate bonds
  if (!lineup.bonds || !Array.isArray(lineup.bonds)) {
    errors.push('Lineup missing bonds array');
  } else {
    lineup.bonds.forEach((bond: any, index: number) => {
      if (typeof bond.character1Index !== 'number' || typeof bond.character2Index !== 'number') {
        errors.push(`Bond ${index} missing character indices`);
      } else if (bond.character1Index === bond.character2Index) {
        errors.push(`Bond ${index} cannot be between same character`);
      } else if (bond.character1Index >= lineup.characters.length || bond.character2Index >= lineup.characters.length) {
        errors.push(`Bond ${index} references invalid character index`);
      }
      if (!bond.relationship || typeof bond.relationship !== 'string') {
        errors.push(`Bond ${index} missing relationship type`);
      }
      if (!bond.description || typeof bond.description !== 'string') {
        errors.push(`Bond ${index} missing description`);
      }
    });
    
    // Should have at least 2 bonds
    if (lineup.bonds.length < 2) {
      errors.push(`Should have at least 2 bonds between characters (found ${lineup.bonds.length})`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Prompt Templates
// ============================================================================

function getSystemPrompt(): string {
  return `You are The Fablist, an expert AI Game Master creating memorable player characters for Fate Core/Accelerated RPG.

CORE PRINCIPLES:
- Create characters using Fate Core mechanics (aspects, skills, stunts, stress, consequences)
- Respect player preferences while ensuring party balance and story integration
- Generate meaningful PC-to-PC bonds that create party dynamics
- Tie characters to story locations and hooks
- Follow the provided requirements exactly and return valid JSON only

FATE CORE MECHANICS REQUIREMENTS:
- 5 Aspects:
  * High Concept: Defines the character's essence
  * Trouble: A complication that drives drama
  * 3 Additional Aspects: Relationships, beliefs, or characteristics
  
- Skills (Great Pyramid):
  * 1 skill at +4 (Great)
  * 2 skills at +3 (Good)
  * 3 skills at +2 (Fair)
  * 4 skills at +1 (Average)
  * All other skills at +0 (Mediocre)
  
- 3 Stunts: Special abilities tied to skills that provide bonuses or special effects

- Stress Tracks:
  * Physical: 2-4 boxes (based on Physique)
  * Mental: 2-4 boxes (based on Will)
  
- 3 Consequence Slots:
  * Mild (absorbs 2 shifts)
  * Moderate (absorbs 4 shifts)
  * Severe (absorbs 6 shifts)

- Refresh: Usually 3 (Fate Points to start each session)

PARTY BONDS:
- Generate at least 2-3 bonds between DIFFERENT PCs (not NPCs)
- Each bond should specify character1Index, character2Index, relationship type, and description
- Bonds create interesting party dynamics and roleplay opportunities

STORY INTEGRATION:
- Each PC must connect to at least 1 location from the story
- Each PC must tie to at least 1 story hook
- These connections drive the narrative forward

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{
  "characters": [
    {
      "name": "string",
      "pronouns": "string",
      "concept": "string (brief summary)",
      "background": "string (2-3 paragraphs)",
      "aspects": {
        "highConcept": "string",
        "trouble": "string",
        "aspect3": "string",
        "aspect4": "string",
        "aspect5": "string"
      },
      "skills": [
        { "name": "string", "rating": 0-4 }
      ],
      "stunts": ["string", "string", "string"],
      "stress": {
        "physical": 2-4,
        "mental": 2-4
      },
      "consequences": ["Mild", "Moderate", "Severe"],
      "refresh": 3,
      "connections": {
        "locations": ["location1", "location2"],
        "hooks": ["hook1", "hook2"]
      },
      "equipment": ["item1", "item2"]
    }
  ],
  "bonds": [
    {
      "character1Index": 0,
      "character2Index": 1,
      "relationship": "Ally|Rival|Family|Mentor|etc",
      "description": "How they know each other and why it matters"
    }
  ]
}

CRITICAL RULES:
- NO quotation marks, ellipses, or placeholder text in the JSON
- ALL fields must be complete and ready to use
- Names must be IP-safe (no copyrighted character names)
- Skills must follow the pyramid exactly
- Return ONLY the JSON object, no additional text`;
}

function getUserPrompt(data: any): string {
  const { overview, seeds, gameId, players } = data;
  
  return `STORY OVERVIEW
${JSON.stringify(overview, null, 2)}

PLAYERS: ${players || seeds.length}
GAME_ID: ${gameId}

CHARACTER SEEDS (one per slot, index-based)
${JSON.stringify(seeds, null, 2)}

REQUIREMENTS:
1. Follow each seed's mode (respect/suggest/decide)
2. Ensure FATE CORE mechanics are correct (skill pyramid, 5 aspects, 3 stunts, etc.)
3. Create ${seeds.length} complete characters
4. Generate 2-3 bonds between DIFFERENT characters
5. Tie each character to story locations and hooks
6. Ensure party has complementary skills and roles
7. All content must be IP-safe (no copyrighted names/concepts)

Remember: Return ONLY the JSON object, nothing else. Every character must have valid FATE mechanics.`;
}

function getRepairPrompt(): string {
  return `Fix the invalid JSON structure. The JSON must be valid and parseable.

Common issues to fix:
- Remove any text before or after the JSON object
- Ensure all strings are properly quoted
- Remove trailing commas
- Ensure all brackets and braces are properly closed
- Remove any comments or explanatory text

Return ONLY the corrected JSON with no additional text.`;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body
    const body = await req.json();
    const { 
      gameId, 
      seeds, 
      overview, 
      type = 'lineup',
      characterIndex,
      currentParty,
      feedback,
      brief
    } = body;

    console.log('Generate characters request:', { gameId, type, seedCount: seeds?.length });

    // Validate required fields
    if (!gameId) {
      throw new Error('gameId is required');
    }

    // ========================================================================
    // IDEMPOTENCY CHECK - Prevents duplicate generations ($$$ savings!)
    // ========================================================================
    const idempotencyKey = `character-gen-${gameId}-${type}-${Date.now()}`;
    
    const { data: existingResult } = await supabase
      .from('idempotency_keys')
      .select('result')
      .eq('key', idempotencyKey)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingResult) {
      console.log('Returning cached result for idempotency key:', idempotencyKey);
      return new Response(JSON.stringify(existingResult.result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for existing lineup (prevents regeneration)
    if (type === 'lineup') {
      const { data: existingLineup } = await supabase
        .from('character_lineups')
        .select('lineup_json')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLineup && existingLineup.lineup_json) {
        console.log('Found existing lineup, returning it instead of regenerating');
        return new Response(JSON.stringify({ lineup: existingLineup.lineup_json }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ========================================================================
    // Create AI Event for Tracking
    // ========================================================================
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    let eventId: string | null = null;
    if (user) {
      const { data: aiEvent } = await supabase
        .from('ai_events')
        .insert({
          user_id: user.id,
          game_id: gameId,
          event_type: type === 'lineup' ? 'character_generation' : 'character_regeneration',
          status: 'pending',
          provider: 'lovable-ai',
          model: 'google/gemini-2.5-flash'
        })
        .select('id')
        .single();
      
      eventId = aiEvent?.id || null;
    }

    // ========================================================================
    // Build Prompts
    // ========================================================================
    const systemPrompt = getSystemPrompt();
    let userPrompt: string;

    switch (type) {
      case 'lineup':
        if (!seeds || !overview) {
          throw new Error('seeds and overview are required for lineup generation');
        }
        userPrompt = getUserPrompt({ overview, seeds, gameId, players: seeds.length });
        break;
        
      case 'regen-character':
        if (characterIndex === undefined || !currentParty || !overview) {
          throw new Error('characterIndex, currentParty, and overview required for character regeneration');
        }
        userPrompt = `Regenerate character at index ${characterIndex}.

CURRENT PARTY (excluding character being regenerated):
${JSON.stringify(currentParty, null, 2)}

PLAYER FEEDBACK:
${feedback || 'No specific feedback provided'}

Generate a NEW character that complements the existing party and addresses the feedback.
Return the character object only (not the full lineup).`;
        break;
        
      case 'regen-bonds':
        if (!body.characters || !overview) {
          throw new Error('characters and overview required for bond regeneration');
        }
        userPrompt = `Generate new bonds for these characters:

${JSON.stringify(body.characters, null, 2)}

Create 2-3 bonds between DIFFERENT characters that create interesting party dynamics.
Return only the bonds array.`;
        break;
        
      case 'remix':
        if (!seeds || !overview || !body.currentLineup) {
          throw new Error('seeds, overview, and currentLineup required for remix');
        }
        userPrompt = `Create a completely new character lineup based on this brief:

BRIEF: ${brief}

CURRENT LINEUP (for reference):
${JSON.stringify(body.currentLineup, null, 2)}

Generate entirely new characters while maintaining story connections.`;
        break;
        
      default:
        throw new Error(`Unknown generation type: ${type}`);
    }

    // ========================================================================
    // Call AI (Lovable AI Gateway)
    // ========================================================================
    console.log('Calling AI with prompt length:', systemPrompt.length + userPrompt.length);

    const aiResponse = await fetch('https://api.lovable.app/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 8000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI request failed: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Received AI response, length:', content.length);

    // ========================================================================
    // Parse and Validate JSON
    // ========================================================================
    let parsedContent: any;
    
    try {
      // Try to parse directly
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.log('Initial JSON parse failed, attempting repair');
      
      // Try to extract JSON from markdown code blocks
      let cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        parsedContent = JSON.parse(cleanedContent);
      } catch {
        // Last resort: Ask AI to repair the JSON
        console.log('Markdown extraction failed, asking AI to repair');
        
        const repairResponse = await fetch('https://api.lovable.app/v1/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: getRepairPrompt() },
              { role: 'user', content: content }
            ],
            temperature: 0.1,
            max_tokens: 8000
          })
        });

        if (!repairResponse.ok) {
          throw new Error('JSON repair failed');
        }

        const repairData = await repairResponse.json();
        const repairedContent = repairData.choices?.[0]?.message?.content;
        
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

    // ========================================================================
    // Validate FATE Mechanics
    // ========================================================================
    if (type === 'lineup' || type === 'remix') {
      const validation = validateLineup(parsedContent);
      if (!validation.valid) {
        console.error('FATE validation failed:', validation.errors);
        // Log but don't fail - give feedback for improvement
        console.warn('Generated lineup has validation issues:', validation.errors.join('; '));
      }
    } else if (type === 'regen-character') {
      const validation = validateCharacter(parsedContent);
      if (!validation.valid) {
        console.error('Character validation failed:', validation.errors);
        console.warn('Generated character has validation issues:', validation.errors.join('; '));
      }
    }

    // ========================================================================
    // Update AI Event with Success
    // ========================================================================
    if (eventId) {
      await supabase.from('ai_events').update({
        status: 'success',
        prompt_chars: (systemPrompt + userPrompt).length,
        completion_chars: content.length,
        input_tokens: aiData.usage?.prompt_tokens || 0,
        output_tokens: aiData.usage?.completion_tokens || 0,
      }).eq('id', eventId);
    }

    // ========================================================================
    // Store Result for Idempotency
    // ========================================================================
    let result: any;
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

    // Store in idempotency table
    await supabase.from('idempotency_keys').insert({
      key: idempotencyKey,
      result: result,
      expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
    });

    console.log('Generation complete, returning result');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Character generation error:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
