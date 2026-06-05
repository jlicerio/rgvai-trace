export type NodeType = 'provider' | 'chat' | 'mcp' | 'observer' | 'browser' | 'search' | 'registry' | 'memory' | 'context' | 'thread' | 'skill';

export interface Position {
  x: number;
  y: number;
}

export interface ProviderConfig {
  label: string;
  endpoint: string;
  model: string;
  apiKey: string; // stored in browser localStorage only
}

export interface ChatConfig {
  label: string;
  systemPrompt: string;
  messages: ChatMessage[];
  temperature: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface MCPConfig {
  label: string;
  serverUrl: string;
  selectedTool: string;
  toolArgs: Record<string, unknown>;
  discoveredTools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ObserverConfig {
  label: string;
  captured: CaptureEntry[];
}

export interface CaptureEntry {
  step: number;
  nodeId: string;
  nodeType: NodeType;
  request: unknown;
  response: unknown;
  curlCommand: string;
  timestamp: string;
}

export interface SkillConfig {
  label: string;
  enabledSkills: string[];
}

export type NodeData = {
  label: string;
  type: NodeType;
  config: ProviderConfig | ChatConfig | MCPConfig | ObserverConfig | SkillConfig | Record<string, any>;
};

export interface PipelineNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

export interface PipelineGraph {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface ExecutionRequest {
  pipeline: PipelineGraph;
  providerId: string;
  stepIds: string[];
}

export type LanguageType = 'python' | 'node' | 'curl';

export interface ExecutionStepResult {
  stepId: string;
  nodeType: NodeType;
  curl: string;
  request: unknown;
  response: unknown;
  error?: string;
}
