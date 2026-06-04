import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Code2, Copy, Check } from 'lucide-react';
import type { ExecutionStepResult, LanguageType } from '../types/pipeline';
import { generateCode } from '../utils/codeGeneration';

interface CodeExporterProps {
  /** Pipeline steps in execution order. Last step is auto-selected. */
  steps: ExecutionStepResult[];
  /** Force a specific step index (0-based). Defaults to last. */
  activeStepIndex?: number;
}

const LANGUAGES: { key: LanguageType; label: string }[] = [
  { key: 'python', label: 'Python' },
  { key: 'node', label: 'Node.js' },
  { key: 'curl', label: 'cURL' },
];

export default function CodeExporter({ steps, activeStepIndex }: CodeExporterProps) {
  const [lang, setLang] = useState<LanguageType>('curl');
  const [selectedIndex, setSelectedIndex] = useState<number>(
    activeStepIndex ?? Math.max(0, steps.length - 1),
  );
  const [copied, setCopied] = useState(false);
  const prevCountRef = useRef(steps.length);

  // When activeStepIndex prop changes, follow it
  useEffect(() => {
    if (activeStepIndex !== undefined) {
      setSelectedIndex(activeStepIndex);
    }
  }, [activeStepIndex]);

  // Auto-select last step when new results arrive (unless parent controls it)
  useEffect(() => {
    if (steps.length !== prevCountRef.current && activeStepIndex === undefined) {
      setLang('curl');
      setSelectedIndex(Math.max(0, steps.length - 1));
      prevCountRef.current = steps.length;
    }
  }, [steps.length, activeStepIndex]);

  const code = useMemo(
    () => (steps[selectedIndex] ? generateCode(steps[selectedIndex], lang) : ''),
    [steps, selectedIndex, lang],
  );

  const handleCopy = useCallback(() => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  if (!steps[selectedIndex]) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header: language tabs + copy */}
      <div className="flex items-stretch border-b border-gray-700">
        {/* Language tabs */}
        <div className="flex">
          {LANGUAGES.map((l) => (
            <button
              key={l.key}
              onClick={() => setLang(l.key)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                lang === l.key
                  ? 'text-gray-100 bg-gray-800 border-b-2 border-gray-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {l.key === 'python' && (
                <Code2 size={12} className="shrink-0" />
              )}
              {l.key === 'node' && (
                <Code2 size={12} className="shrink-0" />
              )}
              {l.key === 'curl' && (
                <Code2 size={12} className="shrink-0" />
              )}
              {l.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors shrink-0"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-gray-300" />
              <span className="text-gray-300">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
            </>
          )}
        </button>
      </div>

      {/* Step selector (shown when >1 step) */}
      {steps.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/60 border-b border-gray-700 overflow-x-auto">
          <span className="text-gray-600 text-xs mr-1 shrink-0">Step:</span>
          {steps.map((s, i) => (
            <button
              key={s.stepId}
              onClick={() => setSelectedIndex(i)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                i === selectedIndex
                  ? 'bg-gray-700 text-gray-200'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <span className="text-gray-600 text-xs ml-1 shrink-0">
            {steps[selectedIndex]?.nodeType}
          </span>
        </div>
      )}

      {/* Code display */}
      <pre className="text-xs font-mono p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-[320px] overflow-y-auto">
        {highlightCode(code, lang)}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simple syntax highlighting
// ---------------------------------------------------------------------------

function highlightCode(code: string, lang: LanguageType): React.ReactNode[] {
  if (!code) return [];

  if (lang === 'curl') {
    return highlightCurl(code);
  }

  if (lang === 'python') {
    return highlightPython(code);
  }

  return highlightJavaScript(code);
}

/* ── curl ── */
function highlightCurl(cmd: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokens = cmd.split(
    /(--\w+|-[a-zA-Z]|https?:\/\/[^\s"'`]+|"[^"]*"|'[^']*'|`[^`]*`)/g,
  );

  tokens.forEach((token, i) => {
    if (/^--?\w+$/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-300">
          {token}
        </span>,
      );
    } else if (/^https?:\/\//.test(token)) {
      parts.push(
        <span key={i} className="text-gray-100 underline">
          {token}
        </span>,
      );
    } else if (/^["'`]/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-400">
          {token}
        </span>,
      );
    } else {
      parts.push(
        <span key={i} className="text-gray-500">
          {token}
        </span>,
      );
    }
  });

  return parts;
}

/* ── Python ── */
const PY_KEYWORDS =
  /\b(from|import|def|return|if|else|elif|for|while|try|except|finally|with|as|class|async|await|True|False|None|print|in|not|and|or|is|raise|pass|break|continue)\b/g;

function highlightPython(code: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokens = code.split(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#[^\n]*|\b\w+\b)/g,
  );

  tokens.forEach((token, i) => {
    if (/^["']/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-400">
          {token}
        </span>,
      );
    } else if (/^#/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-600 italic">
          {token}
        </span>,
      );
    } else if (PY_KEYWORDS.test(token)) {
      PY_KEYWORDS.lastIndex = 0;
      parts.push(
        <span key={i} className="text-gray-300">
          {token}
        </span>,
      );
    } else if (/^\d+\.?\d*$/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-300">
          {token}
        </span>,
      );
    } else if (/^[A-Z_]+$/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-300">
          {token}
        </span>,
      );
    } else {
      parts.push(
        <span key={i} className="text-gray-400">
          {token}
        </span>,
      );
    }
  });

  return parts;
}

/* ── JavaScript / Node.js ── */
const JS_KEYWORDS =
  /\b(const|let|var|async|await|function|return|if|else|for|while|try|catch|finally|throw|new|import|export|from|default|class|extends|true|false|null|undefined|typeof|instanceof|this|switch|case|break|continue)\b/g;

function highlightJavaScript(code: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokens = code.split(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/|\b\w+\b)/g,
  );

  tokens.forEach((token, i) => {
    if (/^["'`]/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-400">
          {token}
        </span>,
      );
    } else if (/^\/\//.test(token) || /^\/\*/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-600 italic">
          {token}
        </span>,
      );
    } else if (JS_KEYWORDS.test(token)) {
      JS_KEYWORDS.lastIndex = 0;
      parts.push(
        <span key={i} className="text-gray-300">
          {token}
        </span>,
      );
    } else if (/^\d+\.?\d*$/.test(token)) {
      parts.push(
        <span key={i} className="text-gray-300">
          {token}
        </span>,
      );
    } else {
      parts.push(
        <span key={i} className="text-gray-400">
          {token}
        </span>,
      );
    }
  });

  return parts;
}
