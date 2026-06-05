# Trace

> **A visual playground for learning LLMs, tool calling, and MCP.**
>
> Design agentic workflows by dragging nodes on a canvas, hit ▶ to execute,
> and see every curl request that fires under the hood.

[![Deploy Status](https://img.shields.io/badge/status-live-brightgreen)](https://rgvai.tailfceaca.ts.net/trace/)
[![Stack](https://img.shields.io/badge/stack-React%20Flow%20%2B%20FastAPI-blue)](https://reactflow.dev)

---

## Live Demo

**→ https://rgvai.tailfceaca.ts.net/trace/**

No sign-up required for sandbox mode. Register a free account to save pipelines and store API keys.

---

## Concept

Agentic workflows are just a series of API calls. Trace makes this visible:

1. **Drag nodes** onto a canvas (Provider, Chat/Agent, MCP Tool, Observer)
2. **Wire them up** — outputs connect to inputs like a data pipeline
3. **Hit Play** — the backend traverses the graph and executes each node
4. **See the curl** — every step shows the exact HTTP request the system made

Students move from "magic" to "network call" in seconds.

---

## Node Types

| Node | Purpose |
|------|---------|
| **Provider** | LLM endpoint, model, API key (global context) |
| **Chat/Agent** | System prompt + input/output window |
| **MCP Tool** | Discovers tools from an MCP server, attaches them to the agent |
| **Observer** | Captures the full request/response cycle for inspection |
| **Registry** | Self-modifying tool registry with schema guardrails |
| **Search** | Web search tool node |
| **Browser** | Browser automation tool node |

---

## Architecture

```
                         ┌─────────────────────┐
                         │   Browser (React)    │
                         │  React Flow Canvas   │
                         └──────────┬──────────┘
                                    │ /api/
                         ┌──────────▼──────────┐
                         │  FastAPI Backend     │
                         │  Executor Engine     │
                         │  Curl Generator      │
                         │  MCP Client          │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  LLM APIs / MCP     │
                         │  Servers             │
                         └─────────────────────┘
```

---

## Features

- **Visual node editor** — React Flow DnD canvas
- **Pipeline execution** — Graph traversal with Kahn topological sort
- **Curl generator** — See the exact HTTP request for every pipeline step
- **MCP integration** — Connect to MCP servers, discover tools, call them
- **Sandbox mode** — Learn without an API key
- **A2UI visualizer** — Watch tool calls animate in real-time
- **Stepper** — Step through execution node-by-node for debugging
- **Code exporter** — Export any pipeline as Python, JavaScript, or curl
- **Phased curriculum** — 5 phases from basic chat to custom MCP servers
- **Secure key storage** — API keys encrypted with Fernet at rest

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, React Flow, Tailwind v4 |
| Backend | Python 3.14, FastAPI, Uvicorn |
| Auth | scrypt password hashing |
| Encryption | Fernet (symmetric) |
| Database | SQLite |
| Deployment | Docker, Docker Compose, Nginx |
| Network | Tailscale, Funnel (public) |

---

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

Open http://localhost:5173/trace/

---

## Quick Start (Docker)

```bash
git clone https://github.com/jlicerio/rgvai-trace.git
cd rgvai-trace
docker compose up -d
```

Open http://localhost:8083/trace/

---

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full deployment guide, including Tailscale Funnel configuration.

---

## Project Structure

```
trace/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI entry point
│       ├── auth.py          # User registration/login
│       ├── executor.py      # Pipeline graph exec engine
│       ├── curl_gen.py      # HTTP request generator
│       ├── mcp_client.py    # MCP protocol client
│       ├── encryption.py    # Fernet key management
│       ├── database.py      # SQLite ORM layer
│       ├── models.py        # Data models
│       ├── registry.py      # Tool registry (self-modifying)
│       ├── tools.py         # Tool handlers
│       └── self_test.py     # Integration tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── nodes/       # React Flow custom node types
│   │   │   │   ├── ProviderNode.tsx
│   │   │   │   ├── ChatNode.tsx
│   │   │   │   ├── MCPNode.tsx
│   │   │   │   ├── ObserverNode.tsx
│   │   │   │   ├── SearchNode.tsx
│   │   │   │   ├── BrowserNode.tsx
│   │   │   │   ├── RegistryNode.tsx
│   │   │   │   └── NodeTooltip.tsx
│   │   │   ├── PipelineCanvas.tsx
│   │   │   ├── PlayButton.tsx
│   │   │   ├── CurlDisplay.tsx
│   │   │   ├── AuthModal.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── CodeExporter.tsx
│   │   │   ├── StepperModal.tsx
│   │   │   ├── A2UIVisualizer.tsx
│   │   │   ├── ProgressionSidebar.tsx
│   │   │   └── ParsedChatOutput.tsx
│   │   ├── hooks/           # React hooks
│   │   ├── constants/       # Lessons, MCP registry
│   │   ├── utils/           # Code generation utils
│   │   └── types/           # TypeScript types
│   └── vite.config.ts
├── Dockerfile               # Multi-stage (Node → Python)
├── docker-compose.yml       # App + Nginx + Tailscale
├── nginx.conf               # Reverse proxy config
├── DEPLOY.md                # Deployment guide
└── ARCHITECTURE.md          # Detailed architecture doc
```

---

## License

Built for the RGV AI Coalition educational workshops.
