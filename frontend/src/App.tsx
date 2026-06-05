import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Save,
  Trash2,
  Upload,
  Plus,
  MessageSquare,
  Wrench,
  Eye,
  Database,
  Grid3x3,
  LayoutPanelLeft,
  Globe,
  Search as SearchIcon,
  FileJson,
  Sun,
  Moon,
  GraduationCap,
  StepForward,
  PanelLeftClose,
  PanelRightClose,
  FileText,
  GitBranch,
  Terminal,
  Zap,
  Bot,
  Code2,
  Volume2,
  Cpu,
} from 'lucide-react';
import PipelineCanvas from './components/PipelineCanvas';
import PlayButton from './components/PlayButton';
import CodeExporter from './components/CodeExporter';
import ChatPanel from './components/ChatPanel';
import ProgressionSidebar from './components/ProgressionSidebar';
import A2UIVisualizer from './components/A2UIVisualizer';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useProgression } from './hooks/useProgression';
import { LESSONS, type Lesson } from './constants/lessons';
import AuthModal from './components/AuthModal';
import StepperModal from './components/StepperModal';
import LearnModal from './components/LearnModal';
import CodeSandboxWorkspace from './components/CodeSandboxWorkspace';
import type { ExecutionStepResult, NodeType } from './types/pipeline';
import type { ParsedMessage } from './components/ParsedChatOutput';
import { sanitizeForSpeech, extractChatText } from './utils/speechUtils';
import { useSpeechManager } from './hooks/useSpeechManager';

const SAVE_KEY = 'agentic-pipeline-graph';

const SIDEBAR_ITEMS: { type: NodeType; label: string; icon: React.ReactNode; order?: string }[] = [
  { type: 'provider', label: 'Provider', icon: <Database size={14} />, order: '1st' },
  { type: 'chat', label: 'Chat', icon: <MessageSquare size={14} />, order: '2nd' },
  { type: 'browser', label: 'Browser', icon: <Globe size={14} />, order: 'tool' },
  { type: 'search', label: 'Search', icon: <SearchIcon size={14} />, order: 'tool' },
  { type: 'memory', label: 'Memory', icon: <Database size={14} />, order: 'tool' },
  { type: 'context', label: 'Context', icon: <FileText size={14} />, order: 'prep' },
  { type: 'thread', label: 'Thread', icon: <GitBranch size={14} />, order: 'flow' },
  { type: 'skill', label: 'Env Skills', icon: <Terminal size={14} />, order: 'tool' },
  { type: 'subagent', label: 'Subagent', icon: <Bot size={14} />, order: 'tool' },
  { type: 'tts', label: 'TTS', icon: <Volume2 size={14} />, order: 'last' },
  { type: 'local_model', label: 'Local Model', icon: <Cpu size={14} />, order: 'tool' },
  { type: 'code_sandbox', label: 'Code', icon: <Code2 size={14} />, order: 'tool' },
  { type: 'mcp', label: 'MCP', icon: <Wrench size={14} />, order: 'tool' },
  { type: 'registry', label: 'Registry', icon: <FileJson size={14} />, order: 'tool' },
  { type: 'observer', label: 'Observer', icon: <Eye size={14} />, order: 'last' },
];

function getDefaultData(type: NodeType) {
  switch (type) {
    case 'provider':
      return {
        label: 'Provider',
        type: 'provider',
        config: { label: 'Provider', endpoint: '', model: '', apiKey: '' },
      };
    case 'chat':
      return {
        label: 'Chat',
        type: 'chat',
        config: {
          label: 'Chat',
          systemPrompt: '',
          messages: [],
          temperature: 0.7,
        },
      };
    case 'mcp':
      return {
        label: 'MCP',
        type: 'mcp',
        config: {
          label: 'MCP',
          serverUrl: '',
          selectedTool: '',
          toolArgs: {},
          discoveredTools: [],
        },
      };
    case 'observer':
      return {
        label: 'Observer',
        type: 'observer',
        config: { label: 'Observer', captured: [] },
      };
    case 'browser':
      return {
        label: 'Browser',
        type: 'browser',
        config: { label: 'Browser', url: '', action: 'fetch', renderJs: false, result: '', error: '' },
      };
    case 'search':
      return {
        label: 'Search',
        type: 'search',
        config: { label: 'Search', query: '', count: 5, results: [], error: '' },
      };
    case 'registry':
      return {
        label: 'Registry',
        type: 'registry',
        config: { label: 'Registry', meta: { name: 'Tool Registry', description: '' }, tools: [], fileDropped: false, error: '' },
      };
    case 'memory':
      return {
        label: 'Memory',
        type: 'memory',
        config: { label: 'Memory', action: 'retrieve', namespace: 'default', key: '', value: '', storedKey: '', retrievedValue: '', entries: [], error: '' },
      };
    case 'context':
      return {
        label: 'Context',
        type: 'context',
        config: { label: 'Context', content: '', enabled: true, position: 'prepend_system', error: '' },
      };
    case 'thread':
      return {
        label: 'Thread',
        type: 'thread',
        config: { label: 'Thread', mode: 'parallel', branches: [], error: '' },
      };
    case 'skill':
      return {
        label: 'Env Skills',
        type: 'skill',
        config: { label: 'Env Skills', enabledSkills: ['shell', 'git', 'docker', 'python', 'node', 'curl', 'ssh', 'make', 'jq', 'grep'] },
      };
    case 'subagent':
      return {
        label: 'Subagent',
        type: 'subagent',
        config: {
          label: 'Subagent',
          roleName: 'Code Writer',
          customRole: null,
          task: '',
          temperature: 0.7,
        },
      };
    case 'code_sandbox':
      return {
        label: 'Code',
        type: 'code_sandbox',
        config: {
          label: 'Code',
          language: 'python',
          activeFile: 'main.py',
          files: {
            'main.py': '# Write Python code here\nprint("Hello, Trace!")',
          },
        },
      };
    case 'tts':
      return {
        label: 'TTS',
        type: 'tts',
        config: {
          label: 'TTS',
          text: '',
          enabled: true,
          engine: 'webspeech',
          voice: 'default',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          autoSpeak: true,
          speakerId: 0,
          edgeVoice: 'en-US-AriaNeural',
          edgeRate: 0,
          edgePitch: 0,
        },
      };
    case 'local_model':
      return {
        label: 'Local Model',
        type: 'local_model',
        config: {
          label: 'Local Model',
          modelId: '',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 2048,
          prompt: '',
        },
      };
  }
}

