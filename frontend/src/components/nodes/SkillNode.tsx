import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Terminal } from 'lucide-react';

const PRESET_SKILLS = [
  { id: 'shell', name: 'Shell', description: 'Bash/Zsh CLI — scripts, pipes, file ops', emoji: '>' },
  { id: 'git', name: 'Git', description: 'Version control — clone, commit, push', emoji: 'G' },
  { id: 'docker', name: 'Docker', description: 'Containers — build, run, compose', emoji: 'D' },
  { id: 'python', name: 'Python', description: 'Runtime + pip — scripts, packages', emoji: 'P' },
  { id: 'node', name: 'Node.js', description: 'Runtime + npm — JS/TS, packages', emoji: 'N' },
  { id: 'curl', name: 'cURL', description: 'HTTP client — GET/POST to any URL', emoji: '↗' },
  { id: 'ssh', name: 'SSH', description: 'Remote access — servers, tunnels', emoji: 'K' },
  { id: 'make', name: 'Make', description: 'Build tool — Makefile automation', emoji: 'M' },
  { id: 'jq', name: 'jq', description: 'JSON processor — filter/transform', emoji: '{' },
  { id: 'grep', name: 'grep/rg', description: 'Text search — find patterns in files', emoji: 'S' },
];

const CATEGORIES = [
  { id: 'core', label: 'Core', skills: ['shell'] },
  { id: 'dev', label: 'Dev Tools', skills: ['git', 'docker', 'make'] },
  { id: 'runtime', label: 'Runtimes', skills: ['python', 'node'] },
  { id: 'net', label: 'Network', skills: ['curl', 'ssh'] },
  { id: 'tool', label: 'Utilities', skills: ['jq', 'grep'] },
];

function SkillNode({ data, selected }: NodeProps) {
  const config = (data.config || {}) as Record<string, any>;
  const enabledSkills: string[] = config.enabledSkills || PRESET_SKILLS.map(s => s.id);

  const toggleSkill = useCallback((skillId: string) => {
    const current = config.enabledSkills || PRESET_SKILLS.map(s => s.id);
    const updated = current.includes(skillId)
      ? current.filter((id: string) => id !== skillId)
      : [...current, skillId];
    data.config = { ...config, enabledSkills: updated };
  }, [config, data.config]);

  const enabledCount = enabledSkills.length;
  const totalCount = PRESET_SKILLS.length;

  return (
    <div className={`bg-gray-900 border-2 rounded-xl shadow-xl w-[240px] ${selected ? 'border-gray-400' : 'border-gray-700'}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-600 !w-3 !h-3 !border-2 !border-gray-900" />
      
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <Terminal size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
          {data.label || 'Env Skills'}
        </span>
        <span className="ml-auto text-[10px] font-mono text-gray-500">
          {enabledCount}/{totalCount}
        </span>
      </div>

      {/* Skills list by category */}
      <div className="px-2 py-1.5 space-y-1 max-h-[260px] overflow-y-auto">
        {CATEGORIES.map(cat => {
          const catSkills = PRESET_SKILLS.filter(s => cat.skills.includes(s.id));
          if (catSkills.length === 0) return null;
          return (
            <div key={cat.id}>
              <div className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold px-1 pt-1 pb-0.5">
                {cat.label}
              </div>
              {catSkills.map(skill => (
                <label
                  key={skill.id}
                  className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-800 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={enabledSkills.includes(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                    className="accent-gray-500 w-3 h-3 rounded-sm cursor-pointer"
                  />
                  <span className="w-4 h-4 flex items-center justify-center text-[10px] font-mono font-bold text-gray-500 bg-gray-800 rounded">
                    {skill.emoji}
                  </span>
                  <span className="flex-1 text-xs text-gray-300 group-hover:text-gray-200 transition-colors">
                    {skill.name}
                  </span>
                </label>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-800">
        <p className="text-[10px] text-gray-600">
          {enabledCount === totalCount
            ? 'All skills enabled'
            : `${enabledCount} of ${totalCount} skills enabled`}
        </p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !w-3 !h-3 !border-2 !border-gray-900" />
    </div>
  );
}

export default memo(SkillNode);
