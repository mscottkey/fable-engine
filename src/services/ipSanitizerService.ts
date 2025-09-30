import { supabase } from '@/integrations/supabase/client';
import type { CharacterLineup } from './characterService';

interface SanitizationResult {
  sanitizedContent: any;
  changes: Array<{
    field: string;
    original: string;
    sanitized: string;
    reason: string;
  }>;
}

// Sanitize character lineup for IP safety
export async function sanitizeCharacterLineup(lineup: CharacterLineup): Promise<{
  sanitizedLineup: CharacterLineup;
  changes: Array<{ field: string; original: string; sanitized: string; reason: string; }>;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('ip-sanitizer', {
      body: {
        content: JSON.stringify(lineup),
        context: 'character_lineup'
      }
    });

    if (error) throw error;

    const result = data as SanitizationResult;
    
    return {
      sanitizedLineup: typeof result.sanitizedContent === 'string' 
        ? JSON.parse(result.sanitizedContent) 
        : result.sanitizedContent,
      changes: result.changes || []
    };
  } catch (error) {
    console.error('IP sanitization failed:', error);
    // Return original content if sanitization fails
    return {
      sanitizedLineup: lineup,
      changes: []
    };
  }
}

// Simple client-side sanitization for basic IP issues
export function basicIPSanitization(text: string): string {
  // Remove common copyrighted names and terms
  const replacements: Record<string, string> = {
    // Generic fantasy replacements
    'middle-earth': 'ancient realm',
    'gondor': 'great kingdom',
    'rohan': 'horse lands',
    'hobbiton': 'peaceful village',
    
    // Sci-fi replacements
    'star wars': 'galactic conflict',
    'jedi': 'warrior monk',
    'sith': 'dark warrior',
    'empire': 'imperial force',
    
    // Modern replacements
    'new york': 'big city',
    'los angeles': 'coastal city',
    'london': 'old city',
    
    // Generic character name patterns
    'harry potter': 'young wizard',
    'luke skywalker': 'farm boy hero',
    'frodo baggins': 'unlikely hero',
  };

  let sanitized = text.toLowerCase();
  
  for (const [original, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(original, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }
  
  return sanitized;
}