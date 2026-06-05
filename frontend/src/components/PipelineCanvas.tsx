import { useCallback } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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
};

interface PipelineCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onDrop?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
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
