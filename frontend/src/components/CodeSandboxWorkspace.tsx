import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Play, Plus, Trash2, FileText, Terminal, Clock } from 'lucide-react';

interface CodeSandboxWorkspaceProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  onClose: () => void;
}

const DEFAULT_FILES: Record<string, string> = {
  'main.py': '# Write Python code here\n\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Trace"))\n\n# Try importing modules\nimport json, math, random, datetime\nprint(f"Pi = {math.pi:.4f}")\nprint(f"Random: {random.randint(1, 100)}")\n',
  'data.json': '{\n  "message": "Hello from Trace!",\n  "values": [1, 2, 3, 4, 5],\n  "active": true\n}',
};

export default function CodeSandboxWorkspace({ config, onConfigChange, onClose }: CodeSandboxWorkspaceProps) {
  const [files, setFiles] = useState<Record<string, string>>(
    config.files || DEFAULT_FILES
  );
  const [activeFile, setActiveFile] = useState<string>(config.activeFile || 'main.py');
  const [code, setCode] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [language, setLanguage] = useState<string>(config.language || 'python');
  const [execTime, setExecTime] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [pyodideAvailable, setPyodideAvailable] = useState(true);
  const runningRef = useRef(false);
  
  // Initialize code from active file
  useEffect(() => {
    setCode(files[activeFile] || '');
  }, [activeFile, files]);
  
  // Initialize Web Worker for Pyodide
  useEffect(() => {
    try {
      const worker = new Worker('/pyodide-worker.js');
      workerRef.current = worker;
      
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'ready') {
          setWorkerReady(true);
        } else if (msg.type === 'result') {
          runningRef.current = false;
          setRunning(false);
          const d = msg.data;
          setOutput(d.stdout || '');
          if (d.stderr || d.error) {
            setError(d.stderr || d.error);
          }
        } else if (msg.type === 'error') {
          runningRef.current = false;
          setRunning(false);
          setError(msg.data);
        }
      };
      
      worker.onerror = (err) => {
        runningRef.current = false;
        setRunning(false);
        setPyodideAvailable(false);
        setError('Web Worker error: ' + err.message);
      };
    } catch (err) {
      setPyodideAvailable(false);
    }
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  const handleRun = useCallback(async () => {
    setOutput('');
    setError('');
    setRunning(true);
    setExecTime(null);
    runningRef.current = true;
    
    const startTime = performance.now();
    
    if (workerRef.current && workerReady) {
      workerRef.current.postMessage({
        code,
        files,
        timeout: 10000,
      });
      
      // Poll for completion
      const checkRunning = setInterval(() => {
        if (!runningRef.current) {
          setExecTime(performance.now() - startTime);
          clearInterval(checkRunning);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkRunning);
        if (runningRef.current) {
          runningRef.current = false;
          setRunning(false);
          setError('Execution timed out (10s)');
        }
      }, 11000);
    } else {
      // Fallback: no Pyodide, simulate
      setTimeout(() => {
        runningRef.current = false;
        setRunning(false);
        setOutput('Pyodide not available.\n\nThis is a mock execution.\nTo run real Python code, deploy with\nPyodide enabled or use a network connection.');
        setExecTime(performance.now() - startTime);
      }, 500);
    }
    
    // Save to config
    const updatedFiles = { ...files, [activeFile]: code };
    onConfigChange({
      ...config,
      files: updatedFiles,
      activeFile,
      language,
      lastRun: new Date().toLocaleTimeString(),
    });
  }, [code, files, activeFile, language, config, onConfigChange, workerReady]);
  
  const handleAddFile = useCallback(() => {
    const name = prompt('File name:', 'new_file.py');
    if (name && !files[name]) {
      const newFiles = { ...files, [name]: '' };
      setFiles(newFiles);
      setActiveFile(name);
    }
  }, [files]);
  
  const handleDeleteFile = useCallback((name: string) => {
    const newFiles = { ...files };
    delete newFiles[name];
    setFiles(newFiles);
    if (activeFile === name) {
      const keys = Object.keys(newFiles);
      setActiveFile(keys[keys.length - 1] || 'main.py');
    }
  }, [files, activeFile]);
  
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    setFiles(prev => ({ ...prev, [activeFile]: newCode }));
  }, [activeFile]);
  
  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-200">Code Workspace</h2>
          <span className="text-gray-600">|</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          {execTime !== null && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <Clock size={11} />
              {(execTime / 1000).toFixed(2)}s
            </span>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-800 text-green-200 hover:bg-green-700 disabled:opacity-50 border border-green-700"
          >
            <Play size={12} />
            {running ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Main workspace area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-48 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Files</span>
            <button onClick={handleAddFile} className="text-gray-500 hover:text-gray-300">
              <Plus size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {Object.keys(files).map((name) => (
              <div
                key={name}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs ${
                  activeFile === name
                    ? 'bg-gray-700 text-gray-200'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
                onClick={() => {
                  // Save current code before switching
                  const updated = { ...files, [activeFile]: code };
                  setFiles(updated);
                  setActiveFile(name);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <FileText size={11} className="text-gray-500" />
                  <span className="truncate">{name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(name); }}
                  className="text-gray-600 hover:text-red-400 opacity-0 hover:opacity-100"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Code editor area */}
        <div className="flex-1 flex flex-col">
          {/* Simple textarea editor (MVP — upgrade to CodeMirror later) */}
          <div className="flex-1 p-0">
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full h-full bg-gray-950 text-gray-200 font-mono text-sm p-4 resize-none focus:outline-none border-0"
              spellCheck={false}
              placeholder="Write your code here..."
            />
          </div>
          
          {/* Output panel */}
          <div className="h-48 border-t border-gray-800 bg-gray-950 flex flex-col shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800">
              <Terminal size={11} className="text-gray-500" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Output</span>
              {!pyodideAvailable && (
                <span className="text-[10px] text-yellow-600 ml-auto">Pyodide unavailable — mock mode</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
              {error && (
                <pre className="text-red-400 whitespace-pre-wrap">{error}</pre>
              )}
              {output && (
                <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
              )}
              {!output && !error && !running && (
                <span className="text-gray-600">Press Run to execute code</span>
              )}
              {running && (
                <span className="text-gray-500 animate-pulse">Executing...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
