// Custom hook for streaming AI generation with SSE
// Handles real-time thoughts and content streaming from edge functions

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StreamChunk {
  type: 'thought' | 'content' | 'usage' | 'done';
  text?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    thoughtsTokenCount: number;
  };
}

interface GenerationResult {
  success: boolean;
  data: any;
  metadata: {
    tokensUsed: number;
    promptTokens: number;
    completionTokens: number;
    thoughtsTokenCount: number;
    thoughts: string;
    latency: number;
  };
}

export function useStreamingGeneration() {
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [contentChunks, setContentChunks] = useState<string[]>([]);
  const [usage, setUsage] = useState<StreamChunk['usage'] | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'streaming' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startStream = useCallback(async (
    endpoint: string,
    body: any,
    options: {
      timeout?: number;
      onThought?: (thought: string) => void;
      onComplete?: (result: GenerationResult) => void;
    } = {}
  ) => {
    const { timeout = 120000, onThought, onComplete } = options;

    // Reset state
    setStatus('connecting');
    setThoughts([]);
    setContentChunks([]);
    setUsage(null);
    setError(null);
    setResult(null);

    try {
      // Get auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      // Build SSE URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = new URL(`${supabaseUrl}/functions/v1/${endpoint}`);

      // Make initial POST to start stream
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      setStatus('streaming');

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        reader.cancel();
        setStatus('error');
        setError('Stream timeout after 2 minutes');
      }, timeout);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: StreamChunk = JSON.parse(line.slice(6));

                if (data.type === 'thought' && data.text) {
                  setThoughts(prev => [...prev, data.text!]);
                  if (onThought) {
                    onThought(data.text);
                  }
                } else if (data.type === 'content' && data.text) {
                  setContentChunks(prev => [...prev, data.text!]);

                  // Check if this is the final result
                  try {
                    const parsed = JSON.parse(data.text);
                    if (parsed.success && parsed.data) {
                      setResult(parsed as GenerationResult);
                      if (onComplete) {
                        onComplete(parsed as GenerationResult);
                      }
                    }
                  } catch {
                    // Not JSON, just a status message
                  }
                } else if (data.type === 'usage' && data.usage) {
                  setUsage(data.usage);
                } else if (data.type === 'done') {
                  setStatus('complete');
                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                  }
                  break;
                }
              } catch (parseError) {
                console.error('Error parsing SSE chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (status !== 'complete') {
        setStatus('complete');
      }

    } catch (err) {
      console.error('Streaming error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, []);

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('idle');
  }, []);

  return {
    thoughts,
    contentChunks,
    usage,
    status,
    error,
    result,
    startStream,
    cancel,
  };
}
