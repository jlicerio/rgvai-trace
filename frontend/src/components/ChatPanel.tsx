import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, MessageSquare, Trash2 } from 'lucide-react';
import ParsedChatOutput from './ParsedChatOutput';
import type { ParsedMessage } from './ParsedChatOutput';
import type { Node, Edge } from 'reactflow';

interface ChatPanelProps {
  nodes: Node[];
  edges: Edge[];
  onExecute: (userMessage: string) => Promise<ParsedMessage[]>;
}

export default function ChatPanel({ nodes, edges, onExecute }: ChatPanelProps) {
  const [messages, setMessages] = useState<ParsedMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Welcome to the Agentic Pipeline Builder! Build a pipeline on the canvas, then type a message here to send through it. Each response shows the LLM output and any tool calls made.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Add user message
    const userMsg: ParsedMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const results = await onExecute(text);
      setMessages((prev) => [...prev, ...results]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'system', content: `Error: ${msg}` },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, onExecute]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleClear = useCallback(() => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'system',
        content: 'Conversation cleared. Build a pipeline and send a new message.',
      },
    ]);
    setError(null);
  }, []);

  const hasProvider = nodes.some((n) => (n.data as any)?.type === 'provider');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-gray-400" />
          <span className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
            Chat
          </span>
        </div>
        <button
          onClick={handleClear}
          className="text-gray-600 hover:text-gray-400 transition-colors"
          title="Clear conversation"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600">
            <MessageSquare size={24} className="mb-2 opacity-30" />
            <p className="text-xs text-center">Build a pipeline and<br />type a message below.</p>
          </div>
        )}
        {messages.map((msg) => (
          <ParsedChatOutput key={msg.id} message={msg} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 py-2 text-gray-500">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs">Running pipeline...</span>
          </div>
        )}
        {error && (
          <div className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-800 shrink-0">
        {!hasProvider && (
          <p className="text-amber-500 text-[10px] mb-2">
            Add a Provider node to the canvas first
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-500 transition-colors resize-none"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message to send through the pipeline..."
            disabled={sending || !hasProvider}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim() || !hasProvider}
            className="self-end px-3 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send (Enter)"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-gray-700 text-[10px] mt-1">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
