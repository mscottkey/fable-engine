import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type AIFeature = 
  | 'ip_sanitizer' 
  | 'phase1_story' 
  | 'characters' 
  | 'phase2_factions' 
  | 'phase3_nodes' 
  | 'phase4_arcs' 
  | 'phase5_resolutions' 
  | 'runtime_turn' 
  | 'qa_eval' 
  | 'other';

export type AIPhase = 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5' | 'runtime' | 'qa';

export type ResponseMode = 'json' | 'freeform';

export type AIStatus = 'success' | 'error';

interface LogAIEventParams {
  supabaseClient: SupabaseClient<Database>;
  user_id: string | null;
  game_id?: string | null;
  seed_id?: string | null;
  feature: AIFeature;
  phase: AIPhase;
  provider: string;
  model: string;
  response_mode: ResponseMode;
  cache_hit: boolean;
  retry_count: number;
  input_tokens: number;
  output_tokens: number;
  prompt_text: string;
  completion_text: string;
  latency_ms: number;
  http_status: number | null;
  error_code: string | null;
  status: AIStatus;
}

interface LogAIEventResult {
  id: string | null;
  cost_usd: number;
  pricing_id: string | null;
}

async function createHash(text: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + '\n' + text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function lookupPricing(
  supabaseClient: SupabaseClient<Database>,
  provider: string,
  model: string
): Promise<{ pricing_id: string | null; input_rate: number; output_rate: number }> {
  try {
    const { data, error } = await supabaseClient
      .from('model_pricing')
      .select('id, input_rate, output_rate')
      .eq('provider', provider)
      .eq('model', model)
      .lte('effective_from', new Date().toISOString())
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Failed to lookup pricing:', error);
      return { pricing_id: null, input_rate: 0, output_rate: 0 };
    }

    if (!data) {
      console.warn(`No pricing found for ${provider}/${model}`);
      return { pricing_id: null, input_rate: 0, output_rate: 0 };
    }

    return {
      pricing_id: data.id,
      input_rate: Number(data.input_rate),
      output_rate: Number(data.output_rate)
    };
  } catch (error) {
    console.warn('Error looking up pricing:', error);
    return { pricing_id: null, input_rate: 0, output_rate: 0 };
  }
}

function calculateCost(
  input_tokens: number,
  output_tokens: number,
  input_rate: number,
  output_rate: number
): number {
  const cost = (input_tokens / 1000 * input_rate) + (output_tokens / 1000 * output_rate);
  return Math.round(cost * 1000000) / 1000000; // Round to 6 decimals
}

export async function logAIEvent(params: LogAIEventParams): Promise<LogAIEventResult> {
  const {
    supabaseClient,
    user_id,
    game_id = null,
    seed_id = null,
    feature,
    phase,
    provider,
    model,
    response_mode,
    cache_hit,
    retry_count,
    input_tokens,
    output_tokens,
    prompt_text,
    completion_text,
    latency_ms,
    http_status,
    error_code,
    status
  } = params;

  try {
    // Get salt from environment (this module is used in edge functions where process.env is available)
    const salt = import.meta.env?.VITE_AI_LOG_SALT || process.env?.AI_LOG_SALT;
    
    if (!salt) {
      if (typeof window === 'undefined') {
        throw new Error('AI_LOG_SALT environment variable is required');
      } else {
        console.warn('AI_LOG_SALT not configured, skipping logging');
        return { id: null, cost_usd: 0, pricing_id: null };
      }
    }

    // Create hashes
    const prompt_hash = await createHash(prompt_text, salt);
    const completion_hash = await createHash(completion_text, salt);

    // Calculate character counts
    const prompt_chars = prompt_text.length;
    const completion_chars = completion_text.length;

    // Lookup pricing
    const { pricing_id, input_rate, output_rate } = await lookupPricing(
      supabaseClient,
      provider,
      model
    );

    // Calculate cost
    const cost_usd = calculateCost(input_tokens, output_tokens, input_rate, output_rate);

    // Insert event
    const { data, error } = await supabaseClient
      .from('ai_events')
      .insert({
        user_id: user_id!,
        game_id,
        seed_id,
        feature,
        phase,
        provider,
        model,
        pricing_id,
        input_tokens,
        output_tokens,
        prompt_chars,
        completion_chars,
        prompt_hash,
        completion_hash,
        response_mode,
        cache_hit,
        retry_count,
        latency_ms,
        http_status,
        error_code,
        status,
        cost_usd
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to insert AI event:', error);
      return { id: null, cost_usd, pricing_id };
    }

    return { id: data.id, cost_usd, pricing_id };
  } catch (error) {
    console.warn('Error logging AI event:', error);
    return { id: null, cost_usd: 0, pricing_id: null };
  }
}