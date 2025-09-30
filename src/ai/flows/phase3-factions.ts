// File: src/ai/flows/phase3-factions.ts
import Handlebars from 'handlebars';
import { callLlm } from '../llm';
import { getPrompt, getSchemaVersion } from '../prompts';
import { Phase3OutputSchema, type Phase3Output, type Faction, ProjectClockSchema, RelationshipSchema } from '../schemas';
import { logAIEvent } from '@/lib/ai-usage-logger';
import { createClient } from '@/integrations/supabase/client';

// Register Handlebars helper for JSON stringification
Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));

interface Phase3Context {
  overview: any;
  lineup: any;
}

interface Phase3Options {
  userId: string;
  gameId: string;
  seedId: string;
  context: Phase3Context;
  type?: 'initial' | 'regen' | 'remix';
  targetId?: string; // for regen: faction ID, clock ID, or 'relations'
  feedback?: string;
  remixBrief?: string;
  preserveNouns?: boolean;
  currentData?: Phase3Output; // for regen/remix
}

const MAX_TOKENS = {
  initial: 1600,
  regen: 1200,
  remix: 1600,
};

export async function generatePhase3Factions(options: Phase3Options): Promise<{
  success: boolean;
  data?: Phase3Output | Partial<Phase3Output>;
  error?: string;
  metadata?: {
    tokensUsed: number;
    cost: number;
    latency: number;
    provider: string;
    model: string;
  };
}> {
  const { userId, gameId, seedId, context, type = 'initial', feedback, remixBrief, currentData } = options;
  const supabase = createClient();
  
  const startTime = Date.now();

  try {
    // Select prompts based on type
    let systemPromptId: string;
    let userPromptId: string;
    let templateData: any;
    let maxTokens = MAX_TOKENS[type];

    if (type === 'initial') {
      systemPromptId = 'phase3/system@v1';
      userPromptId = 'phase3/user@v1';
      templateData = {
        overview: context.overview,
        lineup: context.lineup,
      };
    } else if (type === 'regen') {
      const { targetId } = options;
      if (!targetId || !currentData) {
        throw new Error('Regen requires targetId and currentData');
      }

      // Determine regen type
      if (targetId === 'relations') {
        systemPromptId = 'phase3/system@v1';
        userPromptId = 'phase3/regen/relations@v1';
        templateData = {
          overview: context.overview,
          factions: currentData.factions,
          feedback: feedback || 'No specific feedback',
        };
      } else if (targetId.startsWith('clock-')) {
        // Clock regen
        const [_, factionId, clockName] = targetId.split('-');
        const faction = currentData.factions?.find(f => f.id === factionId);
        const clock = faction?.projects.find(p => p.name === clockName);
        
        systemPromptId = 'phase3/system@v1';
        userPromptId = 'phase3/regen/clock@v1';
        templateData = {
          overview: context.overview,
          faction,
          currentClock: clock,
          feedback: feedback || 'No specific feedback',
        };
      } else {
        // Faction regen
        systemPromptId = 'phase3/system@v1';
        userPromptId = 'phase3/regen/faction@v1';
        const currentFactions = currentData.factions?.filter(f => f.id !== targetId) || [];
        templateData = {
          overview: context.overview,
          currentFactions,
          factionId: targetId,
          feedback: feedback || 'No specific feedback',
        };
      }
    } else {
      // remix
      systemPromptId = 'phase3/remix/system@v1';
      userPromptId = 'phase3/remix/user@v1';
      templateData = {
        overview: context.overview,
        lineup: context.lineup,
        currentFactions: currentData?.factions || [],
        brief: remixBrief || 'Create a fresh take on the faction landscape',
        preserveNouns: options.preserveNouns || false,
      };
    }

    // Load and render prompts
    const systemPromptTemplate = getPrompt(systemPromptId);
    const userPromptTemplate = getPrompt(userPromptId);
    
    const systemPrompt = Handlebars.compile(systemPromptTemplate)(templateData);
    const userPrompt = Handlebars.compile(userPromptTemplate)(templateData);

    // Call LLM
    const llmResponse = await callLlm({
      provider: 'google', // default to gemini-flash
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens,
      responseFormat: 'json',
    });

    const latency = Date.now() - startTime;

    // Parse response
    let parsedData: any;
    try {
      parsedData = JSON.parse(llmResponse.content);
    } catch (parseError) {
      // Attempt repair
      const repairPromptId = 'phase3/repair@v1';
      const repairTemplate = getPrompt(repairPromptId);
      const repairPrompt = Handlebars.compile(repairTemplate)({
        error: (parseError as Error).message,
      });

      const repairResponse = await callLlm({
        provider: 'google',
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: llmResponse.content },
          { role: 'user', content: repairPrompt },
        ],
        temperature: 0.5,
        maxTokens: maxTokens,
        responseFormat: 'json',
      });

      try {
        parsedData = JSON.parse(repairResponse.content);
      } catch {
        throw new Error('Failed to parse JSON even after repair attempt');
      }
    }

    // Validate against schema
    let validatedData: Phase3Output | any;
    
    if (type === 'regen') {
      // For regen, validate the specific part
      const { targetId } = options;
      if (targetId === 'relations') {
        validatedData = { relationships: parsedData.relationships };
        // Validate relationships
        parsedData.relationships.forEach((rel: any) => RelationshipSchema.parse(rel));
      } else if (targetId?.startsWith('clock-')) {
        validatedData = { clock: parsedData };
        ProjectClockSchema.parse(parsedData);
      } else {
        validatedData = { faction: parsedData };
        // Faction might be partial for regen
      }
    } else {
      validatedData = Phase3OutputSchema.parse(parsedData);
    }

    // Log to ai_events
    const phase = type === 'initial' ? 'phase3' : 
                  type === 'regen' ? `phase3:regen:${options.targetId?.split('-')[0] || 'faction'}` :
                  'phase3:remix';

    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase3_factions',
      phase,
      provider: llmResponse.provider || 'google',
      model: llmResponse.model || 'gemini-2.5-flash',
      prompt_template_id: systemPromptId,
      schema_version: getSchemaVersion('phase3'),
      input_tokens: llmResponse.usage?.promptTokens || 0,
      output_tokens: llmResponse.usage?.completionTokens || 0,
      prompt_text: systemPrompt + '\n\n' + userPrompt,
      completion_text: llmResponse.content,
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      latency_ms: latency,
      http_status: 200,
      status: 'success',
    });

    return {
      success: true,
      data: validatedData,
      metadata: {
        tokensUsed: (llmResponse.usage?.promptTokens || 0) + (llmResponse.usage?.completionTokens || 0),
        cost: llmResponse.usage?.totalCost || 0,
        latency,
        provider: llmResponse.provider || 'google',
        model: llmResponse.model || 'gemini-2.5-flash',
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    // Log error
    await logAIEvent({
      supabaseClient: supabase,
      user_id: userId,
      game_id: gameId,
      seed_id: seedId,
      feature: 'phase3_factions',
      phase: type === 'initial' ? 'phase3' : `phase3:${type}`,
      provider: 'google',
      model: 'gemini-2.5-flash',
      prompt_template_id: 'phase3/system@v1',
      schema_version: getSchemaVersion('phase3'),
      input_tokens: 0,
      output_tokens: 0,
      prompt_text: '',
      completion_text: '',
      response_mode: 'json',
      cache_hit: false,
      retry_count: 0,
      latency_ms: latency,
      http_status: 500,
      error_code: (error as Error).name,
      status: 'error',
    });

    return {
      success: false,
      error: (error as Error).message,
    };
  }
}