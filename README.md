# Trace

> **A visual playground for learning LLMs, tool calling, and MCP.**
>
> Design agentic workflows by dragging nodes on a canvas, hit ▶ to execute,
> and see every curl request that fires under the hood.

[![Deploy Status](https://img.shields.io/badge/status-live-brightgreen)](https://rgvai.tailfceaca.ts.net/trace/)
[![Stack](https://img.shields.io/badge/stack-React%20Flow%20%2B%20FastAPI-blue)](https://reactflow.dev)

---

## About

**Trace is built by the [RGV AI Coalition](https://www.rgvaicoalition.com/)**
— a community dedicated to making AI agent development accessible through
hands-on education. We build open-source tools that demystify LLMs, tool
calling, and agentic workflows for learners at every level.

| 🔗 | Link |
|---|---|
| 🌐 | [RGV AI Coalition Website](https://www.rgvaicoalition.com/) |
| 📘 | [Facebook](https://www.facebook.com/profile.php?id=61588986606979) |
| ⚡ | [Trace Live Demo](https://rgvai.tailfceaca.ts.net/trace/) |
| 💻 | [GitHub Repository](https://github.com/jlicerio/rgvai-trace) |

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
| **Memory** | In-memory key/value store — persists across turns |
| **Context** | Injects static content into prompts (prepend system / append user) |
| **Code Sandbox** | In-browser Python via Pyodide WASM |
| **Skills** | Preset environment capabilities (shell, git, docker, etc.) |
| **Subagent** | Autonomous child agent with role presets + custom config |
| **TTS** | Text-to-speech (Web Speech / WebGPU Neural / Backend Edge TTS) |
| **Local Model** | In-browser LLM via WebLLM/WebGPU (Qwen, TinyLlama, Gemma, Phi) |
| **Thread** | Parallel branching and flow control |

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

Pipeline execution uses **Kahn topological sort** over the directed graph.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, React Flow, Tailwind v4 |
| Backend | Python 3.14, FastAPI, Uvicorn |
| Auth | scrypt password hashing |
| Encryption | Fernet (symmetric) |
| Database | SQLite |
| Deployment | Docker, Docker Compose, Nginx |
| Network | Tailscale Funnel (public HTTPS) |

---

## Quick Start

**Development:**
```shell
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
Open: `http://localhost:5173/trace/`

**Docker:**
```shell
git clone https://github.com/jlicerio/rgvai-trace.git
cd rgvai-trace
docker compose up -d
```
Open: `http://localhost:8083/trace/`

---

## Key Features

- **Visual DnD editor** — React Flow canvas
- **Graph traversal execution** — Kahn topological sort
- **Curl generator** — exact HTTP request for every pipeline step
- **MCP integration** — server discovery + tool calling
- **Sandbox mode** — no API key needed to start
- **A2UI visualizer** — real-time animated tool calls
- **Stepper** — node-by-node debugging
- **Code exporter** — Python, JavaScript, or curl output
- **Phased curriculum** — 5 phases from basic chat to custom MCP servers
- **All nodes as LLM tools** — Browser, Search, Code Sandbox, Memory, Skills, Registry, Subagent all register as callable tools when connected to a Chat node
- **Secure key storage** — Fernet-encrypted API keys at rest
