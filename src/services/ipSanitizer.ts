import { supabase } from '@/integrations/supabase/client';

export interface SanitizationDetection {
  span: string;
  class: "ProtectedCharacter" | "FranchiseOrWorld" | "DistinctiveTerm" | "CreatorStyle";
  suggested_generic: string;
  confidence: number;
}

export interface SanitizationResult {
  sanitized_text: string;
  detections: SanitizationDetection[];
  had_ip: boolean;
}

export async function sanitizeUserPrompt(userText: string, genre?: string): Promise<SanitizationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('ip-sanitizer', {
      body: { userText, genre }
    });

    if (error) {
      console.error('IP sanitizer error:', error);
      // Fallback: return original text if sanitization fails
      return {
        sanitized_text: userText.trim(),
        detections: [],
        had_ip: false
      };
    }

    return data as SanitizationResult;
  } catch (error) {
    console.error('Failed to sanitize prompt:', error);
    // Fallback: return original text if sanitization fails
    return {
      sanitized_text: userText.trim(),
      detections: [],
      had_ip: false
    };
  }
}