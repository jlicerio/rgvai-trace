import { Code, Terminal, Globe, FileText, Database, Search } from 'lucide-react';

interface ParsedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: { name: string; arguments: Record<string, unknown> }[];
  toolResults?: { tool: string; result: string }[];
}

export default function ParsedChatOutput({ message }: { message: ParsedMessage }) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  return (
    <div
      className={`p-3 rounded-lg mb-2 ${
        isUser ? 'bg-gray-700/50 border border-gray-600' : 
        isTool ? 'bg-gray-800/50 border border-gray-700/50' :
        'bg-gray-800 border border-gray-700/50'
      }`}
    >
      {/* Role badge */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
          isUser ? 'text-gray-300' :
          isTool ? 'text-yellow-500' :
          'text-emerald-400'
        }`}>
          {isTool ? '🔧 Tool Result' : isUser ? 'You' : 'Assistant'}
        </span>
      </div>

      {/* Text content */}
      {message.content && (
        <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
      )}

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {message.toolCalls.map((tc, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold mb-1">
                <Terminal size={12} />
                Invoke Tool: {tc.name}
              </div>
              <pre className="text-gray-400 text-[11px] font-mono bg-black/30 rounded px-2 py-1 overflow-x-auto">
                {JSON.stringify(tc.arguments, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Tool results */}
      {message.toolResults && message.toolResults.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {message.toolResults.map((tr, i) => {
            // Check for A2UI content: rendered HTML UIs from MCP tools
            const isA2UI = tr.result && (
              tr.result.includes('"type":"custom"') ||
              tr.result.includes("'type':'custom'") ||
              tr.result.includes('"name":"McpApp"')
            );
            return (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold mb-1">
                  <FileText size={12} />
                  {tr.tool}
                  {isA2UI && (
                    <span className="ml-auto text-[10px] bg-gray-900 text-gray-300 px-1.5 py-0.5 rounded font-mono">
                      A2UI
                    </span>
                  )}
                </div>
                {isA2UI ? (
                  <A2UIRenderer result={tr.result} />
                ) : (
                  <pre className="text-gray-400 text-[11px] font-mono bg-black/30 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {tr.result}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback for raw JSON objects */}
      {!message.content && !message.toolCalls && !message.toolResults && message.role === 'assistant' && (
        <p className="text-gray-500 text-xs italic">Empty response</p>
      )}
    </div>
  );
}

export type { ParsedMessage };


/** Renders A2UI HTML content in a sandboxed iframe following the double-iframe pattern. */
function A2UIRenderer({ result }: { result: string }) {
  // Try to extract HTML content from A2UI payload
  let html = '';
  try {
    // Try JSON parse — A2UI payload is JSON with properties.content
    const parsed = JSON.parse(
      // Handle escaped JSON strings
      result.startsWith('"') ? JSON.parse(result) : result
    );
    if (parsed?.properties?.content) {
      html = parsed.properties.content;
    } else if (parsed?.content) {
      html = parsed.content;
    }
  } catch {
    // Not JSON — use raw result
    html = result;
  }

  // Strip URL encoding prefix if present
  if (html.startsWith('url_encoded:')) {
    try {
      html = decodeURIComponent(html.slice(12));
    } catch {
      html = html.slice(12);
    }
  }

  if (!html) {
    return <pre className="text-gray-500 text-[11px] font-mono">No A2UI content</pre>;
  }

  // Sandboxed iframe: no allow-same-origin, scripts allowed, forms allowed
  const sandboxedDoc = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><base target="_blank"></head>
<body style="margin:0;padding:8px;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;font-size:12px">
${html}
</body>
</html>`;

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-gray-900/50 border-b border-gray-700">
        <span className="text-gray-400 text-[10px] font-mono">A2UI Sandbox</span>
        <span className="text-gray-600 text-[9px]">sandboxed · no cookies</span>
      </div>
      <iframe
        srcDoc={sandboxedDoc}
        sandbox="allow-scripts allow-forms allow-popups"
        className="w-full border-0"
        style={{ minHeight: '100px', height: 'auto' }}
        title="A2UI sandbox"
      />
    </div>
  );
}
