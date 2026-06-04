import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CurlDisplayProps {
  curlCommand: string;
}

function highlightCurl(cmd: string): React.ReactNode[] {
  // Simple syntax highlighting for curl commands
  const parts: React.ReactNode[] = [];
  const tokens = cmd.split(/(--\w+|-[a-zA-Z]|https?:\/\/[^\s]+|"[^"]*"|'[^']*')/g);

  tokens.forEach((token, i) => {
    if (/^--?\w+$/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-300">
          {token}
        </span>
      );
    } else if (/^https?:\/\//.test(token)) {
      parts.push(
        <span key={i} className="text-gray-100 underline">
          {token}
        </span>
      );
    } else if (/^["']/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-400">
          {token}
        </span>
      );
    } else {
      parts.push(
        <span key={i} className="text-gray-500">
          {token}
        </span>
      );
    }
  });

  return parts;
}

export default function CurlDisplay({ curlCommand }: CurlDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(curlCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [curlCommand]);

  if (!curlCommand) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
          cURL Command
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-gray-300" />
              <span className="text-gray-300">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Command body */}
      <pre className="text-xs font-mono p-3 overflow-x-auto whitespace-pre-wrap break-all text-gray-400 leading-relaxed">
        {highlightCurl(curlCommand)}
      </pre>
    </div>
  );
}
