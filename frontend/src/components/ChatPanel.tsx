import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, MessageSquare, Trash2, Mic, MicOff } from 'lucide-react';
import ParsedChatOutput from './ParsedChatOutput';
import type { ParsedMessage } from './ParsedChatOutput';
import type { Node, Edge } from 'reactflow';
import { sanitizeForSpeech } from '../utils/speechUtils';

interface ChatPanelProps {
  nodes: Node[];
  edges: Edge[];
  onExecute: (userMessage: string) => Promise<ParsedMessage[]>;
  onSpeak?: (text: string, config?: any) => void;
}

export default function ChatPanel({ nodes, edges, onExecute, onSpeak }: ChatPanelProps) {
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
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Detect SpeechRecognition support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
    }
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

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

      // Auto-speak: if a TTS node with autoSpeak is connected, speak the response
      if (onSpeak) {
        const ttsNodes = nodes.filter((n) => n.data?.type === 'tts');
        for (const ttsNode of ttsNodes) {
          const cfg = (ttsNode.data as any)?.config || {};
          if (cfg.autoSpeak === false) continue;
          if (cfg.engine === 'webgpu') continue;
          // Get the last assistant message content
          const lastAssistant = results.filter((r) => r.role === 'assistant').pop();
          const rawText = lastAssistant?.content || cfg.text || text;
          if (!rawText) continue;
          const cleanText = sanitizeForSpeech(rawText);
          onSpeak(cleanText, cfg);
        }
      }
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

  // --- Speech-to-Text ---
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    // Cancel any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setInput((prev) => {
            const separator = prev.trim() ? ' ' : '';
            return prev + separator + transcript;
          });
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

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
          <div className="flex-1 relative">
            <textarea
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-500 transition-colors resize-none w-full"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak a message..."
              disabled={sending || !hasProvider}
            />
            {isListening && (
              <div className="absolute bottom-2 left-3 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-red-400 text-xs">Listening...</span>
              </div>
            )}
          </div>
          {recognitionSupported && (
            <button
              onClick={toggleListening}
              disabled={sending || !hasProvider}
              className={`self-end px-3 py-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-800 text-red-200 hover:bg-red-700 animate-pulse'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isListening ? 'Stop listening' : 'Speak to input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
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
          Enter to send · Shift+Enter for newline{recognitionSupported ? ' · Mic for speech input' : ''}
        </p>
      </div>
    </div>
  );
}