function AppInner() {
  const reactFlowInstance = useReactFlow();
  const [initialized, setInitialized] = useState(false);

  // Hook into Phased progression state
  const {
    currentPhase,
    completedLessons,
    activeLesson,
    objectivesStatus,
    earnedBadges,
    unlockedNodes,
    checkObjectives,
    startLesson,
    resetProgression,
  } = useProgression();

  // Shared speech manager for TTS auto-play
  const { speak: ttsSpeak } = useSpeechManager();

  // Load persisted graph
  const [savedGraph, setSavedGraph] = useLocalStorage<{
    nodes: Node[];
    edges: Edge[];
  } | null>(SAVE_KEY, null);

  const initialNodes: Node[] = savedGraph?.nodes ?? [];
  const initialEdges: Edge[] = savedGraph?.edges ?? [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [lastCurl, setLastCurl] = useState<string>('');
  const [results, setResults] = useState<ExecutionStepResult[]>([]);
  const [execError, setExecError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'nodes' | 'chat'>('chat');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [gamificationEnabled, setGamificationEnabled] = useState(true);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);

  // Stepper state
  const [stepperActive, setStepperActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepResults, setStepResults] = useState<ExecutionStepResult[]>([]);
  const [stepperOpen, setStepperOpen] = useState(false);
  const [stepperLoading, setStepperLoading] = useState(false);
  const stepOrderRef = useRef<string[]>([]);
  const [showLearn, setShowLearn] = useState(false);
  const [activeCodeSandboxId, setActiveCodeSandboxId] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        if (u) setUser(u);
        else setAuthOpen(true);
      })
      .catch(() => setAuthOpen(true));
  }, []);

  // Sync theme to document — light mode default by request
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  const handleAuth = useCallback(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(u => u && setUser(u));
  }, []);

  // Auto-save to localStorage on changes & run objectives checker
  const prevSavedRef = useRef<string>('');
  useEffect(() => {
    const graph = JSON.stringify({ nodes, edges });
    if (graph !== prevSavedRef.current) {
      prevSavedRef.current = graph;
      setSavedGraph({ nodes, edges });
    }
    // Verify node topology objectives on active lesson
    checkObjectives(nodes, edges, false);
  }, [nodes, edges, setSavedGraph, checkObjectives]);

  // Load template nodes from active lesson
  const handleLoadInitialState = useCallback((lesson: Lesson) => {
    setNodes(lesson.initialState.nodes);
    setEdges(lesson.initialState.edges);
    setResults([]);
    setLastCurl('');
    setExecError(null);
  }, [setNodes, setEdges]);

  // Handle edge connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  // Handle pipeline execution
  const handleExecute = useCallback(async () => {
    // If stepper mode is active, delegate to step-through execution
    if (stepperActive) {
      await handleStepperExecute();
      return;
    }

    setExecuting(true);
    setExecError(null);
    setLastCurl('');
    setResults([]);

    try {
      const providerNode = nodes.find((n) => n.data?.type === 'provider');
      if (!providerNode) {
        setExecError('Pipeline must have a Provider node');
        setExecuting(false);
        return;
      }

      // Topological sort
      const adj = new Map<string, string[]>();
      const inDeg = new Map<string, number>();
      for (const n of nodes) {
        adj.set(n.id, []);
        inDeg.set(n.id, 0);
      }
      for (const e of edges) {
        const t = adj.get(e.source);
        if (t) t.push(e.target);
        inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
      }

      const q: string[] = [];
      for (const [id, d] of inDeg) {
        if (d === 0) q.push(id);
      }
      const sorted: string[] = [];
      while (q.length > 0) {
        const id = q.shift()!;
        sorted.push(id);
        for (const nb of adj.get(id) || []) {
          const nd = (inDeg.get(nb) || 1) - 1;
          inDeg.set(nb, nd);
          if (nd === 0) q.push(nb);
        }
      }

      const stepIds = sorted.filter((id) => id !== providerNode.id);
      const providerConfig = (providerNode.data as any).config || {};
      let data: ExecutionStepResult[] = [];

      // Intercept execution if using "sandbox" mode endpoint
      if (providerConfig.endpoint === 'sandbox') {
        await new Promise((resolve) => setTimeout(resolve, 800)); // mock network delay
        data = stepIds.map((id) => {
          const node = nodes.find((n) => n.id === id)!;
          let response: any = {};

          if (node.type === 'chat') {
            response = activeLesson?.sandboxData?.mockResponse ?? { choices: [{ message: { role: 'assistant', content: 'Sandbox mock chat reply.' } }] };
          } else if (node.type === 'search') {
            response = activeLesson?.sandboxData?.mockResponse || {
              search_results: [
                { title: 'DuckDuckGo Search Result', snippet: 'Olympus Mons Dome weather capsule data found.' }
              ]
            };
          } else if (node.type === 'mcp') {
            response = activeLesson?.sandboxData?.mockResponse || { status: 'success', value: 'System is online.' };
          } else if (node.type === 'browser') {
            response = activeLesson?.sandboxData?.mockResponse || { status: 'success', value: 'Headless browser text captured.' };
          } else if (node.type === 'registry') {
            response = activeLesson?.sandboxData?.mockResponse || { status: 'success', value: 'Calculators loaded.' };
          } else if (node.type === 'memory') {
            response = activeLesson?.sandboxData?.mockResponse || { status: 'success', action: 'retrieve', key: 'demo_key', value: 'Demo memory value', entries: [] };
          } else if (node.type === 'context') {
            response = activeLesson?.sandboxData?.mockResponse || { status: 'success', content: 'Injected context content.', position: 'prepend_system' };
          } else if (node.type === 'thread') {
            response = activeLesson?.sandboxData?.mockResponse || { status: 'success', mode: 'parallel', branchResults: [{ branchId: 'b1', result: 'Branch 1 complete' }] };
          } else if (node.type === 'skill') {
            response = activeLesson?.sandboxData?.mockResponse || { status: 'success', enabledSkills: ['shell', 'git', 'docker', 'python', 'node', 'curl', 'ssh', 'make', 'jq', 'grep'], count: 10 };
          } else if (node.type === 'subagent') {
            response = activeLesson?.sandboxData?.mockResponse || { status: 'success', role: 'Code Writer', content: 'Subagent sandbox mock: task complete.', tool_calls_made: 2, skills_used: ['python', 'shell'] };
          } else if (node.type === 'code_sandbox') {
            response = { status: 'workspace_ready', language: 'python', fileCount: 1, activeFile: 'main.py', note: 'Code execution happens in-browser via Pyodide WASM.' };
          } else if (node.type === 'tts') {
            const chatUpstream = nodes.find((n) =>
              edges.some((e) => e.source === n.id && e.target === node.id && n.data?.type === 'chat')
            );
            const chatText = chatUpstream
              ? (chatUpstream.data as any)?.config?.messages?.slice(-1)?.[0]?.content || 'Speech response'
              : (node.data as any)?.config?.text || 'Hello from TTS';
            response = { status: 'speech_ready', text: chatText, voice: 'default', rate: 1.0, pitch: 1.0, note: 'Speech synthesis runs in-browser.' };
          } else if (node.type === 'local_model') {
            response = { status: 'model_configured', modelId: (node.data as any)?.config?.modelId || 'Qwen2.5-0.5B', note: 'Model runs in-browser via WebLLM.' };
          } else {
            response = { status: 'success' };
          }

          return {
            stepId: id,
            nodeType: node.type as NodeType,
            curl: `curl -s 'http://sandbox-api/execute/${node.type}' -d '${JSON.stringify(node.data.config)}'`,
            request: node.data.config,
            response,
          };
        });
      } else {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pipeline: { nodes, edges },
            providerId: providerNode.id,
            stepIds,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          throw new Error(`Execution failed (${res.status}): ${errText}`);
        }

        const body = await res.json();
        data = body.results || [];
      }

      setResults(data);

      // Auto-speak: find TTS nodes with autoSpeak enabled and speak the response
      const ttsNodes = nodes.filter((n) => n.data?.type === 'tts');
      for (const ttsNode of ttsNodes) {
        const ttsConfig = (ttsNode.data as any)?.config || {};
        if (ttsConfig.autoSpeak === false) continue;
        if (ttsConfig.engine === 'webgpu') continue; // WebGPU TTS needs model loaded in component
        const nodeData = data.find((r) => r.stepId === ttsNode.id);
        if (!nodeData) continue;
        const rawText = extractChatText(data, ttsNode.id) || ttsConfig.text || '';
        if (!rawText) continue;
        const cleanText = sanitizeForSpeech(rawText);
        ttsSpeak(cleanText, ttsConfig.rate || 1.0, ttsConfig.pitch || 1.0, ttsConfig.voice);
      }

      // Populate observer nodes with captured data
      if (data.length > 0) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.data?.type !== 'observer') return n;
            const captured = data.map((r) => ({
              step: stepIds.indexOf(r.stepId) + 1,
              nodeId: r.stepId,
              nodeType: r.nodeType,
              request: r.request,
              response: r.response,
              curlCommand: r.curl || '',
              timestamp: new Date().toISOString(),
            }));
            return {
              ...n,
              data: {
                ...n.data,
                config: {
                  ...n.data.config,
                  captured,
                },
              },
            };
          })
        );
      }

      // Trigger completion checks with execution complete flags
      checkObjectives(nodes, edges, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExecError(msg);
    } finally {
      setExecuting(false);
    }
  }, [nodes, edges, setNodes, activeLesson, checkObjectives, stepperActive]);

  // ── Step-through execution helpers ──

  const executeSingleStep = useCallback(
    async (stepIds: string[], index: number, providerNode: Node): Promise<ExecutionStepResult | null> => {
      if (index >= stepIds.length) return null;

      const stepId = stepIds[index];
      const node = nodes.find((n) => n.id === stepId);
      if (!node) return null;

      const providerConfig = (providerNode.data as any).config || {};

      // Sandbox mode → mock response per step
      if (providerConfig.endpoint === 'sandbox') {
        await new Promise((resolve) => setTimeout(resolve, 400));
        let response: any = {};
        const nodeType = node.type as NodeType;

        if (nodeType === 'chat') {
          response =
            activeLesson?.sandboxData?.mockResponse ?? {
              choices: [
                { message: { role: 'assistant', content: 'Sandbox mock chat reply.' } },
              ],
            };
        } else if (nodeType === 'search') {
          response = activeLesson?.sandboxData?.mockResponse || {
            search_results: [
              { title: 'DuckDuckGo Search Result', snippet: 'Olympus Mons Dome weather capsule data found.' },
            ],
          };
        } else if (nodeType === 'mcp') {
          response = activeLesson?.sandboxData?.mockResponse || {
            status: 'success',
            value: 'System is online.',
          };
        } else if (nodeType === 'browser') {
          response = activeLesson?.sandboxData?.mockResponse || {
            status: 'success',
            value: 'Headless browser text captured.',
          };
        } else if (nodeType === 'registry') {
          response = activeLesson?.sandboxData?.mockResponse || {
            status: 'success',
            value: 'Calculators loaded.',
          };
        } else if (nodeType === 'memory') {
          response = activeLesson?.sandboxData?.mockResponse || {
            status: 'success',
            action: 'retrieve',
            key: 'demo_key',
            value: 'Demo memory value',
            entries: [],
          };
        } else if (nodeType === 'context') {
          response = activeLesson?.sandboxData?.mockResponse || {
            status: 'success',
            content: 'Injected context content.',
            position: 'prepend_system',
          };
        } else if (nodeType === 'thread') {
          response = activeLesson?.sandboxData?.mockResponse || {
            status: 'success',
            mode: 'parallel',
            branchResults: [{ branchId: 'b1', result: 'Branch 1 complete' }],
          };
        } else if (nodeType === 'skill') {
          response = activeLesson?.sandboxData?.mockResponse || { status: 'success', enabledSkills: ['shell', 'git', 'docker', 'python', 'node', 'curl', 'ssh', 'make', 'jq', 'grep'], count: 10 };
        } else if (nodeType === 'subagent') {
          response = activeLesson?.sandboxData?.mockResponse || { status: 'success', role: 'Code Writer', content: 'Subagent sandbox mock: task complete.', tool_calls_made: 2, skills_used: ['python', 'shell'] };
        } else if (nodeType === 'code_sandbox') {
          response = { status: 'workspace_ready', language: 'python', fileCount: 1, activeFile: 'main.py', note: 'Code execution happens in-browser via Pyodide WASM.' };
        } else {
          response = { status: 'success' };
        }

        return {
          stepId,
          nodeType: nodeType as NodeType,
          curl: `curl -s 'http://sandbox-api/execute/${nodeType}' -d '${JSON.stringify(node.data.config)}'`,
          request: node.data.config,
          response,
        };
      }

      // Real backend → POST /api/execute/step
      const res = await fetch('/api/execute/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline: { nodes, edges },
          providerId: providerNode.id,
          stepId,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Step execution failed (${res.status}): ${errText}`);
      }

      const body = await res.json();
      return body.result || body;
    },
    [nodes, edges, activeLesson],
  );

  // Finish stepper: close modal, populate observers, set results
  const finishStepper = useCallback(
    (allResults: ExecutionStepResult[]) => {
      setStepperOpen(false);
      setResults(allResults);

      const lastStep = allResults[allResults.length - 1];
      if (lastStep?.curl) {
        setLastCurl(lastStep.curl);
      }

      // Populate observer nodes
      if (allResults.length > 0) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.data?.type !== 'observer') return n;
            const captured = allResults.map((r, i) => ({
              step: i + 1,
              nodeId: r.stepId,
              nodeType: r.nodeType,
              request: r.request,
              response: r.response,
              curlCommand: r.curl || '',
              timestamp: new Date().toISOString(),
            }));
            return {
              ...n,
              data: {
                ...n.data,
                config: {
                  ...(n.data.config as any),
                  captured,
                },
              },
            };
          }),
        );
      }

      checkObjectives(nodes, edges, true);
    },
    [setNodes, checkObjectives, nodes, edges],
  );

  // Execute the next step (called from Continue button)
  const handleStepContinue = useCallback(async () => {
    const nextIndex = currentStepIndex + 1;
    const stepIds = stepOrderRef.current;

    if (nextIndex >= stepIds.length) {
      // All steps done
      finishStepper(stepResults);
      return;
    }

    setStepperLoading(true);
    try {
      const providerNode = nodes.find((n) => n.data?.type === 'provider');
      if (!providerNode) {
        throw new Error('Provider node not found');
      }

      const result = await executeSingleStep(stepIds, nextIndex, providerNode);
      if (result) {
        const updated = [...stepResults, result];
        setStepResults(updated);
        setCurrentStepIndex(nextIndex);

        // If this was the last step, close and show all results
        if (nextIndex >= stepIds.length - 1) {
          finishStepper(updated);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExecError(msg);
      setStepperOpen(false);
    } finally {
      setStepperLoading(false);
    }
  }, [currentStepIndex, stepResults, nodes, executeSingleStep, finishStepper]);

  // Abort stepper (called from Abort button)
  const handleStepAbort = useCallback(() => {
    setStepperOpen(false);
    if (stepResults.length > 0) {
      setResults(stepResults);
      const lastStep = stepResults[stepResults.length - 1];
      if (lastStep?.curl) setLastCurl(lastStep.curl);
    }
  }, [stepResults]);

  // Start stepper execution from the beginning (called when Run is clicked in stepper mode)
  const handleStepperExecute = useCallback(async () => {
    setExecuting(true);
    setExecError(null);
    setLastCurl('');
    setResults([]);
    setStepResults([]);
    setStepperOpen(false);

    try {
      const providerNode = nodes.find((n) => n.data?.type === 'provider');
      if (!providerNode) {
        setExecError('Pipeline must have a Provider node');
        setExecuting(false);
        return;
      }

      // Topological sort
      const adj = new Map<string, string[]>();
      const inDeg = new Map<string, number>();
      for (const n of nodes) {
        adj.set(n.id, []);
        inDeg.set(n.id, 0);
      }
      for (const e of edges) {
        const t = adj.get(e.source);
        if (t) t.push(e.target);
        inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
      }

      const q: string[] = [];
      for (const [id, d] of inDeg) {
        if (d === 0) q.push(id);
      }
      const sorted: string[] = [];
      while (q.length > 0) {
        const id = q.shift()!;
        sorted.push(id);
        for (const nb of adj.get(id) || []) {
          const nd = (inDeg.get(nb) || 1) - 1;
          inDeg.set(nb, nd);
          if (nd === 0) q.push(nb);
        }
      }

      const stepIds = sorted.filter((id) => id !== providerNode.id);
      if (stepIds.length === 0) {
        setExecError('No executable nodes to step through');
        setExecuting(false);
        return;
      }

      stepOrderRef.current = stepIds;

      // Execute the first step
      const result = await executeSingleStep(stepIds, 0, providerNode);
      if (result) {
        setStepResults([result]);
        setCurrentStepIndex(0);
        setStepperOpen(true);

        // If there's only one step, close the modal and finish immediately
        if (stepIds.length === 1) {
          finishStepper([result]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExecError(msg);
    } finally {
      setExecuting(false);
    }
  }, [nodes, edges, executeSingleStep, finishStepper]);

  // Chat panel execution: inject user message into first chat node and run
  const handleChatExecute = useCallback(
    async (userMessage: string): Promise<ParsedMessage[]> => {
      const chatNode = nodes.find((n) => n.data?.type === 'chat');
      if (!chatNode) {
        return [{ id: 'err-nochat', role: 'system', content: 'Add a Chat node to the canvas first.' }];
      }

      const providerNode = nodes.find((n) => n.data?.type === 'provider');
      if (!providerNode) {
        return [{ id: 'err-noprovider', role: 'system', content: 'Add a Provider node connected to the Chat node.' }];
      }

      const providerConfig = (providerNode.data as any).config || {};
      const endpoint = (providerConfig.endpoint || '').replace(/\/+$/, '');
      const model = providerConfig.model || 'gpt-4o';
      const apiKey = providerConfig.apiKey || '';

      // Direct browser-side execution for local endpoints (workshops)
      const isLocalEndpoint = endpoint.includes('localhost') || endpoint.includes('127.0.0.1') || endpoint.includes('0.0.0.0');
      if (isLocalEndpoint) {
        const chatConfig = (chatNode.data as any).config || {};
        const systemPrompt = chatConfig.systemPrompt || '';
        const messages: { role: string; content: string }[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: userMessage });

        // Scan for Browser/Search nodes and add them as callable tools
        const hasBrowser = nodes.some(n => (n.data as any)?.type === 'browser');
        const hasSearch = nodes.some(n => (n.data as any)?.type === 'search');
        const tools: any[] = [];
        if (hasBrowser) {
          tools.push({
            type: 'function',
            function: {
              name: 'browser_fetch',
              description: 'Fetch a web page and extract its text content. Use this to read web pages, documentation, or any online content.',
              parameters: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'The full URL to fetch' },
                  render_js: { type: 'boolean', description: 'Render JavaScript', default: false },
                },
                required: ['url'],
              },
            },
          });
        }
        if (hasSearch) {
          tools.push({
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web using DuckDuckGo. Get current information on any topic.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'The search query string' },
                  count: { type: 'integer', description: 'Number of results to return (1-20)', default: 5 },
                },
                required: ['query'],
              },
            },
          });
        }

        const body: Record<string, any> = { model, messages, temperature: chatConfig.temperature ?? 0.7 };
        if (tools.length > 0) body.tools = tools;
        const url = `${endpoint}/chat/completions`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey && !endpoint.includes('localhost')) headers['Authorization'] = `Bearer ${apiKey}`;

        try {
          const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
          if (!res.ok) {
            const text = await res.text().catch(() => res.statusText);
            throw new Error(`LLM call failed (${res.status}): ${text}`);
          }
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content || JSON.stringify(data);
          const toolCalls = data?.choices?.[0]?.message?.tool_calls;

          // Handle tool-calling loop for local endpoint
          let finalContent = content;
          if (toolCalls && toolCalls.length > 0) {
            // Make tool calls locally and send results back to LLM
            for (const tc of toolCalls) {
              const funcName = tc.function?.name || '';
              let args: any = {};
              try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}
              let toolResult = '';
              if (funcName === 'browser_fetch' && args.url) {
                try {
                  const r = await fetch('/api/browser/fetch', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: args.url, render_js: args.render_js || false }),
                  });
                  toolResult = JSON.stringify(await r.json());
                } catch (e: any) { toolResult = JSON.stringify({ error: String(e) }); }
              } else if (funcName === 'web_search' && args.query) {
                try {
                  const r = await fetch('/api/search', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: args.query, count: args.count || 5 }),
                  });
                  toolResult = JSON.stringify(await r.json());
                } catch (e: any) { toolResult = JSON.stringify({ error: String(e) }); }
              } else {
                toolResult = JSON.stringify({ error: `Unknown tool or missing arguments: ${funcName}` });
              }
              body.messages.push({
                role: 'assistant',
                content: null,
                tool_calls: [{ id: tc.id, type: 'function', function: { name: funcName, arguments: tc.function?.arguments } }],
              });
              body.messages.push({ role: 'tool', tool_call_id: tc.id, content: toolResult });
            }
            // Re-call LLM with tool results
            const res2 = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
            if (res2.ok) {
              const data2 = await res2.json();
              finalContent = data2?.choices?.[0]?.message?.content || JSON.stringify(data2);
            }
          }

          // Build curl display
          const curlLine = `curl -s '${url}' -H 'Content-Type: application/json' -d '${JSON.stringify(body)}'`;

          return [{
            id: `chat-${Date.now()}`,
            role: 'assistant',
            content: finalContent,
            toolCalls: toolCalls?.map((tc: any) => ({
              name: tc.function?.name || tc.name,
              arguments: JSON.parse(tc.function?.arguments || '{}'),
            })),
          }];
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return [{ id: `err-${Date.now()}`, role: 'system', content: msg }];
        }
      }

      // Backend-based execution (tailnet / hosted mode)
      const updatedNodes = nodes.map((n) => {
        if (n.id !== chatNode.id) return n;
        const config = { ...(n.data.config as any) };
        const messages = [...(config.messages || [])];
        messages.push({ role: 'user', content: userMessage });
        return { ...n, data: { ...n.data, config: { ...config, messages } } };
      });

      // Run execution with updated nodes
      if (!providerNode) {
        return [{ id: 'err-noprovider', role: 'system', content: 'Add a Provider node connected to the Chat node.' }];
      }

      // Kahn topological sort
      const adj = new Map<string, string[]>();
      const inDeg = new Map<string, number>();
      for (const n of updatedNodes) {
        adj.set(n.id, []);
        inDeg.set(n.id, 0);
      }
      for (const e of edges) {
        const t = adj.get(e.source);
        if (t) t.push(e.target);
        inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
      }
      const q: string[] = [];
      for (const [id, d] of inDeg) {
        if (d === 0) q.push(id);
      }
      const sorted: string[] = [];
      while (q.length > 0) {
        const id = q.shift()!;
        sorted.push(id);
        for (const nb of adj.get(id) || []) {
          const nd = (inDeg.get(nb) || 1) - 1;
          inDeg.set(nb, nd);
          if (nd === 0) q.push(nb);
        }
      }

      const stepIds = sorted.filter((id) => id !== providerNode.id);

      try {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pipeline: { nodes: updatedNodes, edges },
            providerId: providerNode.id,
            stepIds,
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          throw new Error(`Execution failed (${res.status}): ${errText}`);
        }
        const body = await res.json();
        const data: ExecutionStepResult[] = body.results || [];

        // Parse into chat-friendly messages
        const parsed: ParsedMessage[] = [];
        for (const step of data) {
          if (step.nodeType === 'chat') {
            const resp = step.response as Record<string, any> | undefined;
            const content = resp
              ? resp?.choices?.[0]?.message?.content || JSON.stringify(resp)
              : String(step.response || '');
            const toolCalls = (resp as any)?.choices?.[0]?.message?.tool_calls;
            parsed.push({
              id: `chat-${step.stepId}`,
              role: 'assistant',
              content,
              toolCalls: toolCalls?.map((tc: any) => ({
                name: tc.function?.name || tc.name,
                arguments: JSON.parse(tc.function?.arguments || '{}'),
              })),
            });
          } else if (step.nodeType === 'mcp') {
            parsed.push({
              id: `mcp-${step.stepId}`,
              role: 'tool',
              content: '',
              toolResults: [{
                tool: (step.request as any)?.tool || 'mcp',
                result: typeof step.response === 'object' ? JSON.stringify(step.response, null, 2) : String(step.response || ''),
              }],
            });
          } else if (step.error) {
            parsed.push({
              id: `err-${step.stepId}`,
              role: 'system',
              content: `Error (${step.nodeType}): ${step.error}`,
            });
          }
        }
        return parsed;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return [{ id: `err-${Date.now()}`, role: 'system', content: msg }];
      }
    },
    [nodes, edges]
  );

  // Handle drag from sidebar
  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: NodeType) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        'application/reactflow'
      ) as NodeType | '';
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultData(type),
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.data?.type === 'code_sandbox') {
        setActiveCodeSandboxId(node.id);
      }
    },
    [setActiveCodeSandboxId]
  );

  // Clear canvas
  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setResults([]);
    setLastCurl('');
    setExecError(null);
    setStepperActive(false);
    setStepperOpen(false);
    setStepResults([]);
    setCurrentStepIndex(0);
    stepOrderRef.current = [];
  }, [setNodes, setEdges]);

  // Export graph as JSON file
  const handleSave = useCallback(() => {
    const graph = { nodes, edges };
    const blob = new Blob([JSON.stringify(graph, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  // Load graph from JSON file
  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.nodes && data.edges) {
            setNodes(data.nodes);
            setEdges(data.edges);
            setResults([]);
            setLastCurl('');
            setExecError(null);
          }
        } catch {
          alert('Invalid pipeline JSON file');
        }
      };
          reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges]);

  // Filter draggable sidebar items based on phase progression unlocks
  const filteredSidebarItems = SIDEBAR_ITEMS.filter((item) =>
    !gamificationEnabled || unlockedNodes.includes(item.type)
  );

  return (
    <div className="w-full h-screen bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-wider uppercase text-gray-300">
            Trace
          </h1>
          <span className="text-gray-700 text-xs">|</span>
          <span className="text-gray-400 text-xs font-semibold">Learn LLMs · Tools · MCP</span>
        </div>

        <div className="flex items-center gap-2">
          <PlayButton
            onClick={handleExecute}
            loading={executing}
            disabled={nodes.length === 0}
          />

          {/* Step Through toggle */}
          <button
            onClick={() => setStepperActive((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              stepperActive
                ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700 hover:bg-indigo-900/60'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-300'
            }`}
            title={
              stepperActive
                ? 'Step-through mode active — pipeline runs one node at a time'
                : 'Enable step-through mode to execute one node at a time'
            }
          >
            <StepForward size={14} />
            {stepperActive ? 'Step On' : 'Step Thru'}
          </button>

          {/* Gamification toggle */}
          <button
            onClick={() => setGamificationEnabled(g => !g)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              gamificationEnabled
                ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                : 'bg-yellow-900/20 text-yellow-600 border-yellow-800/40 hover:bg-yellow-900/30'
            }`}
            title={gamificationEnabled ? 'Free mode — all nodes unlocked, no progression' : 'Guided mode — phased lesson progression'}
          >
            {gamificationEnabled ? <GraduationCap size={14} /> : <Zap size={14} />}
            {gamificationEnabled ? 'Guided' : 'Free'}
          </button>

          <button
            onClick={() => setShowLearn(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700"
            title="Open node reference documentation"
          >
            <GraduationCap size={14} />
            Learn
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700"
            title="Download pipeline JSON"
          >
            <Save size={14} />
            Save
          </button>

          <button
            onClick={handleLoad}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700"
            title="Load pipeline from JSON"
          >
            <Upload size={14} />
            Load
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 text-red-400 hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700"
            title="Clear canvas"
          >
            <Trash2 size={14} />
            Clear
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Panel toggles */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeftClose size={14} />
          </button>
          <button
            onClick={() => setResultsOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700"
            title={resultsOpen ? 'Hide results' : 'Show results'}
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Phase Progression Sidebar — hidden in free mode */}
        {gamificationEnabled && sidebarOpen && (
          <ProgressionSidebar
          currentPhase={currentPhase}
          completedLessons={completedLessons}
          activeLesson={activeLesson}
          objectivesStatus={objectivesStatus}
          earnedBadges={earnedBadges}
          onStartLesson={startLesson}
          onResetProgression={resetProgression}
          onLoadInitialState={handleLoadInitialState}
        />
        )}

        {/* Left sidebar — tabbed: Nodes / Chat */}
        {sidebarOpen && (
        <aside className="w-56 bg-gray-900 border-r border-gray-800 shrink-0 flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setSidebarTab('nodes')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                sidebarTab === 'nodes'
                  ? 'text-gray-100 bg-gray-800 border-b-2 border-gray-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <Grid3x3 size={13} />
              Nodes
            </button>
            <button
              onClick={() => setSidebarTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                sidebarTab === 'chat'
                  ? 'text-gray-100 bg-gray-800 border-b-2 border-gray-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <MessageSquare size={13} />
              Chat
            </button>
          </div>

          {/* Tab content */}
          {sidebarTab === 'nodes' ? (
            <>
              <div className="px-3 py-2 border-b border-gray-800">
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                  Drag to canvas
                </span>
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {filteredSidebarItems.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm cursor-grab active:cursor-grabbing hover:bg-gray-700 hover:border-gray-600 transition-all select-none"
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.order && (
                      <span className={`ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        item.order === '1st' ? 'bg-gray-700 text-gray-300' :
                        item.order === '2nd' ? 'bg-gray-700 text-gray-300' :
                        item.order === 'last' ? 'bg-gray-700 text-gray-300' :
                        item.order === 'prep' ? 'bg-gray-700 text-gray-300' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {item.order}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-800 text-gray-600 text-xs space-y-1">
                <p>Drag nodes onto canvas, connect <span className="text-gray-500">●</span> → <span className="text-gray-300">○</span></p>
                <p>Context before Chat injects background info into prompts</p>
                <p>Data flows top (input) → bottom (output)</p>
                <p>Backspace to delete</p>
              </div>
            </>
          ) : (
            <ChatPanel
              nodes={nodes}
              edges={edges}
              onExecute={handleChatExecute}
              onSpeak={(text, cfg) => ttsSpeak(text, cfg?.rate || 1.0, cfg?.pitch || 1.0, cfg?.voice)}
            />
          )}
        </aside>

        )}

        {/* Canvas area */}
        <main className="flex-1 relative">
          <PipelineCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
          >
            {/* Execution error toast */}
            {execError && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-red-900/80 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg shadow-xl max-w-lg text-center">
                {execError}
                <button
                  onClick={() => setExecError(null)}
                  className="ml-3 text-red-300 hover:text-red-100"
                >
                  ✕
                </button>
              </div>
            )}
          </PipelineCanvas>
        </main>

        {/* Right panel — execution results + curl */}
        {resultsOpen && (
        <aside className="w-80 bg-gray-900 border-l border-gray-800 shrink-0 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-800">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
              Results
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Multi-Language Code Exporter */}
            {results.length > 0 && <CodeExporter steps={results} />}

            {/* Execution results */}
            {results.length > 0 && (
              <div className="space-y-2">
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                  Step Results ({results.length})
                </span>
                {results.map((r, i) => (
                  <div
                    key={r.stepId}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-xs font-semibold">
                        Step {i + 1}
                      </span>
                      <span className="text-gray-500 text-xs uppercase">
                        {r.nodeType}
                      </span>
                    </div>
                    {r.error ? (
                      <div className="text-red-400 text-xs bg-red-900/30 rounded px-2 py-1">
                        {r.error}
                      </div>
                    ) : (
                      <>
                        <div className="text-gray-400 text-xs">
                          <span className="text-gray-500">Response:</span>
                          <pre className="text-gray-300 font-mono text-xs mt-0.5 bg-gray-950 rounded px-2 py-1 max-h-[80px] overflow-y-auto whitespace-pre-wrap break-all">
                            {typeof r.response === 'string'
                              ? r.response
                              : JSON.stringify(r.response, null, 2)}
                          </pre>
                        </div>
                        {r.curl && (
                          <div className="text-gray-500 text-xs truncate font-mono">
                            {r.curl.length > 80
                              ? r.curl.slice(0, 80) + '…'
                              : r.curl}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {results.length === 0 && !execError && !executing && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                <div className="text-3xl mb-2 opacity-30">⟳</div>
                <p className="text-xs text-center">
                  No results yet.
                  <br />
                  Connect nodes and press
                  <br />
                  <span className="text-gray-500 font-medium">
                    ▶ Run Pipeline
                  </span>
                </p>
              </div>
            )}

            {executing && (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-xs">Executing pipeline…</span>
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuth={handleAuth} />
      <StepperModal
        open={stepperOpen}
        currentStep={currentStepIndex}
        totalSteps={stepOrderRef.current.length}
        stepResult={stepResults[currentStepIndex] ?? null}
        onContinue={handleStepContinue}
        onAbort={handleStepAbort}
        loading={stepperLoading}
      />
      <LearnModal open={showLearn} onClose={() => setShowLearn(false)} />
      
      {/* Code Sandbox Workspace */}
      {activeCodeSandboxId && (() => {
        const sandboxNode = nodes.find((n) => n.id === activeCodeSandboxId);
        if (!sandboxNode) return null;
        return (
          <CodeSandboxWorkspace
            config={(sandboxNode.data as any).config || {}}
            onConfigChange={(newConfig) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === activeCodeSandboxId
                    ? { ...n, data: { ...n.data, config: newConfig } }
                    : n
                )
              );
            }}
            onClose={() => setActiveCodeSandboxId(null)}
          />
        );
      })()}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
