import { Handle, Position, NodeProps } from 'reactflow';
import { Eye } from 'lucide-react';
import type { NodeData, ObserverConfig } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';
import A2UIVisualizer from '../A2UIVisualizer';

export default function ObserverNode({ data, selected }: NodeProps<NodeData>) {
  const config = data.config as ObserverConfig;

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
          <Eye size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'Observer'}
          </span>
        </div>
        <NodeTooltip nodeType="observer" compact />
      </div>

      {/* Captured entries */}
      {config.captured && config.captured.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {config.captured.map((entry, idx) => (
            <div
              key={`${entry.step}-${idx}`}
              className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">
                  Step {entry.step}
                </span>
                <span className="text-gray-600 font-mono text-[10px]">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* A2UI Visualization Layer */}
              <A2UIVisualizer entry={entry} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-gray-600">
          <Eye size={24} className="mb-2 opacity-50" />
          <p className="text-xs text-center">
            No captured data yet.
            <br />
            Run the pipeline to see results here.
          </p>
        </div>
      )}

      {/* Input handle (top) — no output, this is a terminal node */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800"
      />
    </div>
  );
}
