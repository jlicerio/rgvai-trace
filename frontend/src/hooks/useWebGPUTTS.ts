import { useCallback, useRef, useState } from 'react';

export type TTSStatus = 'idle' | 'downloading' | 'ready' | 'generating' | 'error';

interface SpeakerEmbedding {
  name: string;
  speakerId: number;
}

// SpeechT5 has 6 default speaker embeddings
const SPEAKER_EMBEDDINGS: SpeakerEmbedding[] = [
  { name: 'Default (Female)', speakerId: 0 },
  { name: 'Speaker 1 (Female)', speakerId: 1 },
  { name: 'Speaker 2 (Male)', speakerId: 2 },
  { name: 'Speaker 3 (Female)', speakerId: 3 },
  { name: 'Speaker 4 (Male)', speakerId: 4 },
  { name: 'Speaker 5 (Female)', speakerId: 5 },
];

export function useWebGPUTTS() {
  const [status, setStatus] = useState<TTSStatus>('idle');
  const [progress, setProgress] = useState<string>('');
  const [progressNum, setProgressNum] = useState(0);
  const [error, setError] = useState<string>('');
  const pipelineRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const loadModel = useCallback(async () => {
    setStatus('downloading');
    setProgress('Loading SpeechT5 model…');
    setProgressNum(0);
    setError('');

    try {
      // Dynamic import so the heavy WASM only loads on demand
      const { pipeline } = await import('@xenova/transformers');
      
      // Configure to use WebGPU if available
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
  }, []);

  const generate = useCallback(async (
    text: string,
    speakerId: number = 0,
  ): Promise<void> => {
    if (!pipelineRef.current || status !== 'ready') {
      throw new Error('TTS model not loaded');
    }

    setStatus('generating');
    setProgress('Generating speech…');

    try {
      // Create a speaker embedding tensor
      const speakerEmbeddings = pipelineRef.current.config?.speaker_embeddings;
      let speakerEmb: any = null;
      if (speakerEmbeddings && speakerEmbeddings[speakerId]) {
        speakerEmb = speakerEmbeddings[speakerId];
      }

      const result = await pipelineRef.current(text, {
        speaker_embeddings: speakerEmb,
      });

      // result is a { audio: Float32Array, sampling_rate: number }
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      // Convert float32 audio to playable buffer
      const audioBuffer = ctx.createBuffer(1, result.audio.length, result.sampling_rate);
      audioBuffer.getChannelData(0).set(result.audio);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(0);

      // Wait for playback to finish
      await new Promise((resolve) => {
        source.onended = resolve;
      });

      setStatus('ready');
      setProgress('Speech complete');
    } catch (e: any) {
      setStatus('error');
      setError(e.message || String(e));
    }
  }, [status]);

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
    speakerEmbeddings: SPEAKER_EMBEDDINGS,
  };
}
