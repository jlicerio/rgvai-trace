import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Code2, FileText, Play } from 'lucide-react';

function CodeSandboxNode({ data, selected }: NodeProps) {
  const config = (data.config || {}) as Record<string, any>;
  const files: Record<string, string> = config.files || { 'main.py': '# Write Python code here\nprint("Hello, Trace!")' };
  const activeFile = config.activeFile || 'main.py';
  const language = config.language || 'python';
  const lastRun = config.lastRun;
  const fileCount = Object.keys(files).length;
  
  return (
    <div className={`bg-gray-900 border-2 rounded-xl shadow-xl w-[240px] ${selected ? 'border-gray-400' : 'border-gray-700'}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-900" />
      
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <Code2 size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
          {data.label || 'Code'}
        </span>
        <span className="ml-auto text-[10px] font-mono text-gray-500">
          {language === 'python' ? 'py' : language}
        </span>
      </div>
      
      <div className="px-3 py-2 space-y-2">
        {/* File indicator */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <FileText size={11} />
          <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
          <span className="text-gray-600">·</span>
          <span className="font-mono text-[10px]">{activeFile}</span>
        </div>
        
        {/* Code preview (first line) */}
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-[10px] text-gray-500 leading-relaxed max-h-[60px] overflow-hidden">
          {files[activeFile]?.split('\n').slice(0, 3).join('\n') || '(empty)'}
        </div>
        
        {/* Run indicator */}
        {lastRun && (
          <div className="flex items-center gap-1 text-[10px] text-gray-600">
            <Play size={10} />
            <span>Ran at {lastRun}</span>
          </div>
        )}
        
        {/* Open workspace button */}
        <div className="text-[10px] text-gray-600 text-center border-t border-gray-800 pt-2">
          Click node to open workspace
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3 !border-2 !border-gray-900" />
    </div>
  );
}

export default memo(CodeSandboxNode);
