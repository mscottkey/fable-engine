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
  const payload: any = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    }
  };

  if (responseFormat === 'json') {
    payload.generationConfig.responseMimeType = 'application/json';
  }

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

  // Extract content from Gemini response
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Clean up markdown code blocks from JSON responses
  if (responseFormat === 'json' && content.includes('```')) {
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  }

  // Extract usage stats (Gemini format)
  const usage = {
    promptTokens: data.usageMetadata?.promptTokenCount || 0,
    completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: data.usageMetadata?.totalTokenCount || 0,
  };

  return { content, usage };
}
