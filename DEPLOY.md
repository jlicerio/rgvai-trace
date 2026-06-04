# Trace — Deployment Guide

> The visual playground for learning LLMs, tool calling, and MCP.
> Deployed for the RGV AI Coalition workshop series.

---

## Public URL

**https://linuxbox.tailfceaca.ts.net/trace/**

No tailnet required. Accessible from any browser, anywhere.

---

## Quick Start (Docker)

```bash
# 1. Clone
git clone https://github.com/jlicerio/rgvai-trace.git trace
cd trace

# 2. Set Tailscale auth key
export TS_AUTH_KEY=tskey-auth-xxxxxxxx

# 3. Build and start
docker compose build
docker compose up -d
```

Trace will be available on your tailnet at `http://localhost:8083/trace/`.

---

## Current Deployment (linuxbox)

| Service | Container | Host | Port |
|---------|-----------|------|------|
| FastAPI app | `trace` | linuxbox | 127.0.0.1:8083 |
| Nginx reverse proxy | `trace-nginx` | linuxbox | 127.0.0.1:8084 |
| Tailscale sidecar | `trace-ts` | linuxbox (node: `rgvai`) | — |

### Funnels Active

| URL | Type | Status |
|-----|------|--------|
| `https://linuxbox.tailfceaca.ts.net/trace/` | Host-level funnel | ✅ Public |
| `https://rgvai.tailfceaca.ts.net/trace/` | Container-level funnel | ⏳ Tailnet-only |

The `linuxbox` funnel is the primary public URL. The `rgvai` container funnel is configured but its DNS record needs admin approval for public resolution.

### Tailscale Node

- **Node name**: `rgvai`
- **Tailnet IP**: `100.75.135.14`
- **Auth**: Ephemeral auth key (set via `TS_AUTH_KEY` env var)

---

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `SECRET_KEY` | `change_me_in_production` | Fernet key derivation for API key encryption |
| `FRONTEND_DIST` | `/app/frontend/dist` | Path to built frontend assets |
| `TOOL_REGISTRY_PATH` | `/app/app/registry.json` | Self-modifying MCP tool registry |
| `AUTH_DB_PATH` | `/data/pipeline.db` | SQLite database (auto-created) |
| `TS_AUTH_KEY` | `set_me_in_env` | Tailscale auth key for sidecar container |

---

## Architecture

```
Browser ──┬── https://linuxbox.tailfceaca.ts.net/trace/
          │
  Tailscale Funnel ─── nginx (:8084) ─── trace (:8083)
                                              │
                                        SQLite (/data/)
                                              │
                                    LLM APIs (OpenAI, opencode, local)
```

- **Nginx** reverse-proxies `/trace/` (frontend) and `/api/` (backend)
- **FastAPI** serves the frontend static files from `FRONTEND_DIST`
- **SQLite** stores users, sessions, encrypted API keys, and saved pipelines
- **Fernet encryption** protects API keys at rest with a `SECRET_KEY`-derived key

---

## Workshop Setup

1. Open **https://linuxbox.tailfceaca.ts.net/trace/**
2. Register an account (username + password, no email required)
3. Start Phase 1: drag a Provider + Chat + Observer node
4. Connect them and hit ▶ Play
5. Use **sandbox mode** for API-key-free lessons
6. Curl Generator shows the exact HTTP request for every step

---

## Data

- **SQLite database**: Docker volume `trace_data:/data/pipeline.db`
- **API keys**: Encrypted at rest with Fernet (key derived from `SECRET_KEY`)
- **Pipelines**: Saved as JSON in SQLite, loaded on login
- **Tool registry**: JSON file at `TOOL_REGISTRY_PATH` (self-modifying via MCP)

---

## Updating

```bash
# Pull latest code
git pull origin master

# Rebuild
docker compose build

# Restart
docker compose up -d
```

The SQLite database and Tailscale state live in named volumes and persist across container rebuilds.

---

## Troubleshooting

**"Connection refused" from public URL**
- Verify the linuxbox Funnel is enabled: `sudo tailscale funnel status`
- Check containers are running: `docker compose ps`

**"No public DNS for rgvai.tailfceaca.ts.net"**
- The `rgvai` node's Funnel needs DNS delegation approval in the Tailscale admin console
- Workaround: use the `linuxbox` URL instead

**API key not working in sandbox mode**
- Sandbox mode doesn't send API calls — it generates curl strings only
- To test live, add your API key in Settings first
