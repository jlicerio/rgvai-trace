# Trace

> **The visual playground for learning LLMs, tool calling, and MCP.**

Visual node-based web app to design, test, and "trace" LLM/MCP agentic workflows.
Deployed on linuxbox (Tailscale) at `rgvai.tailfceaca.ts.net/trace/`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + React Flow |
| Styling | Tailwind CSS v4 (monochrome/grayscale per user pref) |
| Backend | Python 3.14 + FastAPI + uvicorn |
| Persistence | localStorage (graph state) |
| Deployment | scp dist/ → linuxbox, served via uvicorn |
| Domain | Tailscale funnel at `velobid.tailfceaca.ts.net/pipeline/` |

## System Design

```
[Canvas UI: React Flow] → [localStorage state]
        ↓ Play button
[FastAPI Proxy: /execute] → [LLM Provider API]
        ↓                          ↓
[Observer captures I/O]    [curl generator prints command]
```

### Node Types

| Node | Data | Function |
|------|------|----------|
| **Provider** | endpoint, model, apiKey (browser-only) | Global context: auth headers, base URL |
| **Chat/Agent** | systemPrompt, messages[] | Builds chat completion payload, calls LLM |
| **MCP Tool** | serverUrl, toolName, args | Discovers tools via MCP, calls selected tool |
| **Observer** | captured[] | Logs request/response pairs in a live feed |

### Pipeline Execution Flow

1. User connects nodes on canvas: Provider → Chat → MCP → Observer
2. Clicks "Play" — frontend serializes the graph into an ordered execution array
3. POST /api/execute with the pipeline config (API keys stripped from payload, only passed as headers)
4. Backend walks each step: calls the LLM, then MCP tools, streams responses
5. Observer nodes collect request/response pairs displayed in real-time
6. curl generator shows equivalent curl command for each step

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/execute | Execute a full pipeline graph |
| POST | /api/execute/step | Execute a single node step |
| POST | /api/mcp/list-tools | Connect to MCP server & list tools |
| POST | /api/curl/generate | Generate curl command for a step config |
| GET | / | Serve frontend static files |

## Node Schema (JSON)

```json
{
  "id": "node-1",
  "type": "provider|chat|mcp|observer",
  "position": {"x": 0, "y": 0},
  "data": {
    "label": "OpenAI Provider",
    "config": { ... type-specific ... }
  }
}
```

## Directory Structure

```
agentic-pipeline-builder/
  frontend/           # Vite + React + React Flow
    src/
      components/     # React components
        nodes/        # Custom React Flow nodes (ProviderNode, ChatNode, MCPNode, ObserverNode)
        PipelineCanvas.tsx   # Main React Flow canvas
        PlayButton.tsx       # Execution trigger
        CurlDisplay.tsx      # Curl command output
        ObserverFeed.tsx     # Live request/response log
      hooks/
        usePipelineExecutor.ts  # Graph traversal + API call
        useLocalStorage.ts      # Persistence hook
      types/
        pipeline.ts         # TypeScript types for nodes
      App.tsx
      main.tsx
    index.html
    package.json
    vite.config.ts
    tailwind.config.ts
  backend/            # FastAPI
    app/
      main.py         # FastAPI app, static file serving
      models.py       # Pydantic models
      executor.py     # Pipeline execution engine
      mcp_client.py   # MCP client integration
      curl_gen.py     # Curl command generator
    requirements.txt
  ARCHITECTURE.md
  Makefile
```

## Security

- API keys NEVER sent to backend — stored in browser memory only
- Backend receives key references, frontend injects headers on direct calls
- Backend proxy only for LLM/MCP calls, key is in `Authorization` header forwarded from frontend
- No key persistence on server

## Deployment

```bash
# Build frontend
cd frontend && npm run build

# Copy to linuxbox
scp -r frontend/dist selfsim@linuxbox:~/projects/agentic-pipeline-builder/frontend/

# On linuxbox: start backend
cd ~/projects/agentic-pipeline-builder
python -m uvicorn app.main:app --host 127.0.0.1 --port 8083

# Tailscale funnel: proxied via existing dispatch-hud nginx or standalone
```
