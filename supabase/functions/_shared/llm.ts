// LLM API wrapper for edge functions
// Calls Lovable AI Gateway with server-side API key

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmOptions {
  provider: 'google';
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface LlmResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call LLM via Lovable AI Gateway
 * Uses server-side LOVABLE_API_KEY from environment
 */
export async function callLlm(options: LlmOptions): Promise<LlmResponse> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY not configured in edge function secrets');
  }

  const {
    provider,
    model,
    messages,
    temperature = 0.7,
    maxTokens = 4096,
    responseFormat = 'text',
  } = options;

  // Build request payload
  const payload = {
    model: `${provider}/${model}`,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature,
    max_tokens: maxTokens,
    ...(responseFormat === 'json' && { response_format: { type: 'json_object' } }),
  };

  // Call Lovable AI Gateway
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Gateway error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract content
  let content = data.choices?.[0]?.message?.content || '';

  // Clean up markdown code blocks from JSON responses
  if (responseFormat === 'json' && content.includes('```')) {
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  }

  // Extract usage stats
  const usage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0,
  };

  return { content, usage };
}
