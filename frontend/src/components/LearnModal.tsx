import { useState } from 'react';
import {
  Database,
  MessageSquare,
  Wrench,
  Eye,
  Globe,
  Search,
  FileJson,
  GraduationCap,
  X,
} from 'lucide-react';

type NodeTab = 'provider' | 'chat' | 'mcp' | 'observer' | 'browser' | 'search' | 'registry';

const TABS: { id: NodeTab; label: string; icon: React.ReactNode }[] = [
  { id: 'provider', label: 'Provider', icon: <Database size={16} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
  { id: 'mcp', label: 'MCP', icon: <Wrench size={16} /> },
  { id: 'observer', label: 'Observer', icon: <Eye size={16} /> },
  { id: 'browser', label: 'Browser', icon: <Globe size={16} /> },
  { id: 'search', label: 'Search', icon: <Search size={16} /> },
  { id: 'registry', label: 'Registry', icon: <FileJson size={16} /> },
];

function SectionHeading({ label }: { label: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
      {label}
    </h3>
  );
}

function WhatItIs({ text }: { text: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <SectionHeading label="What It Is" />
      <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function KeyConcepts({ rows }: { rows: { concept: string; definition: string }[] }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <SectionHeading label="Key Concepts" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-400 font-medium py-1.5 pr-3">Concept</th>
              <th className="text-left text-gray-400 font-medium py-1.5">Definition</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-700/50 last:border-0">
                <td className="py-1.5 pr-3 text-gray-200 font-medium align-top">{row.concept}</td>
                <td className="py-1.5 text-gray-400">{row.definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HowItWorks({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <SectionHeading label="How It Works" />
      {paragraphs.map((p, i) => (
        <p key={i} className="text-gray-300 text-sm leading-relaxed">{p}</p>
      ))}
    </div>
  );
}

function ConfigurationFields({ fields }: { fields: { field: string; type: string; default: string; description: string }[] }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <SectionHeading label="Configuration" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-400 font-medium py-1.5 pr-3">Field</th>
              <th className="text-left text-gray-400 font-medium py-1.5 pr-3">Type</th>
              <th className="text-left text-gray-400 font-medium py-1.5 pr-3">Default</th>
              <th className="text-left text-gray-400 font-medium py-1.5">Description</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={i} className="border-b border-gray-700/50 last:border-0">
                <td className="py-1.5 pr-3 text-gray-200 font-mono">{f.field}</td>
                <td className="py-1.5 pr-3 text-gray-400">{f.type}</td>
                <td className="py-1.5 pr-3 text-gray-400 font-mono">{f.default}</td>
                <td className="py-1.5 text-gray-400">{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExamplePipeline({ text }: { text: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <SectionHeading label="Example Pipeline" />
      <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function ExampleCurl({ code }: { code: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <SectionHeading label="Generated Curl" />
      <pre className="bg-gray-950 border border-gray-700 rounded-lg p-3 font-mono text-xs text-green-400 whitespace-pre-wrap break-all overflow-x-auto">
        {code}
      </pre>
    </div>
  );
}

function ProviderContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Provider node defines which LLM (Large Language Model) your pipeline talks to. Think of it as the &ldquo;power source&rdquo; for your agent — it sets the endpoint URL, model name, and API key. Every pipeline needs exactly one Provider node." />
      <KeyConcepts rows={[
        { concept: 'Endpoint', definition: 'The URL of the LLM API server (e.g., https://api.openai.com/v1)' },
        { concept: 'Model', definition: 'Which model to use (e.g., gpt-4o, claude-3, mock-gpt-4o for sandbox)' },
        { concept: 'API Key', definition: 'Authentication credential (stored in browser, never on server)' },
        { concept: 'Sandbox Mode', definition: 'Built-in mock that works without any API key' },
      ]} />
      <HowItWorks paragraphs={[
        'When you hit Play, the executor first processes the Provider node. It reads the endpoint, model, and auth configuration. This context is then passed downstream to Chat nodes, which use it to make their API calls.',
        'The Provider itself makes no external request — it just registers context for the pipeline. Think of it as the configuration hub that tells every downstream node where to send requests and how to authenticate.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'endpoint', type: 'string', default: "''", description: 'LLM API server URL' },
        { field: 'model', type: 'string', default: "''", description: 'Model identifier (e.g., gpt-4o)' },
        { field: 'apiKey', type: 'string', default: "''", description: 'API key for authentication' },
        { field: 'label', type: 'string', default: "'Provider'", description: 'Display label on the canvas' },
      ]} />
      <ExamplePipeline text="Provider → Chat → Observer. Provider holds the API config, Chat sends the prompt, Observer captures the result." />
      <ExampleCurl code="# Provider context: configures endpoint and model. No direct curl." />
    </div>
  );
}

function ChatContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Chat node is where you talk to the LLM. It holds the conversation: system prompt (instructions for how the LLM should behave), user messages, and receives the model&rsquo;s response. It&rsquo;s the core interaction node of any pipeline." />
      <KeyConcepts rows={[
        { concept: 'System Prompt', definition: 'Instructions that set the LLM&rsquo;s behavior and personality' },
        { concept: 'Messages', definition: 'Array of conversation turns (user, assistant, tool)' },
        { concept: 'Temperature', definition: 'Controls randomness (0=deterministic, 1=creative)' },
        { concept: 'Tool Calling', definition: 'When MCP nodes are connected, their tools are sent to the LLM automatically' },
      ]} />
      <HowItWorks paragraphs={[
        'When executed, the Chat node builds an OpenAI-compatible chat completion request. It reads the endpoint and model from the nearest upstream Provider node. The system prompt sets the behavior, and the messages array contains the conversation history.',
        'If any MCP nodes are connected upstream, their tool definitions are included in the request as OpenAI function-calling format. This enables the LLM to request tool calls, which the system executes and returns as additional messages. The LLM responds with text (or tool_calls if tools are available).',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Chat'", description: 'Display label on the canvas' },
        { field: 'systemPrompt', type: 'string', default: "''", description: 'System-level instructions for the LLM' },
        { field: 'messages', type: 'array', default: '[]', description: 'Conversation history array' },
        { field: 'temperature', type: 'number', default: '0.7', description: 'Response randomness (0-1)' },
      ]} />
      <ExamplePipeline text="Provider → Chat → MCP → Observer. Chat defines the prompt, MCP provides tools, Observer captures everything." />
      <ExampleCurl code={`curl -X POST https://api.openai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7
  }'`} />
    </div>
  );
}

function MCPContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The MCP (Model Context Protocol) node connects to an MCP server to discover and call tools. MCP is a standard protocol that lets LLMs dynamically discover what tools are available and how to use them. Think of it as a &ldquo;tool store&rdquo; for your agent." />
      <KeyConcepts rows={[
        { concept: 'MCP Server', definition: 'A service that hosts tools and exposes them via the MCP protocol' },
        { concept: 'Tool Discovery', definition: 'Asking an MCP server &ldquo;what tools do you have?&rdquo; returns a list with names, descriptions, and input schemas' },
        { concept: 'Input Schema', definition: 'JSON Schema defining what arguments a tool accepts' },
        { concept: 'Tool Calling Loop', definition: 'The LLM requests a tool → system calls it → result goes back to LLM → LLM continues' },
      ]} />
      <HowItWorks paragraphs={[
        'After you enter an MCP server URL and click &ldquo;Discover Tools&rdquo;, the frontend calls POST /api/mcp/list-tools to fetch available tools. These tool definitions are stored in the node&rsquo;s config.',
        'When the pipeline executes, if a Chat node is connected upstream from this MCP node, the tool definitions are included in the LLM request as OpenAI tool-calling format functions. The LLM can then decide to call them, and the system handles the execution loop automatically.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'MCP'", description: 'Display label on the canvas' },
        { field: 'serverUrl', type: 'string', default: "''", description: 'URL of the MCP server' },
        { field: 'selectedTool', type: 'string', default: "''", description: 'Currently selected tool name' },
        { field: 'toolArgs', type: 'object', default: '{}', description: 'Arguments for the selected tool' },
      ]} />
      <ExamplePipeline text="Provider → MCP → Chat → Observer. MCP provides tool definitions that Chat sends to the LLM." />
      <ExampleCurl code={`curl -X POST http://your-mcp-server/tools/call \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_weather", "arguments": {"location": "NYC"}}}'`} />
    </div>
  );
}

function ObserverContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Observer node is a passive monitoring tool that captures the full request and response cycle of every upstream node. It&rsquo;s like a network inspector for your pipeline — it shows you exactly what data flowed through each connection." />
      <KeyConcepts rows={[
        { concept: 'Passive', definition: 'Observer nodes never modify data, they only record it' },
        { concept: 'Request Capture', definition: 'The HTTP request body, headers, and URL that was sent' },
        { concept: 'Response Capture', definition: 'The full response from the LLM or tool' },
        { concept: 'Curl Generation', definition: 'Every captured step includes the equivalent curl command' },
      ]} />
      <HowItWorks paragraphs={[
        'Observers sit at the end of pipeline branches. When execution finishes, the Observer collects results from all upstream nodes. Each result includes the request payload, response data, and a corresponding curl command.',
        'This makes the Observer the best node for understanding &ldquo;what really happened.&rdquo; It acts as a debugging and auditing tool, giving you full visibility into every API call your pipeline made and what each one returned.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Observer'", description: 'Display label on the canvas' },
        { field: 'captured', type: 'array', default: '[]', description: 'Captured execution results from upstream nodes' },
      ]} />
      <ExamplePipeline text="Provider → Chat → Observer. The Observer shows you the LLM request and response." />
      <ExampleCurl code="# Observer doesn't make its own HTTP call — it shows the curls from upstream nodes." />
    </div>
  );
}

function BrowserContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Browser node fetches a web page and extracts its text content. It can do simple HTTP requests or use headless browser rendering for JavaScript-heavy sites. This lets your pipeline read live web content." />
      <KeyConcepts rows={[
        { concept: 'HTTP Fetch', definition: 'Simple GET request, returns raw HTML text' },
        { concept: 'Headless Browser', definition: 'Uses Playwright to render JavaScript (optional)' },
        { concept: 'Text Extraction', definition: 'Strips HTML tags, script/style content, returns clean text' },
        { concept: 'Content Cap', definition: 'Results are limited to 10,000 characters' },
      ]} />
      <HowItWorks paragraphs={[
        'Given a URL, the Browser node makes an HTTP request. If render_js is enabled and Playwright is installed, it launches a headless Chromium browser that executes JavaScript before extracting text.',
        'The extracted text is then available for downstream nodes like Chat. This enables patterns like &ldquo;fetch a webpage and summarize it&rdquo; — the Browser gets the raw content, and the Chat node processes it with the LLM.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Browser'", description: 'Display label on the canvas' },
        { field: 'url', type: 'string', default: "''", description: 'Target URL to fetch' },
        { field: 'action', type: 'string', default: "'fetch'", description: 'Action type (fetch, screenshot)' },
        { field: 'renderJs', type: 'boolean', default: 'false', description: 'Enable headless JS rendering' },
      ]} />
      <ExamplePipeline text="Provider → Browser → Chat → Observer. Browser fetches page content, Chat summarizes it." />
      <ExampleCurl code="curl -s 'https://example.com'" />
    </div>
  );
}

function SearchContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Search node performs a web search and returns structured results. It uses DuckDuckGo&rsquo;s HTML interface to find relevant pages, making it useful for RAG (Retrieval-Augmented Generation) patterns where the LLM needs current information." />
      <KeyConcepts rows={[
        { concept: 'Web Search', definition: 'Queries DuckDuckGo and returns title/snippet/URL results' },
        { concept: 'RAG', definition: 'Retrieval-Augmented Generation — fetching external info before generating a response' },
        { concept: 'Search Results', definition: 'Structured list of {title, url, snippet} objects' },
        { concept: 'Context Injection', definition: 'Results are fed into downstream Chat nodes as context' },
      ]} />
      <HowItWorks paragraphs={[
        'The Search node takes a query string and optional count parameter. It posts to DuckDuckGo&rsquo;s HTML search endpoint, parses the results, and returns a structured JSON array.',
        'Downstream Chat nodes can use these results as context for answering questions. This is the classic RAG pattern: search for relevant information first, then have the LLM generate a response grounded in that information.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Search'", description: 'Display label on the canvas' },
        { field: 'query', type: 'string', default: "''", description: 'Search query string' },
        { field: 'count', type: 'number', default: '5', description: 'Number of results to return' },
      ]} />
      <ExamplePipeline text="Provider → Search → Chat → Observer. Search finds information, Chat answers based on it." />
      <ExampleCurl code="curl -s 'https://html.duckduckgo.com/html/' -d 'q=what+is+mcp+protocol'" />
    </div>
  );
}

function RegistryContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Registry node provides a self-modifying tool database. It&rsquo;s the most advanced node type — it lets your pipeline read from and write to a tool registry, enabling agents to create their own tools at runtime." />
      <KeyConcepts rows={[
        { concept: 'Tool Registry', definition: 'A JSON file that stores tool definitions with schemas' },
        { concept: 'Self-Modification', definition: 'The agent can generate code for new tools and register them' },
        { concept: 'Schema Guardrails', definition: 'Validation prevents registering malformed or dangerous tools' },
        { concept: 'Write Protection', definition: 'Some tools are marked read-only to prevent overwriting' },
      ]} />
      <HowItWorks paragraphs={[
        'The Registry loads tools from a JSON file on the server. Each tool has a name, description, input schema, and code handler. During execution, a Chat node with Registry access can call registry tools or create new ones.',
        'The registry is persistent — tools added in one pipeline session are available in future sessions. This enables powerful patterns where agents build their own tool ecosystem over time, adapting to new tasks dynamically.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Registry'", description: 'Display label on the canvas' },
        { field: 'meta', type: 'object', default: "{name: 'Active Registry'}", description: 'Metadata for the registry' },
      ]} />
      <ExamplePipeline text="Provider → Registry → Chat → Observer. Registry provides tools, Chat uses them." />
      <ExampleCurl code={`curl -X POST /api/registry/call \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "calculator", "arguments": {"a": 2, "b": 3}}'`} />
    </div>
  );
}

const TAB_CONTENT: Record<NodeTab, React.ReactNode> = {
  provider: <ProviderContent />,
  chat: <ChatContent />,
  mcp: <MCPContent />,
  observer: <ObserverContent />,
  browser: <BrowserContent />,
  search: <SearchContent />,
  registry: <RegistryContent />,
};

interface LearnModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LearnModal({ open, onClose }: LearnModalProps) {
  const [activeTab, setActiveTab] = useState<NodeTab>('provider');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-[900px] max-h-[85vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-gray-300" />
            <h2 className="text-sm font-bold text-gray-200">Learn — Trace Node Reference</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 py-3 border-b border-gray-800 overflow-x-auto shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-gray-100 border border-gray-600'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              <span className="text-gray-400">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-5 overflow-y-auto">
          {TAB_CONTENT[activeTab]}
        </div>
      </div>
    </div>
  );
}
