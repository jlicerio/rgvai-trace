import { useCallback, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Search } from 'lucide-react';
import type { NodeData } from '../../types/pipeline';
import NodeTooltip from './NodeTooltip';

interface SearchConfig {
  label: string;
  query: string;
  count: number;
  results: { title: string; url: string; snippet: string }[];
  error: string;
}

export default function SearchNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setNodes } = useReactFlow();
  const config = (data.config || {}) as SearchConfig;
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

  const handleSearch = useCallback(async () => {
    if (!config.query?.trim()) return;
    setLoading(true);
    updateField('error', '');
    updateField('results', []);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: config.query, count: config.count || 5 }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Search failed (${res.status}): ${text}`);
      }
      const data = await res.json();
      updateField('results', data.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateField('error', msg);
    } finally {
      setLoading(false);
    }
  }, [config.query, config.count, updateField]);

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
          <Search size={16} className="text-gray-300" />
          <span className="text-gray-100 font-semibold text-sm tracking-wide uppercase">
            {config.label || 'Search'}
          </span>
        </div>
        <NodeTooltip nodeType="search" compact />
      </div>

      <div className="space-y-3">
        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Label</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            value={config.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Search"
          />
        </div>

        {/* Query */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Search Query</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none"
            rows={2}
            value={config.query}
            onChange={(e) => updateField('query', e.target.value)}
            placeholder="What do you want to search for?"
          />
        </div>

        {/* Result count */}
        <div>
          <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Results</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            value={config.count || 5}
            onChange={(e) => updateField('count', parseInt(e.target.value))}
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={loading || !config.query?.trim()}
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
              Searching…
            </>
          ) : (
            <>
              <Search size={14} />
              Search Web
            </>
          )}
        </button>

        {/* Error */}
        {config.error && (
          <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5">
            {config.error}
          </div>
        )}

        {/* Results */}
        {config.results && config.results.length > 0 && (
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">
              Results ({config.results.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {config.results.map((r, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-2">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-200 text-xs font-semibold hover:text-gray-100 block truncate"
                  >
                    {r.title}
                  </a>
                  <p className="text-gray-500 text-[10px] truncate font-mono">{r.url}</p>
                  {r.snippet && (
                    <p className="text-gray-400 text-[11px] mt-0.5 line-clamp-2">{r.snippet}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3 !border-2 !border-gray-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3 !border-2 !border-gray-800" />
    </div>
  );
}
