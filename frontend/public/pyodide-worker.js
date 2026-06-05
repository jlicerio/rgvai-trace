// Web Worker for Pyodide code execution
let pyodide = null;
let ready = false;

async function init() {
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.js');
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.4/full/',
    });
    ready = true;
    postMessage({ type: 'ready' });
  } catch (err) {
    postMessage({ type: 'error', data: 'Failed to initialize Pyodide: ' + err.message });
  }
}

init();

self.onmessage = async (event) => {
  const { code, files, timeout } = event.data;
  
  if (!ready) {
    postMessage({ type: 'error', data: 'Pyodide not ready yet' });
    return;
  }
  
  // Write files to Pyodide's virtual FS
  if (files && typeof files === 'object') {
    try {
      // Create directories if needed
      for (const [filepath] of Object.entries(files)) {
        const dir = filepath.substring(0, filepath.lastIndexOf('/'));
        if (dir) {
          try {
            pyodide.FS.mkdirTree(dir);
          } catch (e) {
            // directory may already exist
          }
        }
      }
      // Write files
      for (const [filepath, content] of Object.entries(files)) {
        pyodide.FS.writeFile(filepath, content);
      }
    } catch (err) {
      postMessage({ type: 'error', data: 'Failed to write files: ' + err.message });
      return;
    }
  }
  
  // Capture stdout
  let stdout = '';
  let stderr = '';
  
  pyodide.setStdout({
    batched: (text) => { stdout += text + '\n'; },
  });
  pyodide.setStderr({
    batched: (text) => { stderr += text + '\n'; },
  });
  
  const timeoutMs = timeout || 10000;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try { pyodide.runPython('raise TimeoutError("Execution timed out")'); } catch (e) {}
  }, timeoutMs);
  
  try {
    const result = await pyodide.runPythonAsync(code);
    clearTimeout(timer);
    if (!timedOut) {
      // Collect any modified files from the virtual FS
      const modifiedFiles = {};
      if (files && typeof files === 'object') {
        for (const [filepath] of Object.entries(files)) {
          try {
            const content = pyodide.FS.readFile(filepath, { encoding: 'utf8' });
            if (content !== files[filepath]) {
              modifiedFiles[filepath] = content;
            }
          } catch (e) {
            // file may have been deleted
          }
        }
      }
      
      postMessage({
        type: 'result',
        data: {
          stdout,
          stderr,
          result: result !== undefined ? String(result) : null,
          modifiedFiles: Object.keys(modifiedFiles).length > 0 ? modifiedFiles : null,
          executionTime: 0, // will be calculated on the main thread
        },
      });
    }
  } catch (err) {
    clearTimeout(timer);
    postMessage({
      type: 'result',
      data: {
        stdout,
        stderr: stderr + (err.message || String(err)),
        result: null,
        error: err.message || String(err),
      },
    });
  }
};
