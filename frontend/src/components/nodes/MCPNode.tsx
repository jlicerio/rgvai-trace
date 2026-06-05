import { useCallback, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Wrench } from 'lucide-react';
import type { NodeData, MCPConfig, MCPTool } from '../../types/pipeline';
import { MCP_REGISTRY } from '../../constants/mcpRegistry';
import NodeTooltip from './NodeTooltip';

export default function MCPNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = data.config as MCPConfig;
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const updateField = useCallback(
    (field: keyof MCPConfig, value: unknown) => {
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

  const handleDiscover = useCallback(async () => {
    if (!config.serverUrl.trim()) {
      setDiscoverError('Enter a server URL first');
      return;
    }
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const res = await fetch('/api/mcp/list-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: config.serverUrl }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Discovery failed (${res.status}): ${text}`);
      }
      const body = await res.json();
      const tools: MCPTool[] = body.tools || [];
      updateField('discoveredTools', tools);
      if (tools.length > 0) {
        updateField('selectedTool', tools[0].name);
      } else {
        updateField('selectedTool', '');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDiscoverError(msg);
    } finally {
      setDiscovering(false);
    }
  }, [config.serverUrl, updateField]);

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
          <Wrench size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'MCP'}
          </span>
        </div>
        <NodeTooltip nodeType="mcp" compact />
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
            placeholder="MCP Tool"
          />
        </div>

        {/* Registry selector */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            Server Preset
          </label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            value={config.serverUrl}
            onChange={(e) => {
              const entry = MCP_REGISTRY.find(r => r.defaultUrl === e.target.value);
              if (entry) {
                updateField('serverUrl', entry.defaultUrl);
                updateField('label', entry.name);
              }
            }}
          >
            <option value="">Select a preset...</option>
            {MCP_REGISTRY.filter(r => r.category !== 'custom').map((entry) => (
              <option key={entry.name} value={entry.defaultUrl}>
                {entry.name}
              </option>
            ))}
            <option value="__custom__">Custom URL...</option>
          </select>
        </div>

        {/* Server URL (visible for custom or when a preset is selected) */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
            Server URL
          </label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors font-mono"
            value={config.serverUrl}
            onChange={(e) => updateField('serverUrl', e.target.value)}
            placeholder="http://localhost:8080/mcp"
          />
        </div>

        {/* Selected preset info */}
        {(() => {
          const activeEntry = MCP_REGISTRY.find(r => r.defaultUrl === config.serverUrl);
          return activeEntry && activeEntry.category !== 'custom' ? (
            <p className="text-gray-500 text-[10px] italic leading-relaxed">
              {activeEntry.description}
            </p>
          ) : null;
        })()}

        {/* Discover Tools button */}
        <button
          onClick={handleDiscover}
          disabled={discovering}
          className={
            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (discovering
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600 active:bg-gray-500')
          }
        >
          {discovering ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-gray-400"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Discovering…
            </>
          ) : (
            <>
              <Wrench size={14} />
              Discover Tools
            </>
          )}
        </button>

        {discoverError && (
          <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5">
            {discoverError}
          </div>
        )}

        {/* Tool selector */}
        {config.discoveredTools && config.discoveredTools.length > 0 && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
              Select Tool
            </label>
            <select
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
              value={config.selectedTool}
              onChange={(e) => updateField('selectedTool', e.target.value)}
            >
              {config.discoveredTools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </select>
            {config.discoveredTools.map(
              (tool) =>
                tool.name === config.selectedTool &&
                tool.description && (
                  <p
                    key={tool.name + '-desc'}
                    className="text-gray-500 text-xs mt-1 italic"
                  >
                    {tool.description}
                  </p>
                )
            )}
          </div>
        )}

        {(!config.discoveredTools || config.discoveredTools.length === 0) &&
          !discovering && (
            <p className="text-gray-600 text-xs italic">
              Click "Discover Tools" to fetch available tools from the server
            </p>
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
