import { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FileJson, Plus, Upload, RefreshCw } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

interface RegistryTool {
  name: string;
  description: string;
  endpoint: string;
  method: string;
  write_allowed: boolean;
  parameters: { type: string; properties: Record<string, any>; required: string[] };
}

interface RegistryMeta {
  name: string;
  description: string;
}

interface RegistryConfig {
  label: string;
  meta: RegistryMeta;
  tools: RegistryTool[];
  fileDropped: boolean;
  error: string;
}

export default function RegistryNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as RegistryConfig;
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

  // Load registry from backend on mount
  useEffect(() => {
    if (!config.fileDropped) {
      loadFromBackend();
    }
  }, []);

  const loadFromBackend = useCallback(async () => {
    setLoading(true);
    updateField('error', '');
    try {
      const res = await fetch('/api/registry');
      if (!res.ok) throw new Error(`Failed to load registry (${res.status})`);
      const data = await res.json();
      updateField('meta', data.meta || { name: 'Registry', description: '' });
      updateField('tools', data.tools || []);
      updateField('fileDropped', true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateField('error', msg);
    } finally {
      setLoading(false);
    }
  }, [updateField]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith('.json')) {
      updateField('error', 'Drop a .json file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.tools || !Array.isArray(data.tools)) {
          updateField('error', 'JSON must contain a "tools" array');
          return;
        }
        updateField('meta', data.meta || { name: file.name, description: '' });
        updateField('tools', data.tools);
        updateField('fileDropped', true);
        updateField('error', '');
      } catch {
        updateField('error', 'Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }, [updateField]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const tools = config.tools || [];
  const meta = config.meta || { name: 'Registry', description: '' };

  return (
    <div
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
      className={
        'bg-gray-800 border-2 rounded-xl p-4 min-w-[300px] shadow-xl transition-shadow ' +
        (selected ? 'border-gray-300 shadow-2xl' : 'border-gray-600 border-dashed')
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FileJson size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {meta.name || 'Tool Registry'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadFromBackend}
            disabled={loading}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Reload from backend"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <NodeTooltip nodeType="registry" compact />
        </div>
      </div>

      <div className="space-y-3">
        {meta.description && (
          <p className="text-gray-500 text-xs italic">{meta.description}</p>
        )}

        {!config.fileDropped && !loading && (
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
            <Upload size={24} className="mx-auto mb-2 text-gray-600" />
            <p className="text-gray-500 text-xs mb-1">Drop a tools.json file here</p>
            <p className="text-gray-700 text-[10px]">or click Refresh to load from backend</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs">Loading registry...</span>
          </div>
        )}

        {/* Error */}
        {config.error && (
          <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5">
            {config.error}
          </div>
        )}

        {/* Tools list */}
        {tools.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                Tools ({tools.length})
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {tools.map((tool, i) => (
                <div
                  key={tool.name}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200 text-xs font-semibold">{tool.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      tool.write_allowed
                        ? 'bg-amber-900/30 text-amber-400 border border-amber-700/50'
                        : 'bg-gray-800 text-gray-500'
                    }`}>
                      {tool.write_allowed ? 'RW' : 'RO'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[10px] mt-0.5 line-clamp-1">{tool.description}</p>
                  <p className="text-gray-700 text-[9px] font-mono mt-0.5">{tool.method} {tool.endpoint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!config.fileDropped && tools.length === 0 && !loading && (
          <p className="text-gray-600 text-xs italic text-center py-2">
            Drop a JSON file or load from backend
          </p>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3 !border-2 !border-gray-800" />
    </div>
  );
}
