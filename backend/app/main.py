"""
FastAPI application for Trace.

Serves the frontend static files and provides API endpoints for
executing pipelines, generating curl commands, listing MCP tools,
memory storage, and health checks.
"""
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.models import CurlRequest, ExecutionRequest
from app.curl_gen import generate_curl_from_config
from app.executor import execute_pipeline, MEMORY_STORE
from app.mcp_client import list_tools as mcp_list_tools
from app.tools import web_search, fetch_page
from app.registry import load_registry, save_registry, discover_tools, call_registry_tool
from app.auth import router as auth_router
from app.database import init_db


# ---------------------------------------------------------------------------
# Application & middleware
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Trace API",
    version="1.0.0",
    description="Educational platform for learning LLM tool calling and MCP through visual pipeline tracing.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and auth on startup
init_db()
app.include_router(auth_router)

# ---------------------------------------------------------------------------
# Frontend static files
# ---------------------------------------------------------------------------

# Determine the path to the frontend build directory.
# Project layout:
#   agentic-pipeline-builder/
#     backend/
#       app/
#         main.py          <-- this file
#     frontend/
#       dist/              <-- built frontend assets
#
# Resolve relative to this file's location.
HERE = Path(__file__).resolve().parent  # backend/app/
BACKEND_DIR = HERE.parent  # backend/
PROJECT_DIR = BACKEND_DIR.parent  # agentic-pipeline-builder/

FRONTEND_DIST = os.environ.get(
    "FRONTEND_DIST",
    str(PROJECT_DIR / "frontend" / "dist"),
)

if os.path.isdir(FRONTEND_DIST):
    app.mount("/trace", StaticFiles(directory=FRONTEND_DIST, html=True), name="trace")

    # Root redirect so tailscale serve / → :8083 → /trace/
    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/trace/")
else:
    # If the frontend hasn't been built yet, mount a minimal fallback
    @app.get("/pipeline/")
    async def pipeline_hint():
        return JSONResponse(
            content={
                "status": "frontend_not_built",
                "message": "Frontend not built yet. Run 'cd frontend && npm run build'.",
            }
        )
 
 # ---------------------------------------------------------------------------
 # API routes
# ---------------------------------------------------------------------------


@app.get("/api/health")
async def health():
    """Simple health-check endpoint."""
    return {"status": "ok", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Edge TTS voices
# ---------------------------------------------------------------------------

EDGE_TTS_VOICES = {
    "en-US-AriaNeural": "Aria (US, Female)",
    "en-US-JennyNeural": "Jenny (US, Female)",
    "en-US-GuyNeural": "Guy (US, Male)",
    "en-US-ChristopherNeural": "Christopher (US, Male)",
    "en-GB-SoniaNeural": "Sonia (UK, Female)",
    "en-GB-RyanNeural": "Ryan (UK, Male)",
    "en-AU-NatashaNeural": "Natasha (AU, Female)",
    "en-IN-NeerjaNeural": "Neerja (IN, Female)",
}


@app.get("/api/tts/voices")
async def tts_voices():
    """List available Edge TTS voices."""
    voices = [{"id": k, "label": v} for k, v in EDGE_TTS_VOICES.items()]
    return {"voices": voices}


@app.post("/api/tts")
async def tts_generate(raw_request: Request):
    """Generate speech audio using Edge TTS (Microsoft Edge free neural voices).

    Accepts JSON body:
      text: str (required)
      voice: str (default: en-US-AriaNeural)
      rate: str (default: +0%), e.g. "+20%", "-10%"
      pitch: str (default: +0Hz), e.g. "+10%", "-5%" or "+20Hz"

    Returns MP3 audio with Content-Type audio/mpeg.
    """
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")

    text = body.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="'text' is required")

    voice = body.get("voice", "en-US-AriaNeural")
    rate = body.get("rate", "+0%")
    pitch = body.get("pitch", "+0Hz")

    if voice not in EDGE_TTS_VOICES:
        raise HTTPException(status_code=400, detail=f"Unknown voice '{voice}'. Use GET /api/tts/voices for available voices.")

    try:
        import edge_tts

        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])

        if not audio_data:
            raise HTTPException(status_code=502, detail="Edge TTS returned empty audio")

        from fastapi.responses import Response
        return Response(
            content=bytes(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=tts.mp3",
                "X-TTS-Voice": voice,
            },
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="edge-tts package not installed on the server")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS generation failed: {exc}")


