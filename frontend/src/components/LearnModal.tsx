import { useState } from 'react';
import {
  Database,
  MessageSquare,
  Wrench,
  Eye,
  Globe,
  Search,
  FileJson,
  FileText,
  GitBranch,
  GraduationCap,
  Terminal,
  Bot,
  Volume2,
  Cpu,
  X,
} from 'lucide-react';

type NodeTab = 'provider' | 'chat' | 'mcp' | 'observer' | 'browser' | 'search' | 'registry' | 'memory' | 'context' | 'thread' | 'skill' | 'subagent' | 'tts' | 'local_model';

const TABS: { id: NodeTab; label: string; icon: React.ReactNode }[] = [
  { id: 'provider', label: 'Provider', icon: <Database size={16} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
  { id: 'mcp', label: 'MCP', icon: <Wrench size={16} /> },
  { id: 'observer', label: 'Observer', icon: <Eye size={16} /> },
  { id: 'browser', label: 'Browser', icon: <Globe size={16} /> },
  { id: 'search', label: 'Search', icon: <Search size={16} /> },
  { id: 'registry', label: 'Registry', icon: <FileJson size={16} /> },
  { id: 'memory', label: 'Memory', icon: <Database size={16} /> },
  { id: 'context', label: 'Context', icon: <FileText size={16} /> },
  { id: 'thread', label: 'Thread', icon: <GitBranch size={16} /> },
  { id: 'skill', label: 'Env Skills', icon: <Terminal size={16} /> },
  { id: 'subagent', label: 'Subagent', icon: <Bot size={16} /> },
  { id: 'tts', label: 'TTS', icon: <Volume2 size={16} /> },
  { id: 'local_model', label: 'Local Model', icon: <Cpu size={16} /> },
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
      <WhatItIs text="The Chat node is where you talk to the LLM. It holds the conversation: system prompt (instructions for how the LLM should behave), user messages, and receives the model's response. It's the core interaction node of any pipeline." />
      <KeyConcepts rows={[
        { concept: 'System Prompt', definition: "Instructions that set the LLM&rsquo;s behavior and personality" },
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
  -H "Authorization: Bearer ***" \\
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
        'After you enter an MCP server URL and click &ldquo;Discover Tools&rdquo;, the frontend calls POST /api/mcp/list-tools to fetch available tools. These tool definitions are stored in the node\'s config.',
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

function MemoryContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Memory node provides persistent key-value storage for your pipeline. It can store, retrieve, and list entries across pipeline runs using namespaces. Think of it as a simple database that lets your agent remember information between executions." />
      <KeyConcepts rows={[
        { concept: 'Key-Value Storage', definition: 'Data is stored as key-value pairs, similar to a dictionary or hash map' },
        { concept: 'Namespaces', definition: 'Logical groupings of keys to avoid collisions (e.g., user_session, global_config)' },
        { concept: 'Store', definition: 'Saves a value under a given key and namespace for later retrieval' },
        { concept: 'Retrieve', definition: 'Fetches a previously stored value by key and namespace' },
        { concept: 'List', definition: 'Returns all entries in a namespace for inspection or iteration' },
      ]} />
      <HowItWorks paragraphs={[
        'When you configure a Memory node, you pick an action (store, retrieve, or list) and a namespace. For store and retrieve, you also provide a key. The node communicates with a backend memory store that persists data between pipeline executions.',
        'This enables powerful patterns like conversation history storage, caching expensive computations, sharing state between pipeline branches, and maintaining user preferences across sessions.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Memory'", description: 'Display label on the canvas' },
        { field: 'action', type: 'string', default: "'retrieve'", description: 'Operation: store, retrieve, or list' },
        { field: 'namespace', type: 'string', default: "'default'", description: 'Logical grouping key for entries' },
        { field: 'key', type: 'string', default: "''", description: 'Key to store or retrieve (not used for list)' },
        { field: 'value', type: 'string', default: "''", description: 'Value to store (store action only)' },
      ]} />
      <ExamplePipeline text="Provider → Memory → Chat → Observer. Memory stores conversation context between turns, enabling stateful multi-turn conversations." />
      <ExampleCurl code={`curl -X POST /api/memory/store \\
  -H "Content-Type: application/json" \\
  -d '{"namespace": "default", "key": "user_name", "value": "Alice"}'`} />
    </div>
  );
}

function ContextContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Context node injects external knowledge into your pipeline's prompts. It lets you add static or dynamic content (from files, APIs, or RAG sources) to the LLM's input, enabling retrieval-augmented generation (RAG) and system prompt augmentation." />
      <KeyConcepts rows={[
        { concept: 'Context Injection', definition: 'Inserting additional information into the LLM prompt to ground its responses' },
        { concept: 'RAG', definition: 'Retrieval-Augmented Generation — fetching relevant documents and inserting them as context' },
        { concept: 'System Prompt Augmentation', definition: 'Appending or prepending context to the system message for behavior steering' },
        { concept: 'Static Context', definition: 'Fixed content you write directly in the node configuration' },
        { concept: 'Dynamic Context', definition: 'Content loaded from upstream nodes, files, or live data sources' },
      ]} />
      <HowItWorks paragraphs={[
        'The Context node sits upstream of Chat nodes. When the pipeline executes, the content you provide is injected into the Chat node\'s prompt at the position you specify (prepend to system prompt, append to user message, or replace system prompt entirely).',
        'This enables RAG patterns where upstream nodes (Search, Browser) fetch information that the Context node formats and passes to the Chat node, keeping the LLM grounded in current or domain-specific data without modifying its training.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Context'", description: 'Display label on the canvas' },
        { field: 'content', type: 'string', default: "''", description: 'Text content to inject into the prompt' },
        { field: 'enabled', type: 'boolean', default: 'true', description: 'Toggle context injection on/off without deleting the node' },
        { field: 'position', type: 'string', default: "'prepend_system'", description: 'Where to inject: prepend_system, append_user, or replace_system' },
      ]} />
      <ExamplePipeline text="Provider → Search → Context → Chat → Observer. Search fetches facts, Context formats them, Chat answers based on the enriched prompt." />
      <ExampleCurl code={`curl -X POST /api/context/inject \\
  -H "Content-Type: application/json" \\
  -d '{"content": "The sky is blue on Earth but red on Mars.", "position": "prepend_system"}'`} />
    </div>
  );
}

function ThreadContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Thread node enables parallel execution and branching in your pipeline. It splits the flow into multiple concurrent branches (fan-out) and optionally merges them back (fan-in). This is essential for building complex agentic systems that run multiple operations simultaneously." />
      <KeyConcepts rows={[
        { concept: 'Parallel Execution', definition: 'Running multiple pipeline branches at the same time rather than sequentially' },
        { concept: 'Branching', definition: 'Splitting the execution flow into separate paths that process independently' },
        { concept: 'Fan-Out', definition: 'One input is distributed to multiple parallel branches for concurrent processing' },
        { concept: 'Fan-In', definition: 'Results from multiple parallel branches are collected and merged back into a single flow' },
        { concept: 'Concurrency', definition: 'The number of branches that execute simultaneously, controllable via Thread config' },
      ]} />
      <HowItWorks paragraphs={[
        'When the pipeline reaches a Thread node configured in fan-out mode, it dispatches execution to all connected downstream branches simultaneously. Each branch receives the same input data and processes it independently. In fan-in mode, the Thread node waits for all branches to complete and aggregates their outputs.',
        'This is particularly useful for patterns like multi-model comparison (send the same prompt to different LLMs), parallel tool execution (call multiple APIs at once), and map-reduce workflows (split work, process concurrently, merge results).',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Thread'", description: 'Display label on the canvas' },
        { field: 'mode', type: 'string', default: "'parallel'", description: 'Execution strategy: parallel, fan_out, or fan_in' },
        { field: 'branches', type: 'array', default: '[]', description: 'List of branch definitions with labels and node assignments' },
      ]} />
      <ExamplePipeline text="Provider → Thread (fan-out) → [Search, Browser] → Thread (fan-in) → Chat → Observer. Two parallel data fetches merge into a single Chat call." />
      <ExampleCurl code={`# Thread fan-out dispatches to multiple branches concurrently.
# Each branch executes independently and results are merged at fan-in.
# No single curl — threads are managed by the pipeline executor.`} />
    </div>
  );
}

function SkillContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Skill node defines the environment capabilities available to your agent. Think of it as a toolbox — you tell the LLM what tools (shell, git, docker, Python, etc.) are available in its execution environment, and it knows how to use them." />
      <KeyConcepts rows={[
        { concept: 'Environment Skills', definition: 'The set of tools and runtimes available in the agent execution environment' },
        { concept: 'Skill Toggling', definition: 'Each skill can be enabled or disabled to control what the agent can do' },
        { concept: 'Context Injection', definition: 'Enabled skills are injected into the Chat node system prompt as available capabilities' },
        { concept: 'Categories', definition: 'Skills are grouped by domain: Core, Dev Tools, Runtimes, Network, and Utilities' },
      ]} />
      <HowItWorks paragraphs={[
        'When you connect a Skill node upstream of a Chat node, the list of enabled skills gets injected into the LLM system prompt as context. This tells the model exactly what tools it has available, enabling it to request tool calls that match the actual environment.',
        'Each skill represents a real capability in the environment. For example, enabling Shell allows the agent to run bash commands; enabling Git lets it perform version control operations. The Skill node acts as a declarative capability manifest — the agent knows what it can use, and the system knows what to expect.',
        'Skills are organized into categories: Core (shell), Dev Tools (git, docker, make), Runtimes (python, node), Network (curl, ssh), and Utilities (jq, grep). This categorization helps both the LLM and the human understand the agent capabilities at a glance.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Env Skills'", description: 'Display label on the canvas' },
        { field: 'enabledSkills', type: 'string[]', default: "[all skills]", description: 'Array of skill IDs that are currently enabled' },
      ]} />
      <ExamplePipeline text="Provider → Skill → Chat → Observer. Skill tells the Chat node what tools the agent can use in its environment." />
      <ExampleCurl code={`# Skill node registers environment capabilities:
#   Shell, Git, Docker, Python, Node.js,
#   cURL, SSH, Make, jq, grep`} />
    </div>
  );
}

function SubagentContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Subagent node spawns an autonomous child agent with its own role, tools, and skills. Think of it as hiring a specialist — you give it a role (Code Writer, Data Analyst, etc.), define its system prompt, and set the task it needs to complete. The subagent operates independently, making tool calls and iterating until the task is done." />
      <KeyConcepts rows={[
        { concept: 'Subagent Role', definition: 'A predefined persona with its own system prompt, tool access, and skill set' },
        { concept: 'Autonomous Execution', definition: 'The subagent runs independently, calling tools and iterating until the task is complete' },
        { concept: 'Skill Injection', definition: 'Enabled skills are injected into the subagent system prompt as available environment capabilities' },
        { concept: 'Tool Filtering', definition: 'The role\'s allowedMcpTools whitelist controls which MCP tools the subagent can call' },
        { concept: 'Max Iterations', definition: 'Limits the tool-calling loop to prevent runaway agents (customizable per role)' },
        { concept: 'Hierarchical Agents', definition: 'Subagent nodes enable parent-child agent architectures for complex task decomposition' },
      ]} />
      <HowItWorks paragraphs={[
        'When a Subagent node executes, it creates an autonomous LLM agent with the configured role. The role provides the system prompt, max iterations, allowed MCP tools, and environment skills. The task input comes from the node config or upstream nodes.',
        'The subagent works through a tool-calling loop: it receives the task, decides which tools to call, receives results, and continues iterating until the task is complete or the iteration limit is reached. This mirrors how a human developer would break down and solve a complex problem.',
        'Subagents can be used for specialized subtasks like "Write a Python script to parse this CSV and generate a report" (Code Writer role), "Debug the error in this stack trace" (Debugger role), or "Search the web for the latest research on topic X" (Web Researcher role).',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Subagent'", description: 'Display label on the canvas' },
        { field: 'roleName', type: 'string', default: "'Code Writer'", description: 'Preset role to use (Code Writer, Data Analyst, Web Researcher, Debugger, Shell Operator)' },
        { field: 'customRole', type: 'object', default: 'null', description: 'Custom role override with name, systemPrompt, maxIterations, allowedMcpTools, enabledSkills' },
        { field: 'task', type: 'string', default: "''", description: 'The task/instruction to give the subagent' },
        { field: 'temperature', type: 'number', default: '0.7', description: 'LLM response randomness (0-1)' },
      ]} />
      <ExamplePipeline text="Provider → Subagent → Observer. The Subagent spawns a child agent with its own role, executes autonomously, and returns results." />
      <ExampleCurl code={`# Subagent creates an autonomous child agent with its own role and task.
# The subagent manages its own tool-calling loop internally.
# No single curl — the subagent handles the LLM conversation.`} />
    </div>
  );
}

function TTSContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The TTS (Text-to-Speech) node speaks text aloud. It supports two engines: the browser-native Web Speech API (OS voices, instant, no downloads) and WebGPU Neural SpeechT5 (downloads a ~300MB model once, then generates natural-sounding speech on your GPU). No API keys or external services needed for either." />
      <KeyConcepts rows={[
        { concept: 'Web Speech API', definition: 'Browser-native speech synthesis — works offline, no downloads, OS voices' },
        { concept: 'WebGPU Neural TTS', definition: 'SpeechT5 model via Transformers.js — natural human-like voice, runs on GPU' },
        { concept: 'Engine Switch', definition: 'Toggle between Web Speech (instant) and WebGPU (higher quality) modes' },
        { concept: 'Voice Selection', definition: 'Web Speech: system voices. WebGPU: 6 speaker embeddings (male/female)' },
        { concept: 'Rate & Pitch', definition: 'Web Speech: configurable. WebGPU: uses model default speed' },
        { concept: 'Auto-speak', definition: 'When enabled, automatically speaks Chat responses during pipeline execution' },
      ]} />
      <HowItWorks paragraphs={[
        'When connected downstream of a Chat node, the TTS node receives the LLM response text during pipeline execution. If auto-speak is enabled, the frontend automatically speaks the response aloud using whichever engine is selected.',
        'In Web Speech mode, the browser&rsquo;s built-in speechSynthesis API is used — instant, no downloads, supports system voices with rate/pitch/volume controls. Works on every modern browser.',
        'In WebGPU mode, clicking "Load SpeechT5" downloads a Microsoft SpeechT5 model (~300MB, cached in IndexedDB) and runs neural TTS inference on your GPU. The result is more natural-sounding speech with 6 speaker embeddings to choose from. Requires Chrome 113+ or Edge 113+ with WebGPU support.',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'TTS'", description: 'Display label on the canvas' },
        { field: 'text', type: 'string', default: "''", description: 'Text to speak (optional — received from Chat node when connected)' },
        { field: 'engine', type: 'string', default: "'webspeech'", description: "TTS engine: 'webspeech' (OS voices) or 'webgpu' (SpeechT5 neural)" },
        { field: 'voice', type: 'string', default: "'default'", description: 'Web Speech: voice name from system speech synthesis' },
        { field: 'rate', type: 'number', default: '1.0', description: 'Web Speech: speech rate (0.5 = slow, 1.0 = normal, 2.0 = fast)' },
        { field: 'pitch', type: 'number', default: '1.0', description: 'Web Speech: voice pitch (0.5 = low, 1.0 = normal, 2.0 = high)' },
        { field: 'autoSpeak', type: 'boolean', default: 'true', description: 'Automatically speak Chat responses during pipeline execution' },
        { field: 'speakerId', type: 'number', default: '0', description: 'WebGPU: speaker embedding ID (0-5, different male/female voices)' },
      ]} />
      <ExamplePipeline text="Provider → Chat → TTS → Observer. Chat generates a response, TTS speaks it aloud (Web Speech instantly or WebGPU with higher quality)." />
      <ExampleCurl code={`# TTS runs entirely in-browser via Web Speech API or WebGPU.
# No curl equivalent — speech synthesis is client-side only.`} />
    </div>
  );
}

