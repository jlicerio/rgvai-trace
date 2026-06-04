import { useCallback, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Globe } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

interface BrowserConfig {
  label: string;
  url: string;
  action: 'fetch' | 'text';
  renderJs: boolean;
  result: string;
  error: string;
}

export default function BrowserNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as BrowserConfig;
  const [loading, setLoading] = useState(false);

  const updateField = useCallback(
    (field: string, value: unknown) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          return {
            ...n,
            data: { ...n.data, config: { ...n.data.config, [field]: value } },
          };
        })
      );
    },
    [id, setNodes]
  );

  const handleFetch = useCallback(async () => {
    if (!config.url?.trim()) return;
    setLoading(true);
    updateField('error', '');
    updateField('result', '');
    try {
      const res = await fetch('/api/browser/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: config.url, render_js: config.renderJs }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Fetch failed (${res.status}): ${text}`);
      }
      const data = await res.json();
      const content = data.content || data.title || JSON.stringify(data);
      updateField('result', content.slice(0, 5000));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateField('error', msg);
    } finally {
      setLoading(false);
    }
  }, [config.url, config.renderJs, updateField]);

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
          <Globe size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'Browser'}
          </span>
        </div>
        <NodeTooltip nodeType="browser" compact />
      </div>

      <div className="space-y-3">
        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Label</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Browser"
          />
        </div>

        {/* URL */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">URL</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors font-mono"
            value={config.url}
            onChange={(e) => updateField('url', e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        {/* JS Render toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.renderJs}
            onChange={(e) => updateField('renderJs', e.target.checked)}
            className="rounded border-gray-600 bg-gray-900 text-gray-300 focus:ring-gray-500"
          />
          <span className="text-gray-400 text-xs">Render JavaScript (slower, needs Playwright)</span>
        </label>

        {/* Fetch button */}
        <button
          onClick={handleFetch}
          disabled={loading || !config.url?.trim()}
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
              Fetching…
            </>
          ) : (
            <>
              <Globe size={14} />
              Fetch Page
            </>
          )}
        </button>

        {/* Error */}
        {config.error && (
          <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5">
            {config.error}
          </div>
        )}

        {/* Result */}
        {config.result && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Result</label>
            <pre className="text-gray-300 text-xs font-mono bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
              {config.result}
            </pre>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3 !border-2 !border-gray-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3 !border-2 !border-gray-800" />
    </div>
  );
}
