import { useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Database } from 'lucide-react';
import type { NodeData, ProviderConfig } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

const PRESETS: { label: string; endpoint: string; model: string }[] = [
  { label: 'Custom', endpoint: '', model: '' },
  { label: 'opencode-go', endpoint: 'https://opencode.ai/zen/go/v1', model: 'deepseek-v4-flash' },
  { label: 'opencode-zen', endpoint: 'https://opencode.ai/zen/v1', model: 'deepseek-v4-flash-free' },
  { label: 'OpenAI', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { label: 'Anthropic', endpoint: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4' },
];

export default function ProviderNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = data.config as ProviderConfig;

  const updateField = useCallback(
    (field: keyof ProviderConfig, value: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          return {
            ...n,
            data: {
              ...n.data,
              config: { ...n.data.config, [field]: value },
            },
          };
        })
      );
    },
    [id, setNodes]
  );

  const activePreset = useMemo(() => {
    return PRESETS.find(
      (p) => p.endpoint === config.endpoint && p.model === config.model
    ) || PRESETS[0];
  }, [config.endpoint, config.model]);

  const handlePresetChange = useCallback(
    (presetLabel: string) => {
      const preset = PRESETS.find((p) => p.label === presetLabel);
      if (!preset) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          return {
            ...n,
            data: {
              ...n.data,
              config: {
                ...n.data.config,
                label: preset.label,
                endpoint: preset.endpoint,
                model: preset.model,
              },
            },
          };
        })
      );
    },
    [id, setNodes]
  );

  return (
    <div
      className={
        'bg-gray-800 border-2 rounded-xl p-4 min-w-[260px] shadow-xl transition-shadow ' +
        (selected ? 'border-gray-300 shadow-2xl' : 'border-gray-600')
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            Provider
          </span>
        </div>
        <NodeTooltip nodeType="provider" compact />
      </div>

      <div className="space-y-3">
        {/* Preset selector */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            Preset
          </label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            value={activePreset.label}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            Label
          </label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="My Provider"
          />
        </div>

        {/* Endpoint */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            Endpoint
          </label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors font-mono"
            value={config.endpoint}
            onChange={(e) => updateField('endpoint', e.target.value)}
            placeholder="https://api.openai.com/v1"
          />
        </div>

        {/* Model */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            Model
          </label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors font-mono"
            value={config.model}
            onChange={(e) => updateField('model', e.target.value)}
            placeholder="gpt-4o"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            API Key
          </label>
          <input
            type="password"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors font-mono"
            value={config.apiKey}
            onChange={(e) => updateField('apiKey', e.target.value)}
            placeholder="sk-..."
          />
        </div>
      </div>

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-3 !h-3 !border-2 !border-gray-800"
      />
    </div>
  );
}
