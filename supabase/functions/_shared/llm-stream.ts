// Streaming LLM API wrapper for edge functions
// Supports Server-Sent Events (SSE) for real-time thought streaming

import type { LlmMessage, LlmOptions } from './llm.ts';

export interface StreamCallbacks {
  onThought?: (thought: string) => void;
  onContent?: (chunk: string) => void;
  onUsage?: (usage: any) => void;
  onError?: (error: Error) => void;
}

interface StreamChunk {
  type: 'thought' | 'content' | 'usage' | 'done';
  text?: string;
  usage?: any;
}

/**
 * Call Google AI (Gemini) API with streaming support
 * Streams thoughts and content as they are generated
 */
export async function callLlmStream(
  options: LlmOptions,
  callbacks: StreamCallbacks
): Promise<void> {
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

  // Convert messages to Gemini format (same as non-streaming)
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
    },
    // Enable thinking mode for Gemini 2.5 models
    thinkingConfig: {
      thinkingBudget: -1,  // Dynamic thinking budget
      includeThoughts: true
    }
  };

  if (responseFormat === 'json') {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  // Call Gemini streaming API with alt=sse
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  console.log('Starting streaming request to Gemini...');

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

  // Parse SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let thoughtBuffer = '';
  let contentBuffer = '';
  let isInThinking = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Extract parts from the chunk
            const parts = data.candidates?.[0]?.content?.parts || [];

            for (const part of parts) {
              const text = part.text || '';

              // Detect if this is thinking content
              // Gemini thinking models may have specific markers or separate parts
              if (isThinkingPart(part) || data.usageMetadata?.thoughtsTokenCount > 0) {
                thoughtBuffer += text;
                if (callbacks.onThought) {
                  callbacks.onThought(text);
                }
              } else {
                contentBuffer += text;
                if (callbacks.onContent) {
                  callbacks.onContent(text);
                }
              }
            }

            // Extract usage metadata if present
            if (data.usageMetadata && callbacks.onUsage) {
              callbacks.onUsage({
                promptTokens: data.usageMetadata.promptTokenCount || 0,
                completionTokens: data.usageMetadata.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata.totalTokenCount || 0,
                thoughtsTokenCount: data.usageMetadata.thoughtsTokenCount || 0,
              });
            }
          } catch (parseError) {
            console.error('Error parsing SSE chunk:', parseError);
            // Continue processing other chunks
          }
        }
      }
    }

    console.log('Streaming complete');
    console.log('Total thoughts length:', thoughtBuffer.length);
    console.log('Total content length:', contentBuffer.length);

  } catch (error) {
    console.error('Streaming error:', error);
    if (callbacks.onError) {
      callbacks.onError(error as Error);
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Determine if a part contains thinking/reasoning content
 * Gemini thinking mode marks thought parts with thought: true flag
 */
function isThinkingPart(part: any): boolean {
  // Check Gemini's official thought flag
  if (part.thought === true) {
    return true;
  }

  // Fallback: Check if part has other metadata indicating it's thinking
  if (part.thoughtMetadata || part.isThinking) {
    return true;
  }

  // Check text content for thinking markers
  const text = part.text || '';
  const thinkingMarkers = [
    'Let me think',
    'I should consider',
    'Analyzing',
    'Reasoning:',
    'Thought:',
    'Considering',
  ];

  return thinkingMarkers.some(marker => text.includes(marker));
}

/**
 * Helper to create SSE response stream for edge functions
 */
export function createSSEStream(
  generator: (send: (data: StreamChunk) => void) => Promise<void>
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (data: StreamChunk) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        send({ type: 'content', text: 'Starting generation...' });
        await generator(send);
        send({ type: 'done' });
      } catch (error) {
        console.error('Stream error:', error);
        send({
          type: 'content',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      } finally {
        controller.close();
      }
    }
  });
}