@app.get("/api/a2ui/hello")
async def a2ui_hello(name: str = "World"):
    """A2UI demo: returns an embeddable HTML card rendered in a sandboxed iframe."""
    html = f"""
<div style="padding:16px;text-align:center">
  <div style="font-size:32px;margin-bottom:8px">👋</div>
  <h2 style="margin:0 0 4px;color:#e2e8f0">Hello, {name}!</h2>
  <p style="margin:0 0 12px;color:#94a3b8;font-size:13px">
    This UI was rendered by an MCP tool using A2UI protocol.
  </p>
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
    <button onclick="document.getElementById('msg').textContent='Button clicked!'"
      style="padding:6px 16px;background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:6px;cursor:pointer;font-size:12px">
      Click Me
    </button>
    <span id="msg" style="color:#64748b;font-size:12px;line-height:32px"></span>
  </div>
</div>"""
    return {
        "type": "custom",
        "name": "McpApp",
        "properties": {"content": html, "title": f"A2UI Hello {name}"},
    }


@app.post("/api/execute")
async def execute_endpoint(request: ExecutionRequest, raw_request: Request):
    """
    Execute a full pipeline graph.

    The frontend sends the pipeline graph plus the selected provider ID.
    API keys are forwarded via the Authorization header — they are never
    stored on the server.
    """
    auth_header = raw_request.headers.get("authorization")

    try:
        results = await execute_pipeline(request, auth_header=auth_header)
        return {"results": [r.model_dump() for r in results]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/execute/step")
async def execute_step_endpoint(request: ExecutionRequest, raw_request: Request):
    """
    Execute a single step/node from the pipeline.

    A convenience wrapper around :meth:`execute_endpoint` that filters
    to the first stepId only.
    """
    auth_header = raw_request.headers.get("authorization")

    if not request.stepIds:
        raise HTTPException(status_code=400, detail="stepIds is required for single-step execution")

    # Limit to the first step ID only
    request.stepIds = [request.stepIds[0]]

    try:
        results = await execute_pipeline(request, auth_header=auth_header)
        return {"results": [r.model_dump() for r in results]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/curl/generate")
async def curl_generate_endpoint(request: CurlRequest):
    """
    Generate a curl command from a step/node configuration dict.

    The config dict should contain enough information to describe the
    HTTP request (method, url, headers, body) or follow a known node
    type pattern (chat, mcp, etc.).
    """
    try:
        curl_command = generate_curl_from_config(request.config)
        return {"curl": curl_command}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Curl generation failed: {exc}")


@app.post("/api/search")
async def search_endpoint(raw_request: Request):
    """Search the web using DuckDuckGo."""
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")
    
    query = body.get("query", "")
    count = body.get("count", 5)
    if not query:
        raise HTTPException(status_code=400, detail="'query' is required")
    
    try:
        results = await web_search(query, count)
        return results
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Search failed: {exc}")


@app.post("/api/browser/fetch")
async def browser_fetch_endpoint(raw_request: Request):
    """Fetch a web page and extract its text content."""
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")
    
    url = body.get("url", "")
    render_js = body.get("render_js", False)
    if not url:
        raise HTTPException(status_code=400, detail="'url' is required")
    
    try:
        result = await fetch_page(url, render_js=render_js)
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Browser fetch failed: {exc}")


@app.get("/api/registry")
async def registry_get():
    """Load the current tool registry."""
    try:
        return load_registry()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/registry")
async def registry_save(raw_request: Request):
    """Save updated tool registry. Only tools with write_allowed=true can be modified."""
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")
    try:
        result = save_registry(body)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/registry/tools")
async def registry_tools():
    """List registered tools as MCP-compatible tool definitions."""
    try:
        return {"tools": discover_tools()}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/registry/call")
async def registry_call(raw_request: Request):
    """Call a registered tool."""
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")
    tool_name = body.get("tool", "")
    args = body.get("arguments", {})
    if not tool_name:
        raise HTTPException(status_code=400, detail="'tool' is required")
    try:
        result = call_registry_tool(tool_name, args)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/memory")
async def memory_store_endpoint(raw_request: Request):
    """
    Store, retrieve, or delete a value from the in-memory store.

    Body: { action: str, namespace: str, key: str, value: str }
    """
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")

    action = body.get("action", "store")
    namespace = body.get("namespace", "default")
    key = body.get("key", "")
    value = body.get("value", "")

    if action == "store":
        if not key:
            raise HTTPException(status_code=400, detail="'key' is required for store action")
        if namespace not in MEMORY_STORE:
            MEMORY_STORE[namespace] = {}
        MEMORY_STORE[namespace][key] = value
        return {"status": "stored", "namespace": namespace, "key": key, "value": value}

    elif action == "retrieve":
        if not key:
            raise HTTPException(status_code=400, detail="'key' is required for retrieve action")
        ns = MEMORY_STORE.get(namespace, {})
        stored_value = ns.get(key)
        if stored_value is None:
            raise HTTPException(status_code=404, detail=f"Key '{key}' not found in namespace '{namespace}'")
        return {"key": key, "value": stored_value}

    elif action == "delete":
        if not key:
            raise HTTPException(status_code=400, detail="'key' is required for delete action")
        ns = MEMORY_STORE.get(namespace, {})
        if key not in ns:
            raise HTTPException(status_code=404, detail=f"Key '{key}' not found in namespace '{namespace}'")
        del ns[key]
        return {"status": "deleted", "namespace": namespace, "key": key}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: '{action}'. Use 'store', 'retrieve', or 'delete'.")


@app.get("/api/memory")
async def memory_list_endpoint(namespace: str = "default"):
    """List all entries in the given memory namespace."""
    ns = MEMORY_STORE.get(namespace, {})
    entries = [{"key": k, "value": v} for k, v in ns.items()]
    return {"namespace": namespace, "entries": entries}


@app.post("/api/mcp/list-tools")
async def mcp_list_tools_endpoint(raw_request: Request):
    """
    Connect to an MCP server and list its available tools.

    Expects a JSON body with:
        server_url: str  (required)
    
    Optionally forwards Authorization header.
    """
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")

    server_url = body.get("server_url") or body.get("serverUrl")
    if not server_url:
        raise HTTPException(status_code=400, detail="'server_url' is required")

    auth_header = raw_request.headers.get("authorization")
    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header

    try:
        result = await mcp_list_tools(server_url, headers=headers)
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"MCP connection failed: {exc}")


# ---------------------------------------------------------------------------
# Subagent role endpoints
# ---------------------------------------------------------------------------


@app.get("/api/subagent/roles")
async def subagent_roles_list():
    """List all available subagent roles (preset + custom)."""
    from app.executor import IN_MEMORY_SUBAGENT_ROLES
    roles = [
        {"name": r["name"], "systemPrompt": r["systemPrompt"], "maxIterations": r["maxIterations"],
         "allowedMcpTools": r.get("allowedMcpTools", []), "enabledSkills": r.get("enabledSkills", [])}
        for r in IN_MEMORY_SUBAGENT_ROLES.values()
    ]
    return {"roles": roles}


@app.post("/api/subagent/roles")
async def subagent_roles_create(raw_request: Request):
    """Register a new custom subagent role."""
    from app.executor import IN_MEMORY_SUBAGENT_ROLES
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")
    
    name = body.get("name", "")
    if not name:
        raise HTTPException(status_code=400, detail="'name' is required")
    
    IN_MEMORY_SUBAGENT_ROLES[name] = {
        "name": name,
        "systemPrompt": body.get("systemPrompt", "You are a helpful AI agent."),
        "maxIterations": body.get("maxIterations", 5),
        "allowedMcpTools": body.get("allowedMcpTools", []),
        "enabledSkills": body.get("enabledSkills", []),
    }
    return {"status": "created", "role": IN_MEMORY_SUBAGENT_ROLES[name]}


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
