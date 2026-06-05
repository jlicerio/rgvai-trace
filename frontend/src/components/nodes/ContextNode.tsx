import { useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FileText } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

interface ContextConfig {
  label: string;
  content: string;
  enabled: boolean;
  position: 'prepend_system' | 'append_user';
  error: string;
}

export default function ContextNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as ContextConfig;

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

  const contentPreview = config.content
    ? config.content.length > 100
      ? config.content.slice(0, 100) + '…'
      : config.content
    : '';

  return (
    <div
      className={
        'bg-gray-800 border-2 rounded-xl p-4 min-w-[280px] shadow-xl transition-shadow ' +
        (selected ? 'border-gray-300 shadow-2xl' : 'border-gray-600')
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'Context'}
          </span>
        </div>
        <NodeTooltip nodeType="context" compact />
      </div>

      <div className="space-y-3">
        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Label</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Context"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Content</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none font-mono"
            rows={5}
            value={config.content}
            onChange={(e) => updateField('content', e.target.value)}
            placeholder="Paste or type context text here…"
          />
        </div>

        {/* Content preview */}
        {contentPreview && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Preview</label>
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
              <p className="text-gray-400 text-xs leading-relaxed">{contentPreview}</p>
              {config.content && config.content.length > 100 && (
                <p className="text-gray-600 text-[10px] mt-1">+{config.content.length - 100} more characters</p>
              )}
            </div>
          </div>
        )}

        {/* Enabled toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.enabled !== false ? 'bg-blue-600' : 'bg-gray-700'
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

        {/* Position */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Position</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            value={config.position || 'prepend_system'}
            onChange={(e) => updateField('position', e.target.value)}
          >
            <option value="prepend_system">Prepend to System Prompt</option>
            <option value="append_user">Append to User Message</option>
          </select>
        </div>

        {/* Error */}
        {config.error && (
          <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5">
            {config.error}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3 !border-2 !border-gray-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3 !border-2 !border-gray-800" />
    </div>
  );
}
