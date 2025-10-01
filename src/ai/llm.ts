// File: src/ai/llm.ts
// LLM router for calling AI providers

interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlmOptions {
  provider: 'google';
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost?: number;
}

interface LlmResponse {
  content: string;
  provider: string;
  model: string;
  usage?: LlmUsage;
}

export async function callLlm(options: LlmOptions): Promise<LlmResponse> {
  const { provider, model, messages, temperature, maxTokens, responseFormat } = options;

  if (provider !== 'google') {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Get Lovable API key from env or throw error
  const lovableApiKey = import.meta.env.VITE_LOVABLE_API_KEY;
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Call Lovable AI gateway
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: `google/${model}`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: temperature !== undefined ? temperature : undefined,
      max_tokens: maxTokens,
      response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in AI response');
  }

  // Clean up markdown code blocks if present
  let cleanContent = content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }
  cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/\n?```/g, '');

  const usage: LlmUsage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0,
  };

  return {
    content: cleanContent,
    provider,
    model,
    usage,
  };
}
