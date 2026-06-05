# Code Sandbox & File System — Research Summary

## In-Browser Code Execution Options (via AGY/Gemini 3.5 Flash)

### Python — Pyodide (recommended)
- CPython compiled to WebAssembly via Emscripten
- Runs in a **Web Worker** to avoid blocking the UI
- `micropip` loads pure-Python packages (numpy, pandas, etc.)
- Built-in `sys` module, stdin/stdout capture
- Emscripten virtual FS (`/home/pyodide`) can be synced with IDBFS

### JavaScript/TypeScript — Native
- Execute directly in a Web Worker via `new Worker()` or `eval()` in sandboxed iframe
- `sandbox` attribute on iframe for security

### SQL — SQLite WASM
- `@sqlite.org/sqlite-wasm` npm package
- Full SQL dialect in-browser
- Perfect for workshop SQL lessons

### Go/Rust/C++ — Impractical for MVP
- Pre-compiled WASM runtimes can execute pre-built binaries
- Compiling source → WASM in-browser is too heavy for a workshop tool

## File System Architecture

### Recommended: In-Memory Map → IndexedDB
- `Record<string, string>` mapping file paths to content
- In-memory `Map` for active session (fast, no serialization)
- Sync to IndexedDB via `idb-keyval` (or `localForage`) for persistence
- Hook into Trace's existing `localStorage` pattern

### File Tree Component
- Left column: file tree (folders expand/collapse)
- Right column: CodeMirror editor + file content
- Top: run button + language selector

## Editor Component — CodeMirror 6
- `@uiw/react-codemirror` — React wrapper
- Lighter than Monaco (better for multiple instances in nodes)
- Syntax highlighting: Python, JS/TS, SQL, JSON, HTML, CSS
- Key bindings, line numbers, minimap optional

## Architecture — "Code" Node in Trace

```
[Code Node]
  ├── Config: language, files[], activeFile
  ├── Expandable Panel (click to expand)
  │     ├── File Tree (left sidebar)
  │     ├── CodeMirror Editor (center)
  │     └── Output Panel (bottom)
  └── Run button → Web Worker → stdout/stderr → display in output
```

### Fastest MVP Path:
1. Main-thread Pyodide execution (no Web Worker — simpler)
2. In-memory `files: Record<string, string>` in node config
3. CodeMirror 6 with Python syntax highlighting
4. Serialize to localStorage via existing hook
5. One language (Python) initially, expand later

### Future:
- Web Worker for non-blocking execution
- SQLite-WASM node type
- JS/TS execution in sandboxed iframe
- File tree with folder CRUD
- IndexedDB persistence

## References
- Pyodide: https://pyodide.org/
- CodeMirror 6 React: https://uiwjs.github.io/react-codemirror/
- SQLite WASM: https://sqlite.org/wasm
- OPFS: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
