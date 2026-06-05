import { useCallback, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { HardDrive } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

interface MemoryConfig {
  label: string;
  action: 'store' | 'retrieve' | 'list' | 'delete';
  namespace: string;
  key: string;
  value: string;
  storedKey: string;
  retrievedValue: string;
  entries: { key: string; value: string }[];
  error: string;
}

export default function MemoryNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as MemoryConfig;
  const [loading, setLoading] = useState(false);

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

  const handleExecute = useCallback(async () => {
    setLoading(true);
    updateField('error', '');
    updateField('storedKey', '');
    updateField('retrievedValue', '');
    updateField('entries', []);
    try {
      const body: Record<string, unknown> = {
        action: config.action,
        namespace: config.namespace || 'default',
      };
      if (config.action === 'store' || config.action === 'retrieve' || config.action === 'delete') {
        body.key = config.key;
      }
      if (config.action === 'store') {
        body.value = config.value;
      }

      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Memory operation failed (${res.status}): ${text}`);
      }
      const data = await res.json();

      switch (config.action) {
        case 'store':
          updateField('storedKey', data.key || config.key);
          break;
        case 'retrieve':
          updateField('retrievedValue', data.value || JSON.stringify(data));
          break;
        case 'list':
          updateField('entries', data.entries || data.results || []);
          break;
        case 'delete':
          updateField('storedKey', `Deleted: ${config.key}`);
          break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateField('error', msg);
    } finally {
      setLoading(false);
    }
  }, [config.action, config.namespace, config.key, config.value, updateField]);

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
          <HardDrive size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'Memory'}
          </span>
        </div>
        <NodeTooltip nodeType="memory" compact />
      </div>

      <div className="space-y-3">
        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Label</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Memory"
          />
        </div>

        {/* Action */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Action</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            value={config.action || 'store'}
            onChange={(e) => updateField('action', e.target.value)}
          >
            <option value="store">Store</option>
            <option value="retrieve">Retrieve</option>
            <option value="list">List</option>
            <option value="delete">Delete</option>
          </select>
        </div>

        {/* Namespace */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Namespace</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors font-mono"
            value={config.namespace}
            onChange={(e) => updateField('namespace', e.target.value)}
            placeholder="default"
          />
        </div>

        {/* Key input — for store, retrieve, delete */}
        {(config.action === 'store' || config.action === 'retrieve' || config.action === 'delete') && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Key</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors font-mono"
              value={config.key}
              onChange={(e) => updateField('key', e.target.value)}
              placeholder="my-key"
            />
          </div>
        )}

        {/* Value text area — for store */}
        {config.action === 'store' && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Value</label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none"
              rows={3}
              value={config.value}
              onChange={(e) => updateField('value', e.target.value)}
              placeholder="Value to store"
            />
          </div>
        )}

        {/* Execute button */}
        <button
          onClick={handleExecute}
          disabled={loading}
          className={
            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (loading
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600 active:bg-gray-500')
          }
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Executing…
            </>
          ) : (
            <>
              <HardDrive size={14} />
              Execute
            </>
          )}
        </button>

        {/* Error */}
        {config.error && (
          <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5">
            {config.error}
          </div>
        )}

        {/* Stored confirmation */}
        {config.storedKey && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Result</label>
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
              <p className="text-gray-300 text-xs">
                {config.action === 'delete'
                  ? `Deleted key: ${config.storedKey}`
                  : `Stored value under key: ${config.storedKey}`}
              </p>
            </div>
          </div>
        )}

        {/* Retrieved value */}
        {config.retrievedValue && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Retrieved Value</label>
            <pre className="text-gray-300 text-xs font-mono bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
              {config.retrievedValue}
            </pre>
          </div>
        )}

        {/* List entries */}
        {config.entries && config.entries.length > 0 && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
              Entries ({config.entries.length})
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {config.entries.map((entry, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span className="text-gray-300 text-xs font-mono truncate">{entry.key}</span>
                  <span className="text-gray-500 text-[10px] ml-2 truncate">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3 !border-2 !border-gray-800" />
    </div>
  );
}
