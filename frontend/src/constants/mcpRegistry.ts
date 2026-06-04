export interface MCPRegistryEntry {
  name: string;
  description: string;
  defaultUrl: string;
  category: 'browser' | 'filesystem' | 'search' | 'developer' | 'data' | 'communication' | 'custom';
  docsUrl?: string;
}

export const MCP_REGISTRY: MCPRegistryEntry[] = [
  {
    name: 'Custom URL',
    description: 'Enter any MCP server URL manually',
    defaultUrl: '',
    category: 'custom',
  },
  {
    name: 'Playwright (Browser)',
    description: 'Browser automation — navigate, click, screenshot, extract text. Microsoft\'s official MCP server.',
    defaultUrl: 'http://localhost:8931',
    category: 'browser',
    docsUrl: 'https://github.com/microsoft/playwright-mcp',
  },
  {
    name: 'Filesystem',
    description: 'Safe file read/write/search operations on local workspaces.',
    defaultUrl: 'http://localhost:8932',
    category: 'filesystem',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
  },
  {
    name: 'GitHub',
    description: 'Manage issues, PRs, repos, and search code on GitHub.',
    defaultUrl: 'http://localhost:8933',
    category: 'developer',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
  },
  {
    name: 'Brave Search',
    description: 'Web and local search via Brave Search API.',
    defaultUrl: 'http://localhost:8934',
    category: 'search',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
  },
  {
    name: 'SQLite',
    description: 'Query, read, and explore SQLite databases.',
    defaultUrl: 'http://localhost:8935',
    category: 'data',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
  },
  {
    name: 'Puppeteer',
    description: 'Browser automation using Puppeteer (headless Chrome).',
    defaultUrl: 'http://localhost:8936',
    category: 'browser',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
  },
  {
    name: 'Memory',
    description: 'Persistent knowledge graph memory for conversations.',
    defaultUrl: 'http://localhost:8937',
    category: 'data',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
  },
  {
    name: 'Time',
    description: 'Get current time and timezone information for any location.',
    defaultUrl: 'http://localhost:8938',
    category: 'data',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
  },
  {
    name: 'Docker',
    description: 'Manage containers, images, and Docker operations.',
    defaultUrl: 'http://localhost:8939',
    category: 'developer',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
  },
];

export function getMCPByCategory(category: MCPRegistryEntry['category']): MCPRegistryEntry[] {
  return MCP_REGISTRY.filter(e => e.category === category);
}

export function getMCPCategories(): { value: MCPRegistryEntry['category']; label: string }[] {
  return [
    { value: 'browser', label: '🌐 Browser' },
    { value: 'filesystem', label: '📁 Filesystem' },
    { value: 'search', label: '🔍 Search' },
    { value: 'developer', label: '🛠 Developer' },
    { value: 'data', label: '🗄 Data' },
    { value: 'communication', label: '💬 Communication' },
    { value: 'custom', label: '⚙️ Custom' },
  ];
}
