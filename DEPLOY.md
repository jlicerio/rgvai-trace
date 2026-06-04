# Trace — RGV AI Coalition Deployment

> The visual playground for learning LLMs, tool calling, and MCP.

## Quick Start (Docker)

```bash
# 1. Clone and build
git clone <your-repo> trace
cd trace
docker compose build

# 2. Set your Tailscale auth key
export TS_AUTHKEY=tskey-auth-xxxxx

# 3. Start everything
docker compose up -d
```

Trace will be available on your tailnet at `https://trace.tailfceaca.ts.net/pipeline/`.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `SECRET_KEY` | `changeme` | Key derivation for API key encryption |
| `AUTH_DB_PATH` | `/data/pipeline.db` | SQLite database location |
| `TS_AUTHKEY` | (required) | Tailscale auth key for sidecar |

## Architecture

```
Browser → Tailscale Funnel → trace:8083 (FastAPI)
                                    │
                              SQLite (/data/)
                                    │
                              LLM APIs (opencode, OpenAI, local)
```

## Workshop Setup

1. Open `https://trace.tailfceaca.ts.net/pipeline/`
2. Register an account (username + password, no email)
3. Start Phase 1: drag Provider + Chat + Observer
4. Use `sandbox` mode for no-API-key lessons
5. Save your API key in Settings for live LLM calls

## Built With

- **Frontend**: React 18 + TypeScript + React Flow + Tailwind v4
- **Backend**: Python 3.14 + FastAPI + uvicorn
- **Auth**: scrypt password hashing + Fernet key encryption
- **Database**: SQLite
- **Protocol**: MCP-native, A2UI visualizer
