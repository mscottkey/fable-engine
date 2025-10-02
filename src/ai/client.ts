// Client-side AI module - Direct Google AI API calls
// Used for real-time gameplay operations (narration, intent detection, etc.)

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call Google AI (Gemini) API directly from the client
 * Uses GOOGLE_AI_API_KEY from environment
 */
export async function callGoogleAI(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_GOOGLE_AI_API_KEY not configured in environment');
  }

  const {
    model = 'gemini-2.0-flash-exp',
    temperature = 0.7,
    maxTokens = 4096,
    responseFormat = 'text',
  } = options;

  // Convert messages to Gemini format
  // Gemini uses "contents" with "parts" instead of "messages"
  const contents = messages.map(msg => ({
    role: msg.role === 'system' ? 'user' : msg.role, // Gemini doesn't have system role, use user
    parts: [{ text: msg.content }]
  }));

  // Merge system messages into first user message if present
  let finalContents = contents;
  const systemMessages = messages.filter(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  if (systemMessages.length > 0 && otherMessages.length > 0) {
    const systemText = systemMessages.map(m => m.content).join('\n\n');
    finalContents = [
      {
        role: 'user',
        parts: [{ text: `${systemText}\n\n${otherMessages[0].content}` }]
      },
      ...otherMessages.slice(1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    ];
  }

  const payload: any = {
    contents: finalContents,
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

/**
 * Stream responses from Google AI (for real-time narration)
 * Returns an async generator that yields text chunks
 */
export async function* streamGoogleAI(
  messages: AIMessage[],
  options: AIOptions = {}
): AsyncGenerator<string, void, unknown> {
  const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_GOOGLE_AI_API_KEY not configured in environment');
  }

  const {
    model = 'gemini-2.0-flash-exp',
    temperature = 0.7,
    maxTokens = 4096,
  } = options;

  // Convert messages to Gemini format (same as callGoogleAI)
  const contents = messages.map(msg => ({
    role: msg.role === 'system' ? 'user' : msg.role,
    parts: [{ text: msg.content }]
  }));

  const payload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    }
  };

  // Call streaming endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

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

  // Parse Server-Sent Events
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          yield text;
        }
      }
    }
  }
}
