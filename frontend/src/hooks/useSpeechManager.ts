import { useCallback, useRef } from 'react';

/**
 * Singleton speech manager shared between App.tsx (auto-play)
 * and TTSNode.tsx (manual play).
 *
 * Only one speech instance runs at a time — starting a new one
 * cancels any in-progress speech.
 */
export function useSpeechManager() {
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const speak = useCallback((text: string, rate = 1.0, pitch = 1.0, voiceName?: string) => {
    if (!window.speechSynthesis) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (voiceName && voiceName !== 'default') {
      const found = window.speechSynthesis.getVoices().find((v) => v.name === voiceName);
      if (found) utterance.voice = found;
    }

    window.speechSynthesis.speak(utterance);
    return utterance;
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}
