import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Volume2 } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

interface TTSConfig {
  label: string;
  text: string;
  enabled: boolean;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
}

interface VoiceOption {
  name: string;
  lang: string;
  default: boolean;
}

export default function TTSNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as TTSConfig;
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [playing, setPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech synthesis and load voices
  useEffect(() => {
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
  }, []);

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

  const speak = useCallback(() => {
    if (!synthRef.current || !config.text) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(config.text);
    utterance.rate = config.rate || 1.0;
    utterance.pitch = config.pitch || 1.0;
    utterance.volume = config.volume || 1.0;

    // Find matching voice
    if (config.voice && config.voice !== 'default') {
      const found = synthRef.current.getVoices().find((v) => v.name === config.voice);
      if (found) utterance.voice = found;
    }

    setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    synthRef.current.speak(utterance);
  }, [config.text, config.voice, config.rate, config.pitch, config.volume]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setPlaying(false);
    }
  }, []);

  const textPreview = config.text
    ? config.text.length > 80
      ? config.text.slice(0, 80) + '…'
      : config.text
    : '';

  return (
    <div
      className={
        'bg-gray-800 border-2 rounded-xl p-4 min-w-[300px] shadow-xl transition-shadow ' +
        (selected ? 'border-gray-300 shadow-2xl' : 'border-gray-600')
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-gray-300" />
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

        {/* Text input (standalone mode) */}
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

        {/* Enabled + Auto-speak toggles */}
        <div className="flex items-center gap-4">
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
        </div>

        {/* Test/Stop button */}
        <div className="flex gap-2">
          <button
            onClick={playing ? stop : speak}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              playing
                ? 'bg-red-800 text-red-200 hover:bg-red-700'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {playing ? '■ Stop' : '▶ Test'}
          </button>
        </div>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3 !border-2 !border-gray-800" />
    </div>
  );
}
