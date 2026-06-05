---
name: trace
description: "Trace — visual educational platform for learning LLM tool-use, MCP protocol, memory/context/thread patterns, and agentic systems via a React Flow node-based pipeline builder."
version: 5.0.0
---

# Trace — Agentic Pipeline Builder

A production web application for designing, testing, and understanding LLM/MCP agentic workflows through a visual node-based canvas. Built as an educational platform for the RGV AI Coalition with phased progression, sandbox mode, A2UI visualizations, built-in workshops, and a self-modifying tool registry.

## Quick Start (Development)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8083

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Architecture

```
[React Flow Canvas] → [localStorage persistence] → [Chat Panel]
        ↓ Play / Step Thru
[FastAPI Backend :8083]
  ├── /api/execute         — run full pipeline graph
  ├── /api/execute/step    — step-through single node
  ├── /api/search          — DuckDuckGo web search
  ├── /api/browser/fetch   — headless page fetch
  ├── /api/mcp/list-tools  — MCP tool discovery
  ├── /api/memory          — persistent key-value store
  ├── /api/registry        — self-modifying tool definitions
  ├── /api/auth/*          — session-based user auth
  ├── /api/curl/generate   — curl command generator
  └── /api/a2ui/hello      — A2UI sandboxed iframe demo
```

## Node Types

| Node | Type Enum | Role | Backend Handler |
|------|-----------|------|----------------|
| **Provider** | `provider` | LLM endpoint, model, API key config | `_handle_provider` |
| **Chat** | `chat` | System prompt + messages → `/chat/completions` | `_handle_chat` |
| **Browser** | `browser` | Fetch web pages, extract text | `_handle_browser` |
| **Search** | `search` | DuckDuckGo web search | `_handle_search` |
| **MCP** | `mcp` | Discover/call tools via MCP protocol | `_handle_mcp` |
| **Registry** | `registry` | Self-modifying tool definitions | (frontend-only, no execute) |
| **Memory** | `memory` | Persistent key-value store | `_handle_memory` |
| **Context** | `context` | Context injection / RAG for prompt grounding | `_handle_context` |
| **Thread** | `thread` | Parallel/sequential execution branching | `_handle_thread` |
| **Observer** | `observer` | Capture I/O, display raw + A2UI-rendered results | `_handle_observer` |

## Key Implementation Details

### Pipeline Execution
- Kahn's algorithm for topological sort to determine node execution order
- Upstream provider resolution via BFS walk through reverse edges
- MCP tool definitions collected from upstream MCP nodes, injected into Chat requests as OpenAI function-calling format
- Tool-calling loop with configurable max iterations (default 10)
- Sandbox mode skips real API calls, returns mock responses for all node types

### Memory Node
- Stored in `MEMORY_STORE` global dict (module-level in `executor.py`)
- API: `POST /api/memory` (store/retrieve/delete), `GET /api/memory?namespace=` (list)
- Namespace-scoped for isolation between different use cases
- Accessed from both the frontend (MemoryNode component) and backend executor

### Thread Node
- Mode: `parallel` — previously-executed upstream results collected via `asyncio.gather`
- Mode: `sequential` — results collected one-by-one
- Collects from `previous_results` dict populated by the main execution loop

### Educational Features
- **Phased progression**: 5 phases, nodes unlock gradually, objectives-based completion
- **Badges**: Prompt Engineer, Web Miner, Tool Builder, Flow Orchestrator, Self-Modifier
- **Sandbox mode**: mock responses for workshop demos without API keys
- **8 lessons**: from "Hello Agentic Chat" to "Parallel Execution with Threads"
- **Learn modal**: tabbed reference for all 10 node types with What It Is, Key Concepts, How It Works, Configuration Fields, Example Pipeline, and Generated Curl
- **Workshop curriculum**: 5-phase program in WORKSHOPS.md (~280 lines)
- **Step-through debugger**: pauses at each node to inspect request/response
- **Code exporter**: Python (OpenAI SDK), Node.js (fetch), and curl tabs
- **A2UI visualizer**: renders tool responses as sandboxed HTML iframes

### Self-Modifying Tool Registry
- Tools defined in `registry.json` with write_allowed flag
- Guardrails: write opt-in, self-disable protection, self-delete protection, last-item protection, schema re-validation, atomic writes with backup, name/duplicate validation, size limits

## Deployment

### Production Docker Stack
```bash
cd ~/projects/trace
docker compose build
docker compose up -d
```

Three containers:
| Container | Role | Port |
|-----------|------|------|
| `trace` | FastAPI + React SPA | 127.0.0.1:8083 |
| `trace-nginx` | nginx reverse proxy | 127.0.0.1:8084 → :80 |
| `trace-ts` | Tailscale sidecar | — |

### Quick deploy to linuxbox
```bash
cd frontend && npm run build && cd ..
tar czf - frontend/dist/ backend/app/ | \
  ssh selfsim@192.168.1.237 "cd ~/projects/trace && tar xzf -"
ssh selfsim@192.168.1.237 "docker compose up -d --force-recreate trace"
```

### Nginx Path Routing
```nginx
location /trace/ {
    proxy_pass http://trace:8083;    # NO trailing slash
    proxy_set_header Host $host;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
}
```

**Critical**: `proxy_pass http://trace:8083;` without trailing slash preserves the `/trace/` prefix. A trailing slash strips it and causes a redirect loop.

## Adding a New Node Type

1. Add to TypeScript `NodeType` union (`frontend/src/types/pipeline.ts`)
2. Add to Python `NodeType` enum (`backend/app/models.py`)
3. Create node component in `frontend/src/components/nodes/`
4. Add backend handler in `backend/app/executor.py` (and route in `main.py` if API needed)
5. Add tooltip content in `frontend/src/components/nodes/NodeTooltip.tsx`
6. Register in `PipelineCanvas.tsx` `nodeTypes` map
7. Add to `App.tsx` sidebar palette + `getDefaultData()`
8. Add sandbox mocks in both `handleExecute` and `executeSingleStep`
9. Add LearnModal tab in `LearnModal.tsx`
10. Add lesson template in `frontend/src/constants/lessons.ts`

## Pitfalls

- **pydantic-core wheel**: Python 3.14 on Ubuntu lacks pre-built wheels. Use `--only-binary :all:`.
- **Double React Flow state**: Only `App.tsx` should own `useNodesState`/`useEdgesState`.
- **MCP endpoint path**: Frontend calls `/api/mcp/list-tools` not `/api/mcp/discover`.
- **Thread node execution**: Thread collects already-executed results from previous_results. Due to topological sort order, thread nodes are collectors, not executors — they group results from nodes that ran before them.
- **Memory persistence**: MEMORY_STORE is in-memory (not persisted to disk). RESTART WIPES DATA. For production, add a SQLite-backed memory store.
- **write_file mangles env vars**: The write_file tool interprets `${...}` as template variables. Write files containing `$`-prefixed patterns by using `execute_code` with a Python script.
- **Nginx reload via bind mount**: When nginx.conf is mounted read-only, `docker exec nginx -s reload` fails. Must recreate container.

## Verification

- Frontend: `cd frontend && npx tsc --noEmit && npm run build`
- API: `curl -s https://rgvai.tailfceaca.ts.net/api/health`
- Memory: `curl -s -X POST /api/memory -d '{"action":"store","namespace":"test","key":"hello","value":"world"}'`
- MCP: `curl -s -X POST /api/mcp/list-tools -d '{"server_url":"..."}'`