function LocalModelContent() {
  return (
    <div className="space-y-4">
      <WhatItIs text="The Local Model node runs a small LLM directly in your browser using WebGPU acceleration. No server, no API key, no cloud dependency — the model downloads once (cached in IndexedDB) and runs entirely on your GPU. Perfect for testing, education, offline use, and privacy-sensitive applications." />
      <KeyConcepts rows={[
        { concept: 'WebGPU', definition: 'Browser GPU API that enables running ML models directly on your GPU' },
        { concept: 'WebLLM', definition: 'MLC AI library that compiles and runs LLMs in the browser via WebGPU' },
        { concept: 'On-Device Inference', definition: 'All computation happens locally on your machine — zero server calls' },
        { concept: 'Model Cache', definition: 'Downloaded models are cached in IndexedDB for reuse across sessions' },
        { concept: 'Quantized Models', definition: 'Models use q4f16 quantization — 4-bit weights for small download size' },
      ]} />
      <HowItWorks paragraphs={[
        'Select a model from the dropdown and click "Load Model." The first load downloads the model (~400MB to ~2.5GB depending on the model) via WebGPU. Progress is shown in the node. Once cached, subsequent loads are nearly instant.',
        'After loading, type a prompt and click Generate. The model runs inference entirely in your browser using WebGPU acceleration. The response appears in the node&rsquo;s output panel. You can adjust temperature and max tokens to control generation behavior.',
        'Available models range from Qwen 0.5B (~400MB, fastest) to Phi-3 Mini 3.8B (~2.5GB, most capable). All use q4f16 quantization for efficient download and inference. WebGPU Browser support: Chrome 113+, Edge 113+, Opera 100+ (Safari and Firefox support coming).',
      ]} />
      <ConfigurationFields fields={[
        { field: 'label', type: 'string', default: "'Local Model'", description: 'Display label on the canvas' },
        { field: 'modelId', type: 'string', default: "''", description: 'WebLLM model identifier (e.g., Qwen2.5-0.5B-Instruct-q4f16_1-MLC)' },
        { field: 'systemPrompt', type: 'string', default: "'You are a helpful AI assistant.'", description: 'System prompt for the local model' },
        { field: 'temperature', type: 'number', default: '0.7', description: 'Response randomness (0.0 = deterministic, 2.0 = very creative)' },
        { field: 'maxTokens', type: 'number', default: '2048', description: 'Maximum response length in tokens' },
      ]} />
      <ExamplePipeline text="Local Model (standalone with typed prompt) — or — Provider → Chat → Local Model (as a verification node). Best used alone for local inference testing." />
      <ExampleCurl code={`# Local inference runs entirely in-browser via WebLLM.
# No curl equivalent — the model runs locally on your GPU.`} />
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
  memory: <MemoryContent />,
  context: <ContextContent />,
  thread: <ThreadContent />,
  skill: <SkillContent />,
  subagent: <SubagentContent />,
  tts: <TTSContent />,
  local_model: <LocalModelContent />,
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
