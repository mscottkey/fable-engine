// LLM API wrapper for edge functions
// Calls Google AI (Gemini) API directly with server-side API key

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
  enableThinking?: boolean;
  thinkingBudget?: number;
}

export interface LlmResponse {
  content: string;
  thoughts?: string;  // AI's reasoning/thinking process
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    thoughtsTokenCount?: number;
  };
}

/**
 * Call Google AI (Gemini) API directly
 * Uses server-side GOOGLE_AI_API_KEY from environment
 */
export async function callLlm(options: LlmOptions): Promise<LlmResponse> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not configured in edge function secrets');
  }

  const {
    model,
    messages,
    temperature = 0.7,
    maxTokens = 4096,
    responseFormat = 'text',
    enableThinking = false,
    thinkingBudget = -1,
  } = options;

  // Convert messages to Gemini format
  // Gemini uses "contents" with "parts" instead of "messages"
  // System messages are merged into the first user message
  const systemMessages = messages.filter(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  let contents;
  if (systemMessages.length > 0 && otherMessages.length > 0) {
    const systemText = systemMessages.map(m => m.content).join('\n\n');
    contents = [
      {
        role: 'user',
        parts: [{ text: `${systemText}\n\n${otherMessages[0].content}` }]
      },
      ...otherMessages.slice(1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    ];
  } else {
    contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  // Build request payload
  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: maxTokens,
  };

  if (enableThinking) {
    generationConfig.thinkingConfig = {
      thinkingBudget,
    };
  }

  if (responseFormat === 'json') {
    generationConfig.responseMimeType = 'application/json';
  }

  const payload: any = {
    contents,
    generationConfig,
  };

  // Call Google AI API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Log full response for debugging empty content issues
  console.log('=== FULL GEMINI RESPONSE ===');
  console.log(JSON.stringify(data, null, 2));
  console.log('=== END FULL RESPONSE ===');

  // Extract content and thoughts from Gemini response
  const parts = data.candidates?.[0]?.content?.parts || [];

  console.log('Total parts received:', parts.length);
  console.log('Parts structure:', JSON.stringify(parts.map((p: any) => ({
    hasText: !!p.text,
    textLength: p.text?.length || 0,
    thought: p.thought,
    hasThoughtFlag: 'thought' in p
  }))));

  // Gemini thinking mode marks thought parts with thought: true flag
  let content = '';
  let thoughts = undefined;

  // Separate thought parts from content parts
  const thoughtParts = parts.filter((p: any) => p.thought === true);
  const contentParts = parts.filter((p: any) => !p.thought);

  console.log('Thought parts count:', thoughtParts.length);
  console.log('Content parts count:', contentParts.length);

  // Combine thought parts
  if (thoughtParts.length > 0) {
    thoughts = thoughtParts.map((p: any) => p.text).join('\n\n');
  }

  // Combine content parts
  content = contentParts.map((p: any) => p.text || '').join('');

  console.log('Extracted content length:', content.length);
  console.log('Content preview:', content.substring(0, 200));
  console.log('Thoughts extracted:', !!thoughts);
  if (thoughts) {
    console.log('Thoughts preview:', thoughts.substring(0, 200));
  }

  // Clean up markdown code blocks from JSON responses
  if (responseFormat === 'json' && content.includes('```')) {
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  }

  // Extract usage stats (Gemini format)
  const usage = {
    promptTokens: data.usageMetadata?.promptTokenCount || 0,
    completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: data.usageMetadata?.totalTokenCount || 0,
    thoughtsTokenCount: data.usageMetadata?.thoughtsTokenCount || 0,
  };

  console.log('Usage stats:', usage);

  return { content, thoughts, usage };
}
