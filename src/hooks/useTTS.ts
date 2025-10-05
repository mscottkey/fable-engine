import { useState, useEffect, useCallback } from 'react';

interface TTSVoice {
  voice: SpeechSynthesisVoice;
  label: string;
  quality: 'premium' | 'standard';
}

export function useTTS() {
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();

      // Categorize voices by quality
      const categorized: TTSVoice[] = availableVoices.map(voice => {
        const name = voice.name.toLowerCase();
        const lang = voice.lang.toLowerCase();

        // Premium voices (browser-enhanced TTS)
        const isPremium =
          // Chrome/Edge premium voices
          name.includes('google') ||
          name.includes('enhanced') ||
          name.includes('premium') ||
          // Safari premium voices
          name.includes('samantha') ||
          name.includes('alex') ||
          name.includes('daniel') ||
          name.includes('karen') ||
          name.includes('moira') ||
          name.includes('rishi') ||
          name.includes('tessa') ||
          // Edge Neural voices
          name.includes('neural') ||
          name.includes('aria') ||
          name.includes('guy') ||
          name.includes('jenny');

        return {
          voice,
          label: `${voice.name}${isPremium ? ' ✨' : ''} (${voice.lang})`,
          quality: isPremium ? 'premium' : 'standard'
        };
      });

      // Sort: Premium first, then English, then alphabetical
      categorized.sort((a, b) => {
        if (a.quality !== b.quality) {
          return a.quality === 'premium' ? -1 : 1;
        }
        const aIsEnglish = a.voice.lang.startsWith('en');
        const bIsEnglish = b.voice.lang.startsWith('en');
        if (aIsEnglish !== bIsEnglish) {
          return aIsEnglish ? -1 : 1;
        }
        return a.voice.name.localeCompare(b.voice.name);
      });

      setVoices(categorized);

      // Auto-select best English premium voice, or first available
      const bestVoice =
        categorized.find(v => v.quality === 'premium' && v.voice.lang.startsWith('en'))?.voice ||
        categorized.find(v => v.voice.lang.startsWith('en'))?.voice ||
        categorized[0]?.voice;

      if (bestVoice) {
        setSelectedVoice(bestVoice);
      }
    };

    loadVoices();

    // Handle voice loading (Chrome/Edge load async)
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string, options?: { rate?: number; pitch?: number; volume?: number }) => {
    if (!isSupported || !selectedVoice) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
  }, [isSupported]);

  return {
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    isSpeaking,
    speak,
    stop,
    pause,
    resume
  };
}
