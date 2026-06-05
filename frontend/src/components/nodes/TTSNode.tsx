import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Volume2, Cpu } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import { useWebGPUTTS } from '../../hooks/useWebGPUTTS';
import NodeTooltip from './NodeTooltip';

interface TTSConfig {
  label: string;
  text: string;
  enabled: boolean;
  engine: 'webspeech' | 'webgpu';
  // Web Speech API settings
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  // WebGPU Neural TTS settings
  speakerId: number;
}

interface VoiceOption {
  name: string;
  lang: string;
  default: boolean;
}

export default function TTSNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as TTSConfig;
  const engine = config.engine || 'webspeech';

  // Web Speech API state
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [wsPlaying, setWsPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // WebGPU TTS state
  const {
    status: gpuStatus,
    progress: gpuProgress,
    progressNum: gpuProgressNum,
    error: gpuError,
    loadModel,
    generate: gpuGenerate,
    unload: gpuUnload,
    speakerEmbeddings,
  } = useWebGPUTTS();

  // Initialize Web Speech API
  useEffect(() => {
    if (engine !== 'webspeech') return;
    synthRef.current = window.speechSynthesis;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(
        v.map((v) => ({
          name: v.name,
          lang: v.lang,
          default: v.default,
        }))
      );
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [engine]);

  const updateField = useCallback(
    (field: string, value: unknown) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          return { ...n, data: { ...n.data, config: { ...n.data.config, [field]: value } } };
        })
      );
    },
    [id, setNodes]
  );

  // --- Web Speech playback ---
  const speakWebSpeech = useCallback(() => {
    if (!synthRef.current || !config.text) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(config.text);
    utterance.rate = config.rate || 1.0;
    utterance.pitch = config.pitch || 1.0;
    utterance.volume = config.volume || 1.0;
    if (config.voice && config.voice !== 'default') {
      const found = synthRef.current.getVoices().find((v) => v.name === config.voice);
      if (found) utterance.voice = found;
    }
    setWsPlaying(true);
    utterance.onend = () => setWsPlaying(false);
    utterance.onerror = () => setWsPlaying(false);
    synthRef.current.speak(utterance);
  }, [config.text, config.voice, config.rate, config.pitch, config.volume]);

  const stopWebSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setWsPlaying(false);
    }
  }, []);

  // --- WebGPU playback ---
  const speakWebGPU = useCallback(async () => {
    if (!config.text) return;
    await gpuGenerate(config.text, config.speakerId ?? 0);
  }, [config.text, config.speakerId, gpuGenerate]);

  // --- Unified speak ---
  const handleSpeak = useCallback(() => {
    if (engine === 'webspeech') {
      speakWebSpeech();
    } else {
      speakWebGPU();
    }
  }, [engine, speakWebSpeech, speakWebGPU]);

  const isPlaying = engine === 'webspeech' ? wsPlaying : gpuStatus === 'generating';

  const textPreview = config.text
    ? config.text.length > 80
      ? config.text.slice(0, 80) + '…'
      : config.text
    : '';

  return (
    <div
      className={
        'bg-gray-800 border-2 rounded-xl p-4 min-w-[320px] shadow-xl transition-shadow ' +
        (selected ? 'border-gray-300 shadow-2xl' : 'border-gray-600')
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {engine === 'webgpu' ? <Cpu size={16} className="text-gray-300" /> : <Volume2 size={16} className="text-gray-300" />}
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'TTS'}
          </span>
        </div>
        <NodeTooltip nodeType="tts" compact />
      </div>

      <div className="space-y-3">
        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Label</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label || ''}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="TTS Output"
          />
        </div>

        {/* Engine selector */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Engine</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            value={engine}
            onChange={(e) => updateField('engine', e.target.value)}
          >
            <option value="webspeech">Web Speech API (OS voices)</option>
            <option value="webgpu">WebGPU Neural (SpeechT5)</option>
          </select>
        </div>

        {/* Text input */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Text to Speak</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none font-mono"
            rows={3}
            value={config.text || ''}
            onChange={(e) => updateField('text', e.target.value)}
            placeholder="Type text to speak, or connect to a Chat node…"
          />
        </div>

        {/* Preview */}
        {textPreview && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
            <p className="text-gray-400 text-xs leading-relaxed">{textPreview}</p>
          </div>
        )}

        {/* ----- Web Speech controls ----- */}
        {engine === 'webspeech' && (
          <>
            {/* Voice selector */}
            <div>
              <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Voice</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
                value={config.voice || 'default'}
                onChange={(e) => updateField('voice', e.target.value)}
              >
                <option value="default">System Default</option>
                {voices.slice(0, 20).map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
                {voices.length > 20 && (
                  <option disabled>+ {voices.length - 20} more voices</option>
                )}
              </select>
            </div>

            {/* Rate slider */}
            <div>
              <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
                Rate: {config.rate?.toFixed(1) || '1.0'}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={config.rate ?? 1.0}
                onChange={(e) => updateField('rate', parseFloat(e.target.value))}
                className="w-full accent-gray-400"
              />
              <div className="flex justify-between text-gray-600 text-[10px] mt-0.5">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>

            {/* Pitch slider */}
            <div>
              <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
                Pitch: {config.pitch?.toFixed(1) || '1.0'}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={config.pitch ?? 1.0}
                onChange={(e) => updateField('pitch', parseFloat(e.target.value))}
                className="w-full accent-gray-400"
              />
              <div className="flex justify-between text-gray-600 text-[10px] mt-0.5">
                <span>Low</span>
                <span>Normal</span>
                <span>High</span>
              </div>
            </div>

            {/* Auto-speak toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.autoSpeak !== false ? 'bg-gray-500' : 'bg-gray-700'
                }`}
                onClick={() => updateField('autoSpeak', config.autoSpeak === false)}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config.autoSpeak !== false ? 'translate-x-[18px]' : 'translate-x-[2px]'
                  }`}
                />
              </div>
              <span className="text-gray-400 text-xs">Auto-speak</span>
            </label>
          </>
        )}

        {/* ----- WebGPU controls ----- */}
        {engine === 'webgpu' && (
          <>
            {/* Model loading */}
            {gpuStatus === 'idle' || gpuStatus === 'error' ? (
              <button
                onClick={loadModel}
                className="w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
              >
                ⬇ Load SpeechT5 (~300 MB)
              </button>
            ) : gpuStatus === 'downloading' ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{gpuProgress}</span>
                  <span className="text-gray-500">{gpuProgressNum}%</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gray-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(gpuProgressNum, 2)}%` }}
                  />
                </div>
              </div>
            ) : gpuStatus === 'ready' ? (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-400 text-xs">SpeechT5 Ready</span>
                <button
                  onClick={gpuUnload}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-300"
                >
                  ✕ Unload
                </button>
              </div>
            ) : null}

            {/* GPU error */}
            {gpuStatus === 'error' && (
              <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5 break-all max-h-20 overflow-y-auto">
                {gpuError}
              </div>
            )}

            {/* Speaker selector (only when model is ready) */}
            {gpuStatus === 'ready' && (
              <div>
                <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Speaker (experimental)</label>
                <select
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
                  value={config.speakerId ?? 0}
                  onChange={(e) => updateField('speakerId', parseInt(e.target.value))}
                >
                  <option value={0}>Default Voice</option>
                </select>
                <p className="text-gray-600 text-[10px] mt-1">Additional speakers load separately (future)</p>
              </div>
            )}
          </>
        )}

        {/* Play button */}
        <div className="flex gap-2">
          <button
            onClick={isPlaying ? (engine === 'webspeech' ? stopWebSpeech : undefined) : handleSpeak}
            disabled={!config.text || (engine === 'webgpu' && gpuStatus !== 'ready')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isPlaying
                ? 'bg-red-800 text-red-200 hover:bg-red-700'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPlaying ? '■ Stop' : '▶ Speak'}
          </button>
        </div>

        {/* Enabled toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.enabled !== false ? 'bg-gray-500' : 'bg-gray-700'
            }`}
            onClick={() => updateField('enabled', config.enabled === false)}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                config.enabled !== false ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </div>
          <span className="text-gray-400 text-xs">Enabled</span>
        </label>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3 !border-2 !border-gray-800" />
    </div>
  );
}
