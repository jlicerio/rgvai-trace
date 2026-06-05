import { useCallback } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ProviderNode from './nodes/ProviderNode';
import ChatNode from './nodes/ChatNode';
import MCPNode from './nodes/MCPNode';
import ObserverNode from './nodes/ObserverNode';
import BrowserNode from './nodes/BrowserNode';
import SearchNode from './nodes/SearchNode';
import RegistryNode from './nodes/RegistryNode';
import MemoryNode from './nodes/MemoryNode';
import ContextNode from './nodes/ContextNode';
import ThreadNode from './nodes/ThreadNode';
import SkillNode from './nodes/SkillNode';
import CodeSandboxNode from './nodes/CodeSandboxNode';
import SubagentNode from './nodes/SubagentNode';
import TTSNode from './nodes/TTSNode';
import LocalModelNode from './nodes/LocalModelNode';

const nodeTypes = {
  provider: ProviderNode,
  chat: ChatNode,
  mcp: MCPNode,
  observer: ObserverNode,
  browser: BrowserNode,
  search: SearchNode,
  registry: RegistryNode,
  memory: MemoryNode,
  context: ContextNode,
  thread: ThreadNode,
  skill: SkillNode,
  subagent: SubagentNode,
  code_sandbox: CodeSandboxNode,
  tts: TTSNode,
  local_model: LocalModelNode,
};

interface PipelineCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onDrop?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  children?: React.ReactNode;
}

export default function PipelineCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  onNodeClick,
  children,
}: PipelineCanvasProps) {
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (onDrop) onDrop(event);
    },
    [onDrop]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (onDragOver) onDragOver(event);
    },
    [onDragOver]
  );

  return (
    <div className="w-full h-full relative">
      {/* Flow direction indicator */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 text-[10px] text-gray-600 bg-gray-900/80 px-2 py-1 rounded border border-gray-800 pointer-events-none select-none">
        <span className="text-gray-500">Input</span>
        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="2" r="1.5" fill="currentColor" className="text-gray-500" />
          <line x1="6" y1="3.5" x2="6" y2="8.5" stroke="currentColor" strokeWidth="1.5" />
          <polygon points="4.5,8 6,10.5 7.5,8" fill="currentColor" className="text-gray-300" />
        </svg>
        <span className="text-gray-300">Output</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode="Backspace"
        multiSelectionKeyCode="Shift"
        className="bg-gray-950"
        defaultEdgeOptions={{
          style: { stroke: '#6b7280', strokeWidth: 2 },
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280', width: 15, height: 15 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#374151"
        />
        <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg [&_button]:!text-gray-400 [&_button:hover]:!bg-gray-700 [&_button]:!border-gray-700" />
        <MiniMap
          nodeStrokeColor="#6b7280"
          nodeColor="#374151"
          nodeBorderRadius={4}
          maskColor="rgba(255, 255, 255, 0.08)"
          style={{ background: '#111827', border: '1px solid #374151' }}
        />
        {children}
      </ReactFlow>
    </div>
  );
}
