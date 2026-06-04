import type { NodeType } from '../types/pipeline';

export interface Objective {
  id: string;
  text: string;
  type: 'node_exists' | 'edge_exists' | 'execution_completed';
  targetType?: NodeType;
  sourceType?: NodeType;
}

export interface Lesson {
  id: string;
  phase: number;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  initialState: {
    nodes: any[];
    edges: any[];
  };
  objectives: Objective[];
  hints: string[];
  sandboxData: {
    expectedInput?: string;
    mockResponse: any;
  };
}

export const PHASES = [
  { level: 1, title: 'Prompt Engineer', badge: 'Prompt Engineer', color: 'from-blue-500 to-cyan-500' },
  { level: 2, title: 'Web Miner', badge: 'Web Miner', color: 'from-green-500 to-emerald-500' },
  { level: 3, title: 'Tool Builder', badge: 'Tool Builder', color: 'from-purple-500 to-indigo-500' },
  { level: 4, title: 'Flow Orchestrator', badge: 'Flow Orchestrator', color: 'from-amber-500 to-orange-500' },
  { level: 5, title: 'Agentic Architect', badge: 'Self-Modifier', color: 'from-red-500 to-rose-500' },
];

export const LESSONS: Lesson[] = [
  {
    id: 'lesson-1-hello-agent',
    phase: 1,
    title: 'Hello Agentic Chat',
    description: 'Create your first basic chat completion pipeline using a Provider and a Chat node connected to an Observer.',
    difficulty: 'Beginner',
    initialState: {
      nodes: [
        {
          id: 'provider-1',
          type: 'provider',
          position: { x: 50, y: 150 },
          data: {
            label: 'Demo Provider',
            type: 'provider',
            config: { label: 'Demo Provider', endpoint: 'sandbox', model: 'mock-gpt-4o', apiKey: 'demo-key' }
          }
        }
      ],
      edges: []
    },
    objectives: [
      { id: 'has-chat', text: 'Add a Chat Node to the canvas.', type: 'node_exists', targetType: 'chat' },
      { id: 'has-observer', text: 'Add an Observer Node to the canvas.', type: 'node_exists', targetType: 'observer' },
      { id: 'connect-chat', text: 'Connect Provider -> Chat -> Observer.', type: 'edge_exists', sourceType: 'chat', targetType: 'observer' },
      { id: 'run-success', text: 'Click Play/Run to execute the pipeline.', type: 'execution_completed' }
    ],
    hints: [
      'Switch to the "Nodes" sidebar tab, drag a "Chat" node and an "Observer" node onto the canvas.',
      'Connect the right handle of the Provider to the left handle of Chat, and Chat right to Observer left.',
      'Click the "Run Pipeline" play button in the toolbar.'
    ],
    sandboxData: {
      expectedInput: 'Hello',
      mockResponse: {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello! I am a simulated LLM agent running in sandbox mode. Your prompting pipeline is fully operational!'
            }
          }
        ]
      }
    }
  },
  {
    id: 'lesson-2-search-augment',
    phase: 2,
    title: 'Search-Augmented QA',
    description: 'Unlock Search. Connect a Search node upstream of a Chat node to feed live facts into the prompt context.',
    difficulty: 'Intermediate',
    initialState: {
      nodes: [
        {
          id: 'provider-1',
          type: 'provider',
          position: { x: 50, y: 200 },
          data: {
            label: 'Demo Provider',
            type: 'provider',
            config: { label: 'Demo Provider', endpoint: 'sandbox', model: 'mock-gpt-4o', apiKey: 'demo-key' }
          }
        },
        {
          id: 'chat-1',
          type: 'chat',
          position: { x: 300, y: 200 },
          data: {
            label: 'Chat Node',
            type: 'chat',
            config: { label: 'Chat Node', systemPrompt: 'Answer the user query based on the search context.', messages: [{ role: 'user', content: 'What is the capital of Mars?' }] }
          }
        },
        {
          id: 'observer-1',
          type: 'observer',
          position: { x: 550, y: 200 },
          data: {
            label: 'Observer',
            type: 'observer',
            config: { label: 'Observer', captured: [] }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'provider-1', target: 'chat-1' },
        { id: 'e2', source: 'chat-1', target: 'observer-1' }
      ]
    },
    objectives: [
      { id: 'has-search', text: 'Add a Search Node to the canvas.', type: 'node_exists', targetType: 'search' },
      { id: 'connect-search', text: 'Connect Search Node to Chat Node.', type: 'edge_exists', sourceType: 'search', targetType: 'chat' },
      { id: 'run-success', text: 'Click Play to perform search and chat inference.', type: 'execution_completed' }
    ],
    hints: [
      'Unlock Web Miner nodes: Drag the new "Search" node onto the canvas.',
      'Connect Search Node to Chat Node so that the search results can be loaded dynamically into the Chat node context.',
      'Provide a search query in the search node config (e.g. "Mars capital") and press Run.'
    ],
    sandboxData: {
      expectedInput: 'capital of Mars',
      mockResponse: {
        search_results: [
          { title: 'Capital of Mars', snippet: 'Olympus Mons Dome is historically labeled as the mock capital of Mars in standard sandbox simulation databases.' }
        ],
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Based on the search results, the capital of Mars in the simulation is Olympus Mons Dome.'
            }
          }
        ]
      }
    }
  },
  {
    id: 'lesson-3-mcp-tools',
    phase: 3,
    title: 'Model Context Protocol (MCP)',
    description: 'Unlock MCP. Discover and call standard tool APIs dynamically with your Chat node acting as a controller.',
    difficulty: 'Intermediate',
    initialState: {
      nodes: [
        {
          id: 'provider-1',
          type: 'provider',
          position: { x: 50, y: 200 },
          data: {
            label: 'Demo Provider',
            type: 'provider',
            config: { label: 'Demo Provider', endpoint: 'sandbox', model: 'mock-gpt-4o', apiKey: 'demo-key' }
          }
        },
        {
          id: 'chat-1',
          type: 'chat',
          position: { x: 300, y: 100 },
          data: {
            label: 'Chat Node',
            type: 'chat',
            config: { label: 'Chat Node', systemPrompt: 'Call tool when asked', messages: [{ role: 'user', content: 'Get current system status' }] }
          }
        },
        {
          id: 'observer-1',
          type: 'observer',
          position: { x: 580, y: 200 },
          data: {
            label: 'Observer',
            type: 'observer',
            config: { label: 'Observer', captured: [] }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'provider-1', target: 'chat-1' },
        { id: 'e2', source: 'chat-1', target: 'observer-1' }
      ]
    },
    objectives: [
      { id: 'has-mcp', text: 'Add an MCP Node to the canvas.', type: 'node_exists', targetType: 'mcp' },
      { id: 'connect-mcp', text: 'Connect Chat Node to MCP Node.', type: 'edge_exists', sourceType: 'chat', targetType: 'mcp' },
      { id: 'run-success', text: 'Run the tool-calling workflow.', type: 'execution_completed' }
    ],
    hints: [
      'MCP tool nodes let LLMs make structured API calls. Connect the Chat Node to the MCP node.',
      'Configure the MCP server to point to a sandbox tool registry or local server, then run.'
    ],
    sandboxData: {
      expectedInput: 'mcp',
      mockResponse: {
        tool: 'get_system_status',
        arguments: {},
        result: { status: 'healthy', cpu_load: '12%', active_connections: 4 }
      }
    }
  },
  {
    id: 'lesson-4-browser-scraping',
    phase: 4,
    title: 'Agentic Browser Automation',
    description: 'Unlock Browser. Automate navigating to websites, extracting selectors, and parsing DOM segments.',
    difficulty: 'Advanced',
    initialState: {
      nodes: [
        {
          id: 'provider-1',
          type: 'provider',
          position: { x: 50, y: 250 },
          data: {
            label: 'Demo Provider',
            type: 'provider',
            config: { label: 'Demo Provider', endpoint: 'sandbox', model: 'mock-gpt-4o', apiKey: 'demo-key' }
          }
        },
        {
          id: 'browser-1',
          type: 'browser',
          position: { x: 250, y: 150 },
          data: {
            label: 'Browser Node',
            type: 'browser',
            config: { label: 'Browser Node', url: 'https://news.ycombinator.com', action: 'fetch' }
          }
        },
        {
          id: 'chat-1',
          type: 'chat',
          position: { x: 450, y: 200 },
          data: {
            label: 'Scraper Chat',
            type: 'chat',
            config: { label: 'Scraper Chat', systemPrompt: 'Summarize news content' }
          }
        },
        {
          id: 'observer-1',
          type: 'observer',
          position: { x: 700, y: 200 },
          data: {
            label: 'Observer',
            type: 'observer',
            config: { label: 'Observer', captured: [] }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'provider-1', target: 'chat-1' },
        { id: 'e2', source: 'browser-1', target: 'chat-1' },
        { id: 'e3', source: 'chat-1', target: 'observer-1' }
      ]
    },
    objectives: [
      { id: 'has-browser', text: 'Confirm Browser node exists.', type: 'node_exists', targetType: 'browser' },
      { id: 'connect-browser-chat', text: 'Connect Browser output to Chat Node.', type: 'edge_exists', sourceType: 'browser', targetType: 'chat' },
      { id: 'run-success', text: 'Perform a successful scrap-and-summarize play.', type: 'execution_completed' }
    ],
    hints: [
      'Connect the Browser node to the Chat Node so the scraped text is injected into the model input messages.',
      'Hit Run to see page text fetched and fed directly into the model context.'
    ],
    sandboxData: {
      expectedInput: 'news.ycombinator.com',
      mockResponse: {
        scraped_content: 'Hacker News - Show HN: React Flow v11 released. Show HN: FastAPI speed improvements. Ask HN: Best LLM framework?',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'The front page of Hacker News features announcements about React Flow v11, FastAPI speedups, and a thread asking for the best LLM framework.'
            }
          }
        ]
      }
    }
  },
  {
    id: 'lesson-5-self-modifier',
    phase: 5,
    title: 'Self-Modifying System Node',
    description: 'Unlock Registry. Set up tool storage and registry lookup hooks allowing the agent to write its own new tool definitions.',
    difficulty: 'Advanced',
    initialState: {
      nodes: [
        {
          id: 'provider-1',
          type: 'provider',
          position: { x: 50, y: 250 },
          data: {
            label: 'Demo Provider',
            type: 'provider',
            config: { label: 'Demo Provider', endpoint: 'sandbox', model: 'mock-gpt-4o', apiKey: 'demo-key' }
          }
        },
        {
          id: 'registry-1',
          type: 'registry',
          position: { x: 250, y: 100 },
          data: {
            label: 'Local Registry',
            type: 'registry',
            config: { label: 'Local Registry', meta: { name: 'Active Registry' } }
          }
        },
        {
          id: 'chat-1',
          type: 'chat',
          position: { x: 450, y: 200 },
          data: {
            label: 'Meta LLM Agent',
            type: 'chat',
            config: { label: 'Meta LLM Agent', systemPrompt: 'Generate python tool implementations and register them.' }
          }
        },
        {
          id: 'observer-1',
          type: 'observer',
          position: { x: 700, y: 200 },
          data: {
            label: 'Observer',
            type: 'observer',
            config: { label: 'Observer', captured: [] }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'provider-1', target: 'chat-1' },
        { id: 'e2', source: 'registry-1', target: 'chat-1' },
        { id: 'e3', source: 'chat-1', target: 'observer-1' }
      ]
    },
    objectives: [
      { id: 'has-registry', text: 'Confirm Registry node exists.', type: 'node_exists', targetType: 'registry' },
      { id: 'connect-registry', text: 'Connect Registry to Chat.', type: 'edge_exists', sourceType: 'registry', targetType: 'chat' },
      { id: 'run-success', text: 'Run pipeline to execute self-modification step.', type: 'execution_completed' }
    ],
    hints: [
      'Connect Registry to the Chat node to expose active registry tools as functions the agent can select and call.',
      'Execute the workflow to simulate registering a dynamic utility tool.'
    ],
    sandboxData: {
      expectedInput: 'modify',
      mockResponse: {
        registered_tool: 'calculator_utility',
        status: 'success',
        message: 'Agent successfully generated code for calculator_utility and registered it on the fly.'
      }
    }
  }
];
