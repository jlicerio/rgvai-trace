import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface TooltipContent {
  what: string;
  concept: string;
}

const TOOLTIPS: Record<string, TooltipContent> = {
  provider: {
    what: 'Defines which LLM to use — the endpoint URL, model name, and API key. Every pipeline needs one.',
    concept: 'A Provider is the gateway to a foundation model (OpenAI, opencode, Anthropic, local Llama, etc.). It authenticates and routes requests to the right inference endpoint.',
  },
  chat: {
    what: 'Sends prompts to the LLM and receives responses. Connect a Provider upstream to define which model to use.',
    concept: 'The Chat node is the "brain" of your pipeline. It takes a system prompt (instructions for the AI) and user messages, sends them to the LLM, and returns the model\'s response.',
  },
  mcp: {
    what: 'Connects to external tools via the Model Context Protocol. Discovers available tools and calls them.',
    concept: 'MCP (Model Context Protocol) is a standard way for LLMs to use external tools. An MCP server advertises capabilities (web search, file ops, browser control) and the LLM can invoke them. Think of it as "USB-C for AI."',
  },
  observer: {
    what: 'Captures every request and response flowing through the pipeline. Shows the raw data and equivalent curl command.',
    concept: 'Observability is critical in agentic systems. The Observer lets you inspect exactly what was sent to each API and what came back — making the "magic" of LLM tool-use visible and debuggable.',
  },
  browser: {
    what: 'Fetches web pages and extracts readable text. Optionally renders JavaScript for modern single-page apps.',
    concept: 'Browser automation gives LLMs the ability to read web content, interact with pages, and extract data — a foundational capability for agentic systems that need to access live information.',
  },
  search: {
    what: 'Searches the web using DuckDuckGo and returns ranked results with titles, URLs, and snippets.',
    concept: 'Web search is the most common tool given to LLMs. It enables retrieval-augmented generation (RAG) by fetching current information from the internet, grounding the model\'s responses in real data.',
  },
  registry: {
    what: 'Loads a JSON file defining custom tools. Each tool has a name, endpoint, method, and parameters. The registry is self-modifying — tools with write_allowed: true can update their own definitions.',
    concept: 'A tool registry lets LLMs discover and use capabilities dynamically. Self-modification is the key insight behind autonomous agents: a system that can edit its own tool definitions can grow new abilities without human intervention.',
  },
  memory: {
    what: 'Reads and writes to a persistent key-value store. Supports store, retrieve, list, and delete operations scoped by namespace.',
    concept: 'Memory gives agents persistent storage across pipeline executions. By storing and retrieving information by key, agents can maintain state, remember conversation history, and share data between pipeline runs — essential for long-running autonomous systems.',
  },
  context: {
    what: 'Injects context text into prompts. Optionally prepends to the system prompt or appends to the user message. Can be toggled on/off.',
    concept: 'Context injection (often called RAG — Retrieval-Augmented Generation) lets you ground LLM responses in external information. By inserting relevant documents, instructions, or data into the prompt, you guide the model toward more accurate and useful answers without retraining.',
  },
  thread: {
    what: 'Controls branching execution mode. In parallel mode all downstream nodes run concurrently; in sequential mode they run one by one.',
    concept: 'Threading enables parallel execution, branching, and fan-out/fan-in patterns in agentic pipelines. Parallel execution speeds up independent tasks, while sequential execution maintains order for dependent operations — giving fine-grained control over workflow orchestration.',
  },
  skill: {
    what: 'Defines which environment tools and capabilities the agent has access to — shell, git, docker, Python, curl, and more. Toggle skills on/off to control the agent environment.',
    concept: 'Environment skills tell the LLM what tools are available in its execution environment. By explicitly defining the available skills, the agent can choose the right tool for each task — just like a human developer knowing what commands are available in their terminal.',
  },
  code_sandbox: {
    what: 'An in-browser code editor and Python executor. Write and run Python code directly in the browser using Pyodide (Python compiled to WebAssembly).',
    concept: 'Code Sandbox brings a full Python runtime into the browser via WebAssembly. It uses Pyodide to execute Python code client-side, with file system isolation and stdout/stderr capture. No server-side execution needed — the code runs entirely in your browser via a Web Worker.',
  },
  subagent: {
    what: 'Spawns an autonomous child agent with its own role, tools, and skills. Configure the agent role, system prompt, task, and max tool-calling iterations.',
    concept: 'Subagent nodes enable hierarchical agent architectures. A parent pipeline can delegate complex subtasks to specialized child agents that each have their own system prompt, tool access, and environment skills — mirroring how human teams divide labor among specialists.',
  },
  tts: {
    what: 'Speaks text aloud using your browser\'s built-in speech synthesis. Connect after a Chat node to hear responses, or type text directly.',
    concept: 'Text-to-Speech (TTS) makes agentic systems audible. By adding speech output, you can build voice-enabled applications, accessibility features, and multimodal experiences — all running locally in the browser via the Web Speech API with no external services needed.',
  },
  local_model: {
    what: 'Runs a small LLM directly in your browser using WebGPU. No server needed — the model downloads once and runs entirely on your GPU.',
    concept: 'Local inference via WebLLM brings AI models to the browser using WebGPU acceleration. Models like Qwen 0.5B and TinyLlama 1.1B run entirely on-device, enabling private, offline, zero-latency AI — perfect for testing, education, and privacy-sensitive applications.',
  },
};

export default function NodeTooltip({ nodeType, compact = false }: { nodeType: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const tip = TOOLTIPS[nodeType];

  if (!tip) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        title={`Learn about ${nodeType} nodes`}
      >
        <HelpCircle size={compact ? 13 : 15} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full left-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-gray-100 font-semibold text-xs uppercase tracking-wider">
                {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node
              </span>
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold block mb-0.5">
                  What it does
                </span>
                <p className="text-gray-300 text-xs leading-relaxed">{tip.what}</p>
              </div>
              <div className="border-t border-gray-800 pt-2">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold block mb-0.5">
                  Concept
                </span>
                <p className="text-gray-400 text-xs leading-relaxed">{tip.concept}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
