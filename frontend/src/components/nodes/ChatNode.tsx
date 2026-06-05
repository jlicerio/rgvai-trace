import { useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { MessageSquare } from 'lucide-react';
import type { NodeData, ChatConfig } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

export default function ChatNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = data.config as ChatConfig;

  const updateField = useCallback(
    (field: keyof ChatConfig, value: string | number) => {
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
          <MessageSquare size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'Chat'}
          </span>
        </div>
        <NodeTooltip nodeType="chat" compact />
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            Label
          </label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Chat Step"
          />
        </div>

        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            System Prompt
          </label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none font-mono"
            rows={3}
            value={config.systemPrompt}
            onChange={(e) => updateField('systemPrompt', e.target.value)}
            placeholder="You are a helpful assistant..."
          />
        </div>

        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            Temperature: {config.temperature.toFixed(1)}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs">0</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              className="flex-1 accent-gray-300 h-1.5 rounded-full appearance-none bg-gray-700 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-gray-300 [&::-webkit-slider-thumb]:rounded-full"
              value={config.temperature}
              onChange={(e) =>
                updateField('temperature', parseFloat(e.target.value))
              }
            />
            <span className="text-gray-600 text-xs">2</span>
          </div>
        </div>

        {/* Messages summary */}
        {config.messages && config.messages.length > 0 && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
              Messages ({config.messages.length})
            </label>
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 max-h-[80px] overflow-y-auto text-xs text-gray-400 font-mono space-y-1">
              {config.messages.map((msg, i) => (
                <div key={i} className="truncate">
                  <span className="text-gray-500 font-medium">
                    [{msg.role}]
                  </span>{' '}
                  {msg.content.length > 50
                    ? msg.content.slice(0, 50) + '…'
                    : msg.content}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800"
      />

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-300 !w-3 !h-3 !border-2 !border-gray-800"
      />
    </div>
  );
}
