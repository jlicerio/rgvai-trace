import { useCallback, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Cpu } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import { useLocalModel, AVAILABLE_MODELS } from '../../hooks/useLocalModel';
import NodeTooltip from './NodeTooltip';

interface LocalModelConfig {
  label: string;
  modelId: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  prompt: string;
}

export default function LocalModelNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as LocalModelConfig;
  const { status, progress, progressNum, error, loadModel, generate, resetChat, unload } = useLocalModel();
  const [response, setResponse] = useState('');
  const [generating, setGenerating] = useState(false);

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

  const handleLoad = async () => {
    if (!config.modelId) return;
    setResponse('');
    await loadModel(config.modelId);
  };

  const handleGenerate = async () => {
    if (!config.prompt || status !== 'ready') return;
    setGenerating(true);
    setResponse('');
    try {
      const result = await generate(
        config.systemPrompt || '',
        config.prompt,
        config.temperature ?? 0.7,
        config.maxTokens ?? 2048,
      );
      setResponse(result);
    } catch (e: any) {
      setResponse(`Error: ${e.message}`);
    }
    setGenerating(false);
  };

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === config.modelId);

  return (
    <div
      className={
        'bg-gray-800 border-2 rounded-xl p-4 min-w-[340px] shadow-xl transition-shadow ' +
        (selected ? 'border-gray-300 shadow-2xl' : 'border-gray-600')
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'Local Model'}
          </span>
        </div>
        <NodeTooltip nodeType="local_model" compact />
      </div>

      <div className="space-y-3">
        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Label</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label || ''}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Local LLM"
          />
        </div>

        {/* Model selector */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Model</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            value={config.modelId || ''}
            onChange={(e) => updateField('modelId', e.target.value)}
          >
            <option value="">— Select a model —</option>
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.size})
              </option>
            ))}
          </select>
          {selectedModel && (
            <p className="text-gray-600 text-[10px] mt-1">{selectedModel.description}</p>
          )}
        </div>

        {/* Load / Unload buttons */}
        <div className="flex gap-2">
          {status === 'unloaded' || status === 'error' ? (
            <button
              onClick={handleLoad}
              disabled={!config.modelId}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {!config.modelId ? 'Select a model first' : '⬇ Load Model (WebGPU)'}
            </button>
          ) : (
            <button
              onClick={unload}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
            >
              ✕ Unload
            </button>
          )}
        </div>

        {/* Download progress */}
        {status === 'downloading' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">{progress}</span>
              <span className="text-gray-500">{progressNum}%</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gray-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(progressNum, 2)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5 break-all max-h-20 overflow-y-auto">
            {error}
          </div>
        )}

        {/* Status indicator */}
        {status === 'ready' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-400">Ready — {config.modelId?.split('-').slice(0, 2).join(' ')}</span>
          </div>
        )}

        {/* System prompt */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">System Prompt</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none font-mono"
            rows={2}
            value={config.systemPrompt || ''}
            onChange={(e) => updateField('systemPrompt', e.target.value)}
            placeholder="You are a helpful AI assistant."
          />
        </div>

        {/* Prompt input */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Your Prompt</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none font-mono"
            rows={2}
            value={config.prompt || ''}
            onChange={(e) => updateField('prompt', e.target.value)}
            placeholder="Type your message here…"
          />
        </div>

        {/* Generation settings */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
              Temp: {(config.temperature ?? 0.7).toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.1"
              value={config.temperature ?? 0.7}
              onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
              className="w-full accent-gray-400"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
              Max Tokens
            </label>
            <input
              type="number"
              min={64}
              max={8192}
              step={64}
              value={config.maxTokens ?? 2048}
              onChange={(e) => updateField('maxTokens', parseInt(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            />
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!config.prompt || status !== 'ready' || generating}
          className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? 'Generating…' : status !== 'ready' ? 'Load a model first' : '▶ Generate'}
        </button>

        {/* Response */}
        {response && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Response</label>
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 max-h-40 overflow-y-auto">
              <p className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
          </div>
        )}

        {/* Reset chat button */}
        {status === 'ready' && (
          <button
            onClick={resetChat}
            className="w-full px-3 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
          >
            ↺ Reset Conversation
          </button>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3 !border-2 !border-gray-800" />
    </div>
  );
}
