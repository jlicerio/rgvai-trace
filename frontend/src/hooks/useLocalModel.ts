import { useCallback, useRef, useState } from 'react';

export type ModelStatus = 'unloaded' | 'downloading' | 'ready' | 'error';

export interface WebLLMModel {
  id: string;
  name: string;
  size: string;
  description: string;
}

export const AVAILABLE_MODELS: WebLLMModel[] = [
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 0.5B', size: '~400 MB', description: 'Tiny, fast, decent English/Chinese' },
  { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', name: 'TinyLlama 1.1B', size: '~700 MB', description: 'Small but capable, good for testing' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B', size: '~1.5 GB', description: 'Google small model, strong reasoning' },
  { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', name: 'Phi-3 Mini 3.8B', size: '~2.5 GB', description: 'Microsoft small model, good English' },
];

export function useLocalModel() {
  const [status, setStatus] = useState<ModelStatus>('unloaded');
  const [progress, setProgress] = useState<string>('');
  const [progressNum, setProgressNum] = useState(0);
  const [error, setError] = useState<string>('');
  const engineRef = useRef<any>(null);
  const [modelId, setModelIdState] = useState<string>('');

  const loadModel = useCallback(async (model: string) => {
    setStatus('downloading');
    setProgress('Initializing…');
    setProgressNum(0);
    setError('');
    setModelIdState(model);

    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      engineRef.current = await CreateMLCEngine(model, {
        initProgressCallback: (report: any) => {
          setProgress(report.text || 'Loading…');
          if (report.progress !== undefined) {
            setProgressNum(Math.round(report.progress * 100));
          }
        },
      });
      setStatus('ready');
      setProgress('Ready');
      setProgressNum(100);
    } catch (e: any) {
      setStatus('error');
      setError(e.message || String(e));
      setProgress('Failed to load model');
    }
  }, []);

  const generate = useCallback(async (
    systemPrompt: string,
    userMessage: string,
    temperature: number = 0.7,
    maxTokens: number = 2048,
  ): Promise<string> => {
    if (!engineRef.current || status !== 'ready') {
      throw new Error('Model not loaded');
    }

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userMessage });

    const reply = await engineRef.current.chat.completions.create({
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return reply.choices[0]?.message?.content || '';
  }, [status]);

  const resetChat = useCallback(() => {
    if (engineRef.current) {
      try {
        engineRef.current.resetChat();
      } catch {
        // ignore
      }
    }
  }, []);

  const unload = useCallback(() => {
    engineRef.current = null;
    setStatus('unloaded');
    setProgress('');
    setProgressNum(0);
    setModelIdState('');
  }, []);

  return {
    status,
    progress,
    progressNum,
    error,
    modelId,
    loadModel,
    generate,
    resetChat,
    unload,
  };
}
