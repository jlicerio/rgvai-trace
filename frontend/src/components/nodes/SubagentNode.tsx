import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Bot, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

const PRESET_ROLES = [
  { name: 'Code Writer', desc: 'Writes and debugs code' },
  { name: 'Data Analyst', desc: 'Analyzes data and creates reports' },
  { name: 'Web Researcher', desc: 'Searches and synthesizes web info' },
  { name: 'Debugger', desc: 'Systematic bug hunting and fixing' },
  { name: 'Shell Operator', desc: 'Command-line operations expert' },
];

function SubagentNode({ data, selected }: NodeProps) {
  const config = (data.config || {}) as Record<string, any>;
  const [customizing, setCustomizing] = useState(false);
  
  const roleName = config.roleName || 'Code Writer';
  const currentRole = PRESET_ROLES.find(r => r.name === roleName);
  const maxIter = config.customRole?.maxIterations || 5;
  
  return (
    <div className={`bg-gray-900 border-2 rounded-xl shadow-xl w-[240px] ${selected ? 'border-gray-400' : 'border-gray-700'}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-900" />
      
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <Bot size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
          {data.label || 'Subagent'}
        </span>
        <span className="ml-auto text-[10px] font-mono text-gray-500">{maxIter} iters</span>
      </div>
      
      <div className="px-3 py-2 space-y-2">
        {/* Role selector */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Role</label>
          <select
            value={roleName}
            onChange={(e) => {
              const role = PRESET_ROLES.find(r => r.name === e.target.value);
              data.config = { ...config, roleName: e.target.value, customRole: null };
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-gray-500"
          >
            {PRESET_ROLES.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
          {currentRole && (
            <p className="text-[10px] text-gray-500 mt-0.5">{currentRole.desc}</p>
          )}
        </div>
        
        {/* Customize toggle */}
        <button
          onClick={() => setCustomizing(!customizing)}
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300"
        >
          <Settings2 size={11} />
          {customizing ? 'Hide Settings' : 'Customize'}
          {customizing ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        
        {customizing && (
          <div className="space-y-2 border-t border-gray-800 pt-2">
            {/* Task input */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Task</label>
              <textarea
                value={config.task || ''}
                onChange={(e) => { data.config = { ...config, task: e.target.value }; }}
                placeholder="What should this subagent do?"
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
              />
            </div>
            
            {/* System prompt */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">System Prompt</label>
              <textarea
                value={config.customRole?.systemPrompt || ''}
                onChange={(e) => {
                  const custom = config.customRole || { name: 'Custom', systemPrompt: '', maxIterations: 5, allowedMcpTools: [], enabledSkills: [] };
                  custom.systemPrompt = e.target.value;
                  data.config = { ...config, roleName: 'Custom', customRole: custom };
                }}
                placeholder="You are a..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
              />
            </div>
            
            {/* Max iterations */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                Max Iterations: {maxIter}
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={maxIter}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const custom = config.customRole || { name: 'Custom', systemPrompt: '', maxIterations: 5, allowedMcpTools: [], enabledSkills: [] };
                  custom.maxIterations = val;
                  data.config = { ...config, roleName: 'Custom', customRole: custom };
                }}
                className="w-full accent-gray-500"
              />
            </div>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3 !border-2 !border-gray-900" />
    </div>
  );
}

export default memo(SubagentNode);
