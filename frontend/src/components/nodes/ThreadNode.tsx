import { useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { GitBranch } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

interface ThreadBranch {
  id: string;
  label: string;
}

interface ThreadConfig {
  label: string;
  mode: 'parallel' | 'sequential';
  branches: ThreadBranch[];
  error: string;
}

let branchCounter = 0;

export default function ThreadNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as ThreadConfig;

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

  const addBranch = useCallback(() => {
    branchCounter += 1;
    const newBranch: ThreadBranch = {
      id: `branch-${branchCounter}`,
      label: `Branch ${branchCounter}`,
    };
    const branches = [...(config.branches || []), newBranch];
    updateField('branches', branches);
  }, [config.branches, updateField]);

  const removeBranch = useCallback(
    (branchId: string) => {
      const branches = (config.branches || []).filter((b) => b.id !== branchId);
      updateField('branches', branches);
    },
    [config.branches, updateField]
  );

  const updateBranchLabel = useCallback(
    (branchId: string, label: string) => {
      const branches = (config.branches || []).map((b) =>
        b.id === branchId ? { ...b, label } : b
      );
      updateField('branches', branches);
    },
    [config.branches, updateField]
  );

  const modeDescription =
    config.mode === 'parallel'
      ? 'All downstream nodes execute concurrently.'
      : 'Downstream nodes execute one by one.';

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
          <GitBranch size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'Thread'}
          </span>
        </div>
        <NodeTooltip nodeType="thread" compact />
      </div>

      <div className="space-y-3">
        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Label</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Thread"
          />
        </div>

        {/* Mode selector */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Mode</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            value={config.mode || 'parallel'}
            onChange={(e) => updateField('mode', e.target.value)}
          >
            <option value="parallel">Parallel</option>
            <option value="sequential">Sequential</option>
          </select>
        </div>

        {/* Mode description */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2">
          <p className="text-gray-400 text-xs leading-relaxed">{modeDescription}</p>
        </div>

        {/* Branches */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-gray-500 text-xs font-medium uppercase tracking-wider">Branches</label>
            <button
              onClick={addBranch}
              className="text-gray-400 hover:text-gray-200 bg-gray-700 hover:bg-gray-600 rounded-lg px-2 py-0.5 text-xs font-medium transition-colors"
            >
              + Add
            </button>
          </div>
          {(!config.branches || config.branches.length === 0) ? (
            <p className="text-gray-600 text-xs py-1">No branches yet. Click "+ Add" to create one.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {config.branches.map((branch) => (
                <div key={branch.id} className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5">
                  <GitBranch size={12} className="text-gray-500 shrink-0" />
                  <input
                    className="flex-1 bg-transparent border-none text-gray-100 text-xs font-mono placeholder-gray-600 focus:outline-none p-0"
                    value={branch.label}
                    onChange={(e) => updateBranchLabel(branch.id, e.target.value)}
                    placeholder="Branch name"
                  />
                  <button
                    onClick={() => removeBranch(branch.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                    title="Remove branch"
                  >
                    <span className="text-xs font-bold">×</span>
                  </button>
                </div>
              ))}
            </div>
          )}
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
