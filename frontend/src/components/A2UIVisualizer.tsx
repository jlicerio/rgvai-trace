import React from 'react';
import { Play, Sparkles, Search, Globe, Wrench, FileJson, CheckCircle } from 'lucide-react';
import type { CaptureEntry } from '../types/pipeline';

interface A2UIVisualizerProps {
  entry: any; // CaptureEntry or step result
}

export default function A2UIVisualizer({ entry }: A2UIVisualizerProps) {
  const nodeType = entry.nodeType || entry.type;

  // Custom visualizer cards depending on the node type
  switch (nodeType) {
    case 'provider':
      return (
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-700/50 rounded-lg p-3 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 opacity-10">
            <Play size={40} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-300 font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            LLM Connection Initialized
          </div>
          <div className="text-xs text-gray-300">
            Endpoint: <code className="text-blue-200 font-mono">{(entry.request as any)?.endpoint || 'sandbox'}</code>
          </div>
          <div className="text-xs text-gray-300">
            Model: <code className="text-blue-200 font-mono">{(entry.request as any)?.model || 'mock-gpt-4o'}</code>
          </div>
          <div className="text-[10px] text-gray-500 italic mt-1">
            Establishing the execution environment context...
          </div>
        </div>
      );

    case 'chat':
      return (
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/50 rounded-lg p-3 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Sparkles size={13} className="text-indigo-400 animate-spin-slow" />
              LLM Prompt Execution
            </span>
          </div>

          <div className="border border-indigo-950 bg-gray-950/60 rounded p-2 text-xs space-y-1.5">
            <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono">System Instructions</div>
            <div className="text-gray-400 truncate font-mono">
              {(entry.request as any)?.body?.messages?.find((m: any) => m.role === 'system')?.content || 'No system prompt specified.'}
            </div>
            <div className="h-px bg-gray-800 my-1"></div>
            <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono">User Query</div>
            <div className="text-gray-300 truncate font-mono">
              {(entry.request as any)?.body?.messages?.find((m: any) => m.role === 'user')?.content || 'No messages.'}
            </div>
          </div>

          <div className="flex justify-center py-1">
            <div className="flex items-center gap-1 bg-indigo-950 px-2 py-0.5 rounded text-[10px] text-indigo-200 border border-indigo-800 animate-pulse">
              <span>Thinking & Generating Token Stream</span>
              <span className="flex space-x-0.5">
                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
              </span>
            </div>
          </div>

          <div className="bg-gray-900 border border-indigo-900/40 rounded p-2 text-xs text-indigo-100 font-mono">
            <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold mb-1">Generated Output</div>
            <p className="whitespace-pre-wrap break-all line-clamp-3">
              {typeof entry.response === 'string'
                ? entry.response
                : entry.response?.choices?.[0]?.message?.content || JSON.stringify(entry.response)}
            </p>
          </div>
        </div>
      );

    case 'search':
      return (
        <div className="bg-gradient-to-r from-teal-900/40 to-emerald-900/40 border border-teal-700/50 rounded-lg p-3 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-teal-300 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Search size={13} className="text-teal-400" />
              Context Web Search
            </span>
          </div>

          <div className="text-xs text-gray-300">
            Query: <code className="text-teal-200 font-mono">"{(entry.request as any)?.query || 'mock search'}"</code>
          </div>

          <div className="flex items-center justify-center py-1">
            <div className="w-full bg-teal-950 border border-teal-800/60 rounded px-2 py-1 text-[11px] text-teal-200 space-y-1">
              <div className="flex items-center justify-between text-[9px] text-teal-400 font-semibold tracking-wider uppercase">
                <span>Retrieved Search Results</span>
                <span className="flex items-center gap-0.5"><CheckCircle size={10} /> Verified</span>
              </div>
              <div className="text-gray-400 truncate italic">
                {entry.response?.search_results?.[0]?.snippet || (entry.response as any)?.[0]?.snippet || 'Mock weather capsule data matched.'}
              </div>
            </div>
          </div>
        </div>
      );

    case 'mcp':
      return (
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-700/50 rounded-lg p-3 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-purple-300 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Wrench size={13} className="text-purple-400" />
              Model Context Protocol Tool Call
            </span>
          </div>

          <div className="text-xs text-gray-300">
            Tool Name: <code className="text-purple-200 font-mono bg-purple-950 px-1 rounded">{(entry.request as any)?.tool || 'mock_tool'}</code>
          </div>

          <div className="text-xs text-gray-300">
            Arguments: 
            <pre className="text-purple-200 font-mono text-[10px] mt-1 bg-gray-950/60 rounded p-1.5 truncate">
              {JSON.stringify((entry.request as any)?.arguments || {}, null, 2)}
            </pre>
          </div>

          <div className="bg-purple-950/50 border border-purple-900/40 rounded p-2 text-xs text-purple-100 font-mono">
            <div className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold mb-1">Execution Output</div>
            <pre className="text-[10px] truncate max-h-[80px] overflow-y-auto">
              {JSON.stringify(entry.response, null, 2)}
            </pre>
          </div>
        </div>
      );

    case 'browser':
      return (
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-700/50 rounded-lg p-3 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Globe size={13} className="text-amber-400" />
              Headless Browser Automation
            </span>
          </div>

          <div className="text-xs text-gray-300">
            Navigated: <code className="text-amber-200 font-mono">{(entry.request as any)?.url || 'https://sandbox.site'}</code>
          </div>

          <div className="bg-gray-950/60 rounded p-2 text-xs text-gray-400 space-y-1">
            <div className="text-[9px] text-amber-400 font-semibold tracking-wider uppercase">Scraped Text Extract</div>
            <div className="truncate italic">
              {entry.response?.scraped_content || entry.response?.result || 'Mock front page scraped data loaded.'}
            </div>
          </div>
        </div>
      );

    case 'registry':
      return (
        <div className="bg-gradient-to-r from-rose-900/40 to-red-900/40 border border-rose-700/50 rounded-lg p-3 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-rose-300 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <FileJson size={13} className="text-rose-400" />
              Dynamic Tool Registration
            </span>
          </div>

          <div className="text-xs text-gray-300">
            Action: <code className="text-rose-200 font-mono bg-rose-950 px-1 rounded">Register/Call Custom Node Code</code>
          </div>

          <div className="bg-gray-950/60 rounded p-2 text-xs text-gray-400 space-y-1">
            <div className="text-[9px] text-rose-400 font-semibold tracking-wider uppercase">Registry Status</div>
            <div className="truncate italic">
              {entry.response?.message || 'Custom helper script successfully evaluated.'}
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-1 text-xs">
          <div className="font-semibold text-gray-400 uppercase">{nodeType} Node Result</div>
          <pre className="text-gray-300 font-mono mt-0.5 bg-gray-950 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap break-all max-h-[80px] overflow-y-auto">
            {JSON.stringify(entry.response || entry, null, 2)}
          </pre>
        </div>
      );
  }
}
