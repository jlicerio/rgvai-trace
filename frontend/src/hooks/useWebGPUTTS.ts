import { useCallback, useRef, useState } from 'react';

export type TTSStatus = 'idle' | 'downloading' | 'ready' | 'generating' | 'error';

export function useWebGPUTTS() {
  const [status, setStatus] = useState<TTSStatus>('idle');
  const [progress, setProgress] = useState<string>('');
  const [progressNum, setProgressNum] = useState(0);
  const [error, setError] = useState<string>('');
  const pipelineRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Defined first so loadModel can depend on it without TDZ issues.
  const ensureAudioContext = useCallback(async (): Promise<AudioContext> => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    // Browsers start AudioContext suspended — must resume on user gesture
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const loadModel = useCallback(async () => {
    setStatus('downloading');
    setProgress('Loading SpeechT5 model…');
    setProgressNum(0);
    setError('');

    // Pre-create AudioContext while user gesture is active, so generate()
    // doesn't have to create/resume it after an await.
    try {
      await ensureAudioContext();
    } catch {
      // AudioContext creation failure is non-fatal for model loading
    }

    try {
      const { pipeline } = await import('@xenova/transformers');

      pipelineRef.current = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
        quantized: true,
        progress_callback: (report: any) => {
          if (report.status === 'download') {
            const file = report.file || '';
            const loaded = report.loaded || 0;
            const total = report.total || 1;
            const pct = Math.round((loaded / total) * 100);
            setProgress(`Downloading ${file}…`);
            setProgressNum(pct);
          } else if (report.status === 'progress') {
            setProgress(`Processing…`);
          }
        },
      });

      setStatus('ready');
      setProgress('Model ready');
      setProgressNum(100);
    } catch (e: any) {
      setStatus('error');
      setError(e.message || String(e));
      setProgress('Failed to load TTS model');
    }
  }, [ensureAudioContext]);

  const generate = useCallback(async (
    text: string,
    _speakerId: number = 0,
  ): Promise<void> => {
    const pipe = pipelineRef.current;
    if (!pipe) {
      setError('TTS model not loaded. Click Load SpeechT5 first.');
      return;
    }

    setStatus('generating');
    setProgress('Generating speech…');
    setError('');

    try {
      // Resume AudioContext BEFORE awaiting model inference.
      // Chrome blocks AudioContext.resume() after an await — the user gesture
      // scope expires once control returns from the microtask queue.
      const ctx = await ensureAudioContext();

      // Generate audio — no speaker embeddings for now (uses model default)
      const result = await pipe(text);

      // result = { audio: Float32Array, sampling_rate: number }
      if (!result?.audio || !result?.sampling_rate) {
        throw new Error('TTS model returned empty audio');
      }

      const audioBuffer = ctx.createBuffer(1, result.audio.length, result.sampling_rate);
      audioBuffer.getChannelData(0).set(result.audio);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(0);

      setStatus('ready');
      setProgress('Speech complete');
    } catch (e: any) {
      setStatus('error');
      setError(e.message || String(e));
      setProgress('Generation failed');
    }
  }, [ensureAudioContext]);

  const unload = useCallback(() => {
    pipelineRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setStatus('idle');
    setProgress('');
    setProgressNum(0);
    setError('');
  }, []);

  return {
    status,
    progress,
    progressNum,
    error,
    loadModel,
    generate,
    unload,
    speakerEmbeddings: [
      { name: 'Default Voice', speakerId: 0 },
    ],
  };
}
