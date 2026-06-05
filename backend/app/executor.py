"""
Pipeline execution engine.

Walks a PipelineGraph in topological order, executing each node
according to its type and collecting results.

Supported node types:
  * **provider** — records endpoint + model context, no call made.
  * **chat** — calls the LLM provider API (OpenAI-compatible)
  * **mcp** — calls an MCP tool on the configured server
  * **browser** — fetches a URL and extracts text content
  * **search** — performs a web search via DuckDuckGo
  * **memory** — reads/writes to a persistent key-value store
  * **context** — injects context text into downstream Chat nodes
  * **thread** — collects results from downstream nodes (parallel/sequential)
  * **skill** — returns available environment skills as context
  * **subagent** — spawns an autonomous child agent with its own role, tools, and skills
  * **observer** — captures request/response from preceding nodes
  * **code_sandbox** — in-browser code editor/executor via Pyodide (WASM)
"""
import asyncio
import json
from typing import Any, Optional
from urllib.parse import urlparse
import re

import httpx

from app.models import (
    ExecutionRequest,
    ExecutionStepResult,
    NodeType,
    PipelineEdge,
    PipelineGraph,
    PipelineNode,
)
from app.curl_gen import generate_curl


BLOCKED_PRIVATE_IPS = {"127.0.0.1", "0.0.0.0", "localhost", "::1", "169.254.169.254"}
BLOCKED_CIDR = [r"^10\.", r"^172\.(1[6-9]|2\d|3[01])\.", r"^192\.168\."]

# Maximum number of tool-calling iterations to prevent infinite loops
MAX_TOOL_CALL_ITERATIONS = 10

# Global in-memory key-value store for memory nodes
MEMORY_STORE: dict[str, dict[str, str]] = {}


def _validate_endpoint_url(url: str) -> bool:
    """Block SSRF: reject private/internal IP ranges."""
    if not url:
        return False
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if host.lower() in BLOCKED_PRIVATE_IPS:
        return False
    for pattern in BLOCKED_CIDR:
        if re.match(pattern, host):
            return False
    return True


async def execute_pipeline(
    request: ExecutionRequest,
    auth_header: Optional[str] = None,
) -> list[ExecutionStepResult]:
    """
    Execute a full pipeline graph.

    Walks the graph in topological order.  For each node:

      * **provider** — records endpoint + model context, no call made.
      * **chat** — calls the LLM provider API (OpenAI-compatible)
      * **mcp** — calls an MCP tool on the configured server
      * **observer** — captures request/response from preceding nodes

    The API key is forwarded from the frontend via the ``auth_header``
    parameter, or extracted from the provider node config if the header
    is absent.  The provider endpoint URL and model come from the nearest
    upstream provider node in the graph.

    Args:
        request: The incoming ExecutionRequest containing the graph,
                 providerId, and selected step IDs.
        auth_header: The raw ``Authorization`` header value to forward.

    Returns:
        List of ExecutionStepResult, one per executed node.
    """
    pipeline = request.pipeline
    node_map = {n.id: n for n in pipeline.nodes}

    # If the auth_header wasn't passed as an HTTP header, try to extract
    # it from the provider node config (the frontend sends it in the pipeline data).
    if not auth_header:
        provider_node = node_map.get(request.providerId)
        if provider_node and provider_node.type == NodeType.PROVIDER:
            api_key = provider_node.data.config.get("apiKey", "")
            if api_key:
                auth_header = f"Bearer {api_key}"

    # If specific stepIds are given, only execute those nodes
    selected_ids: set[str] | None = (
        set(request.stepIds) if request.stepIds else None
    )

    # Topological sort the graph
    sorted_nodes = _topological_sort(pipeline.nodes, pipeline.edges)

    # Walk state: results dict keyed by node ID
    results: dict[str, ExecutionStepResult] = {}
    # Upstream provider context: maps a node ID to its nearest provider node
    provider_cache: dict[str, PipelineNode] = {}

    # Identify Browser/Search nodes upstream of Chat nodes — these are handled
    # as callable tools within the Chat's tool-calling loop and should NOT
    # execute standalone.
    chat_upstream_tools: set[str] = set()
    for node in pipeline.nodes:
        if node.type == NodeType.CHAT:
            tool_nodes = _find_connected_tool_nodes(
                node.id, pipeline.edges, node_map, {NodeType.BROWSER, NodeType.SEARCH}
            )
            for tn in tool_nodes:
                chat_upstream_tools.add(tn.id)

    for node in sorted_nodes:
        if selected_ids and node.id not in selected_ids:
            continue

        provider = _find_upstream_provider(
            node.id, pipeline.edges, node_map, provider_cache
        )

        # Skip if upstream dependency has an error
        skip_node = False
        if node.type in (NodeType.CHAT, NodeType.MCP, NodeType.BROWSER, NodeType.SEARCH, NodeType.OBSERVER, NodeType.MEMORY, NodeType.CONTEXT, NodeType.THREAD, NodeType.SKILL, NodeType.SUBAGENT, NodeType.CODE_SANDBOX, NodeType.TTS, NodeType.LOCAL_MODEL):
            for edge in pipeline.edges:
                if edge.target == node.id and edge.source in results:
                    upstream = results[edge.source]
                    if upstream.error:
                        results[node.id] = ExecutionStepResult(
                            stepId=node.id,
                            nodeType=node.type.value,
                            error=f"Skipped: upstream node '{edge.source}' failed: {upstream.error}",
                        )
                        skip_node = True
                        break
        if skip_node:
            continue

        if node.type == NodeType.PROVIDER:
            result = _handle_provider(node)
        elif node.type == NodeType.CHAT:
            result = await _handle_chat(
                node, provider, auth_header, pipeline.edges, node_map
            )
        elif node.type == NodeType.MCP:
            result = await _handle_mcp(node, provider, auth_header, results)
        elif node.type == NodeType.OBSERVER:
            result = _handle_observer(node, pipeline.edges, node_map, results)
        elif node.type == NodeType.BROWSER:
            if node.id in chat_upstream_tools:
                # This Browser node is a callable tool for a Chat node — skip standalone execution
                results[node.id] = ExecutionStepResult(
                    stepId=node.id,
                    nodeType=NodeType.BROWSER.value,
                    curl="# Browser: handled as callable tool in Chat node",
                    request={"delegated_to_chat": True},
                    response={"status": "handled_as_tool", "note": "Browser is available as a callable tool to the Chat node's LLM"},
                )
                continue
            result = await _handle_browser(node)
        elif node.type == NodeType.SEARCH:
            if node.id in chat_upstream_tools:
                # This Search node is a callable tool for a Chat node — skip standalone execution
                results[node.id] = ExecutionStepResult(
                    stepId=node.id,
                    nodeType=NodeType.SEARCH.value,
                    curl="# Search: handled as callable tool in Chat node",
                    request={"delegated_to_chat": True},
                    response={"status": "handled_as_tool", "note": "Search is available as a callable tool to the Chat node's LLM"},
                )
                continue
            result = await _handle_search(node)
        elif node.type == NodeType.MEMORY:
            result = await _handle_memory(node)
        elif node.type == NodeType.CONTEXT:
            result = _handle_context(node)
        elif node.type == NodeType.THREAD:
            result = await _handle_thread(node, pipeline.edges, node_map, results)
        elif node.type == NodeType.SKILL:
            result = _handle_skill(node)
        elif node.type == NodeType.SUBAGENT:
            result = await _handle_subagent(node, auth_header, pipeline.edges, node_map)
        elif node.type == NodeType.CODE_SANDBOX:
            result = _handle_code_sandbox(node)
        elif node.type == NodeType.TTS:
            result = _handle_tts(node, results, pipeline.edges)
        elif node.type == NodeType.LOCAL_MODEL:
            result = _handle_local_model(node)
        else:
            result = ExecutionStepResult(
                stepId=node.id,
                nodeType=node.type.value,
                error=f"Unknown node type: {node.type}",
            )

        results[node.id] = result

    # Return results in the original topological order, filtered by selection
    return [
        results[n.id]
        for n in sorted_nodes
        if n.id in results
    ]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _topological_sort(
    nodes: list[PipelineNode],
    edges: list[PipelineEdge],
) -> list[PipelineNode]:
    """Kahn's algorithm for topological ordering. Raises ValueError if cycle detected."""
    from collections import deque
    node_map = {n.id: n for n in nodes}
    adj: dict[str, list[str]] = {n.id: [] for n in nodes}
    in_degree: dict[str, int] = {n.id: 0 for n in nodes}

    for edge in edges:
        if edge.source in adj and edge.target in adj:
            adj[edge.source].append(edge.target)
            in_degree[edge.target] = in_degree.get(edge.target, 0) + 1

    queue: deque[str] = deque(nid for nid, deg in in_degree.items() if deg == 0)
    sorted_list: list[PipelineNode] = []

    while queue:
        nid = queue.popleft()
        sorted_list.append(node_map[nid])
        for neighbor in adj[nid]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(sorted_list) != len(nodes):
        raise ValueError(
            f"Cycle detected in pipeline graph: {len(sorted_list)}/{len(nodes)} nodes processed"
        )

    return sorted_list


def _find_upstream_provider(
    node_id: str,
    edges: list[PipelineEdge],
    node_map: dict[str, PipelineNode],
    cache: dict[str, PipelineNode],
) -> Optional[PipelineNode]:
    """Walk upstream through edges to find the nearest provider node."""
    if node_id in cache:
        return cache[node_id]

    # Build reverse adjacency (child → parents)
    reverse_adj: dict[str, list[str]] = {}
    for edge in edges:
        reverse_adj.setdefault(edge.target, []).append(edge.source)

    visited: set[str] = set()
    queue = [node_id]

    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        node = node_map.get(current)
        if node and node.type == NodeType.PROVIDER:
            cache[node_id] = node
            return node
        for parent in reverse_adj.get(current, []):
            queue.append(parent)

    cache[node_id] = None
    return None


def _find_upstream_mcp_nodes(
    node_id: str,
    edges: list[PipelineEdge],
    node_map: dict[str, PipelineNode],
) -> list[PipelineNode]:
    """Walk upstream through edges to find MCP nodes connected to the given node."""
    # Build reverse adjacency (child → parents)
    reverse_adj: dict[str, list[str]] = {}
    for edge in edges:
        reverse_adj.setdefault(edge.target, []).append(edge.source)

    visited: set[str] = set()
    queue = [node_id]
    mcp_nodes: list[PipelineNode] = []

    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        node = node_map.get(current)
        if node and node.type == NodeType.MCP:
            mcp_nodes.append(node)
        for parent in reverse_adj.get(current, []):
            if parent not in visited:
                queue.append(parent)

    return mcp_nodes


def _collect_mcp_tools(mcp_nodes: list[PipelineNode]) -> list[dict]:
    """Collect tool definitions from MCP nodes into OpenAI tool-calling format.

    Each MCP node's config has ``discoveredTools`` — a list of dicts with
    ``name``, ``description``, and ``inputSchema`` keys (set by the frontend
    after calling the MCP server's list-tools endpoint).

    Returns:
        List of OpenAI-compatible tool definitions, or empty list if none found.
    """
    tools: list[dict] = []
    for mcp_node in mcp_nodes:
        config = mcp_node.data.config
        discovered = config.get("discoveredTools", [])
        if not discovered:
            continue
        for tool in discovered:
            if not isinstance(tool, dict):
                continue
            tool_name = tool.get("name", "")
            if not tool_name:
                continue
            tools.append({
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": tool.get("description", ""),
                    "parameters": tool.get("inputSchema", {}),
                },
            })
    return tools


def _find_mcp_node_for_tool(
    mcp_nodes: list[PipelineNode],
    tool_name: str,
) -> Optional[PipelineNode]:
    """Find the MCP node whose ``discoveredTools`` includes *tool_name*."""
    for node in mcp_nodes:
        discovered = node.data.config.get("discoveredTools", [])
        for tool in discovered:
            if isinstance(tool, dict) and tool.get("name") == tool_name:
                return node
    return None


def _find_connected_tool_nodes(
    node_id: str,
    edges: list[PipelineEdge],
    node_map: dict[str, PipelineNode],
    tool_types: set[NodeType],
) -> list[PipelineNode]:
    """Walk ALL graph connections (bidirectional) to find nodes of specific tool types.

    Unlike _find_upstream_mcp_nodes which only walks upstream (parents),
    this function walks both directions so Browser/Search nodes anywhere
    in the graph connected to a Chat node register as callable tools.
    """
    # Build bidirectional adjacency
    adj: dict[str, list[str]] = {}
    for edge in edges:
        adj.setdefault(edge.source, []).append(edge.target)
        adj.setdefault(edge.target, []).append(edge.source)

    visited: set[str] = set()
    queue = [node_id]
    tool_nodes: list[PipelineNode] = []

    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        node = node_map.get(current)
        if node and node.type in tool_types:
            tool_nodes.append(node)
        for neighbor in adj.get(current, []):
            if neighbor not in visited:
                queue.append(neighbor)

    return tool_nodes


def _find_upstream_context_nodes(
    node_id: str,
    edges: list[PipelineEdge],
    node_map: dict[str, PipelineNode],
) -> list[PipelineNode]:
    """Walk upstream edges (source → target) to find connected Context nodes.

    Only walks incoming edges (target == node_id) so only nodes whose
    output flows *into* this Chat node are included.
    """
    # Build reverse adjacency (target → list[sources])
    upstream_adj: dict[str, list[str]] = {}
    for edge in edges:
        upstream_adj.setdefault(edge.target, []).append(edge.source)

    visited: set[str] = set()
    queue = [node_id]
    context_nodes: list[PipelineNode] = []

    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        node = node_map.get(current)
        if node and node.type == NodeType.CONTEXT:
            context_nodes.append(node)
        for parent in upstream_adj.get(current, []):
            if parent not in visited:
                queue.append(parent)

    return context_nodes


def _inject_context_content(
    messages: list[dict],
    context_nodes: list[PipelineNode],
) -> list[dict]:
    """Inject content from upstream Context nodes into the messages array.

    Each Context node's config includes:
      - ``content`` — the text to inject
      - ``enabled`` — toggle (default True)
      - ``position`` — ``prepend_system`` (default) or ``append_user``

    ``prepend_system``: prepend context to the existing system message,
    or create one if none exists.

    ``append_user``: append context to the last user message, or add a
    new user message if none exists.
    """
    if not context_nodes:
        return messages

    # Separate context by position
    system_contexts: list[str] = []
    user_contexts: list[str] = []

    for ctx in context_nodes:
        cfg = ctx.data.config
        if not cfg.get("enabled", True):
            continue
        content = (cfg.get("content") or "").strip()
        if not content:
            continue
        position = cfg.get("position", "prepend_system")
        if position == "prepend_system":
            system_contexts.append(content)
        else:
            user_contexts.append(content)

    result = list(messages)

    # Inject system contexts
    if system_contexts:
        joined = "\n\n".join(system_contexts)
        # Find existing system message
        sys_idx = None
        for i, m in enumerate(result):
            if m.get("role") == "system":
                sys_idx = i
                break
        if sys_idx is not None:
            # Prepend to existing system content
            existing = result[sys_idx].get("content", "")
            result[sys_idx]["content"] = joined + "\n\n" + existing
        else:
            # Insert new system message at the front
            result.insert(0, {"role": "system", "content": joined})

    # Inject user contexts — append to last user message or create one
    if user_contexts:
        joined = "\n\n".join(user_contexts)
        # Find the last user message
        last_user_idx = None
        for i in range(len(result) - 1, -1, -1):
            if result[i].get("role") == "user":
                last_user_idx = i
                break
        if last_user_idx is not None:
            existing = result[last_user_idx].get("content", "")
            result[last_user_idx]["content"] = existing + "\n\n" + joined
        else:
            result.append({"role": "user", "content": joined})

    return result


BUILTIN_TOOL_DEFINITIONS: dict[str, dict] = {
    "browser_fetch": {
        "type": "function",
        "function": {
            "name": "browser_fetch",
            "description": "Fetch a web page and extract its text content. Use this to read web pages, documentation, news articles, or any online content. Provide the full URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "The full URL to fetch (e.g. https://example.com/page)"},
                    "render_js": {"type": "boolean", "description": "Whether to render JavaScript for modern SPAs", "default": False},
                },
                "required": ["url"],
            },
        },
    },
    "web_search": {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web using DuckDuckGo. Use this to find current information, news, documentation, or data on any topic.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query string"},
                    "count": {"type": "integer", "description": "Number of results to return (1-20)", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
}


def _collect_builtin_tools(tool_nodes: list[PipelineNode]) -> list[dict]:
    """Collect tool definitions from Browser and Search nodes into OpenAI tool-calling format.

    Browser nodes add ``browser_fetch``, Search nodes add ``web_search``.
    Deduplicates so the LLM sees each tool definition once regardless of how
    many Browser/Search nodes are connected.
    """
    tools: list[dict] = []
    seen: set[str] = set()
    for tool_node in tool_nodes:
        if tool_node.type == NodeType.BROWSER and "browser_fetch" not in seen:
            tools.append(BUILTIN_TOOL_DEFINITIONS["browser_fetch"])
            seen.add("browser_fetch")
        elif tool_node.type == NodeType.SEARCH and "web_search" not in seen:
            tools.append(BUILTIN_TOOL_DEFINITIONS["web_search"])
            seen.add("web_search")
    return tools


# ---------------------------------------------------------------------------
# Node-type handlers
# ---------------------------------------------------------------------------


def _handle_provider(node: PipelineNode) -> ExecutionStepResult:
    """Provider nodes just record their config as context."""
    # Provider nodes don't make external calls; they just provide context.
    config = node.data.config
    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.PROVIDER.value,
        request=config,
        response={
            "status": "context_registered",
            "endpoint": config.get("endpoint", ""),
            "model": config.get("model", ""),
        },
        curl=f"# Provider context: {config.get('label', node.data.label)}",
    )


async def _handle_chat(
    node: PipelineNode,
    provider: Optional[PipelineNode],
    auth_header: Optional[str],
    edges: list[PipelineEdge],
    node_map: dict[str, PipelineNode],
) -> ExecutionStepResult:
    """
    Call the LLM provider for a chat node with optional MCP tool support.

    Builds an OpenAI-compatible chat completions request from the node's
    config and forwards the Authorization header.  If MCP nodes are
    connected upstream, their tool definitions are included in the request
    and the LLM can call them in a tool-calling loop (capped at
    ``MAX_TOOL_CALL_ITERATIONS`` rounds).
    """
    config = node.data.config

    # Determine the endpoint URL and model
    endpoint = ""
    model = ""

    if provider:
        p_config = provider.data.config
        endpoint = p_config.get("endpoint", "")
        model = p_config.get("model", config.get("model", "gpt-4o"))
    else:
        # Fallback: try to get endpoint/model from the node's own config
        endpoint = config.get("endpoint", "")
        model = config.get("model", "gpt-4o")

    if not endpoint:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.CHAT.value,
            error="No provider endpoint configured. Connect a Provider node upstream.",
        )

    # SSRF check
    if not _validate_endpoint_url(endpoint):
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.CHAT.value,
            error=f"Blocked endpoint URL (private/internal IP not allowed): {endpoint}",
        )

    url = endpoint.rstrip("/") + "/chat/completions"

    # Build the messages array
    system_prompt = config.get("systemPrompt", "")
    messages_raw = config.get("messages", [])

    messages: list[dict] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.extend(messages_raw)

    if not messages:
        # Default message if nothing configured
        messages.append({"role": "user", "content": "Hello"})

    temperature = config.get("temperature", 0.7)
    max_tokens = config.get("max_tokens", 4096)

    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    # Find upstream Context nodes and inject their content into messages
    context_nodes = _find_upstream_context_nodes(node.id, edges, node_map)
    messages = _inject_context_content(messages, context_nodes)

    # Find upstream MCP tools and include them in the request
    mcp_nodes = _find_upstream_mcp_nodes(node.id, edges, node_map)
    mcp_tools = _collect_mcp_tools(mcp_nodes)
    
    # Find upstream Browser/Search nodes and add them as callable tools too
    tool_nodes = _find_connected_tool_nodes(
        node.id, edges, node_map, {NodeType.BROWSER, NodeType.SEARCH}
    )
    builtin_tools = _collect_builtin_tools(tool_nodes)
    
    all_tools = mcp_tools + builtin_tools
    if all_tools:
        body["tools"] = all_tools

    # Additional params from config (e.g. response_format, stop, top_p)
    # Note: "tools" and "tool_choice" come from discovered MCP tools above,
    # not from the static config (which may have stale values).
    for key in ("response_format", "stop", "top_p"):
        if key in config:
            body[key] = config[key]
    # Allow explicit tool_choice from config if present (e.g. "auto", "none",
    # or a specific tool name)
    if "tool_choice" in config:
        body["tool_choice"] = config["tool_choice"]

    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if auth_header:
        headers["Authorization"] = auth_header

    curl = generate_curl("POST", url, headers, body)

    # Track tool-call history for the result
    tool_call_records: list[dict] = []

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            response_data = resp.json()

            # -----------------------------------------------------------------
            # Tool-calling loop
            # -----------------------------------------------------------------
            tool_call_count = 0
            while tool_call_count < MAX_TOOL_CALL_ITERATIONS:
                choice = response_data.get("choices", [{}])[0]
                message = choice.get("message", {})
                tool_calls = message.get("tool_calls")

                if not tool_calls:
                    break

                # Record this round for the result
                record = {
                    "assistant_message": {
                        "role": "assistant",
                        "content": message.get("content"),
                        "tool_calls": tool_calls,
                    },
                    "results": [],
                }
                tool_call_records.append(record)

                # Append the assistant message with tool_calls to the history
                messages.append({
                    "role": "assistant",
                    "content": message.get("content") or None,
                    "tool_calls": tool_calls,
                })

                # Process each tool call
                for tc in tool_calls:
                    func_name = tc["function"]["name"]
                    try:
                        arguments = json.loads(tc["function"]["arguments"])
                    except (json.JSONDecodeError, KeyError):
                        arguments = {}

                    # Find which MCP node provides this tool
                    mcp_node = _find_mcp_node_for_tool(mcp_nodes, func_name)

                    if mcp_node is not None:
                        server_url = mcp_node.data.config.get("serverUrl", "")
                        if not server_url:
                            result_content = json.dumps(
                                {
                                    "error": f"No server URL configured for tool: {func_name}"
                                }
                            )
                        else:
                            try:
                                from app.mcp_client import call_tool

                                tool_result = await call_tool(
                                    server_url,
                                    func_name,
                                    arguments,
                                    headers=headers,
                                )
                                result_content = json.dumps(tool_result)
                            except Exception as exc:
                                result_content = json.dumps(
                                    {"error": str(exc)}
                                )
                    elif func_name == "browser_fetch":
                        try:
                            from app.tools import fetch_page
                            fetch_url = arguments.get("url", "")
                            render_js = arguments.get("render_js", False)
                            if not fetch_url:
                                result_content = json.dumps({"error": "No URL provided for browser_fetch"})
                            else:
                                tool_result = await fetch_page(fetch_url, render_js=render_js)
                                result_content = json.dumps(tool_result)
                        except Exception as exc:
                            result_content = json.dumps({"error": str(exc)})
                    elif func_name == "web_search":
                        try:
                            from app.tools import web_search
                            query = arguments.get("query", "")
                            count = arguments.get("count", 5)
                            if not query:
                                result_content = json.dumps({"error": "No search query provided for web_search"})
                            else:
                                tool_result = await web_search(query, count)
                                result_content = json.dumps(tool_result)
                        except Exception as exc:
                            result_content = json.dumps({"error": str(exc)})
                    else:
                        result_content = json.dumps(
                            {"error": f"Unknown tool: {func_name}"}
                        )

                    # Append the tool result as a new message
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": result_content,
                    })

                    record["results"].append({
                        "tool_call_id": tc["id"],
                        "tool_name": func_name,
                        "arguments": arguments,
                        "result": result_content,
                    })

                tool_call_count += 1
                body["messages"] = messages

                # Call the LLM again with the updated conversation
                resp = await client.post(url, json=body, headers=headers)
                resp.raise_for_status()
                response_data = resp.json()

            if tool_call_count >= MAX_TOOL_CALL_ITERATIONS:
                # Append a warning to the final message
                warning = (
                    "\n\n[Tool-calling loop reached maximum iterations "
                    f"({MAX_TOOL_CALL_ITERATIONS})]"
                )
                if response_data.get("choices"):
                    msg = response_data["choices"][0].get("message", {})
                    existing = msg.get("content") or ""
                    msg["content"] = existing + warning

    except httpx.HTTPError as exc:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.CHAT.value,
            curl=curl,
            request={"url": url, "headers": _safe_headers(headers), "body": body},
            response={},
            error=f"LLM API error: {exc}",
        )

    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.CHAT.value,
        curl=curl,
        request={"url": url, "headers": _safe_headers(headers), "body": body},
        response=response_data,
        tool_calls=tool_call_records if tool_call_records else None,
    )


async def _handle_mcp(
    node: PipelineNode,
    provider: Optional[PipelineNode],
    auth_header: Optional[str],
    previous_results: dict[str, ExecutionStepResult],
) -> ExecutionStepResult:
    """Call an MCP tool on the configured server."""
    config = node.data.config
    server_url = config.get("serverUrl", "")
    tool_name = config.get("selectedTool", config.get("toolName", ""))
    tool_args = config.get("toolArgs", config.get("arguments", {}))

    if not server_url:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.MCP.value,
            error="No MCP server URL configured.",
        )

    if not tool_name:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.MCP.value,
            error="No tool selected for MCP node.",
        )

    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if auth_header:
        headers["Authorization"] = auth_header

    # Build the JSON-RPC payload for curl display
    body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": tool_args},
    }

    curl = generate_curl("POST", server_url, headers, body)

    try:
        from app.mcp_client import call_tool

        result = await call_tool(server_url, tool_name, tool_args, headers=headers)

        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.MCP.value,
            curl=curl,
            request={
                "url": server_url,
                "headers": _safe_headers(headers),
                "tool": tool_name,
                "arguments": tool_args,
            },
            response=result,
        )
    except Exception as exc:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.MCP.value,
            curl=curl,
            request={
                "url": server_url,
                "headers": _safe_headers(headers),
                "tool": tool_name,
                "arguments": tool_args,
            },
            response={},
            error=f"MCP call error: {exc}",
        )


async def _handle_browser(node: PipelineNode) -> ExecutionStepResult:
    """Fetch a URL using the browser tool."""
    config = node.data.config
    url = config.get("url", "")
    render_js = config.get("renderJs", False)
    
    if not url:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.BROWSER.value,
            error="No URL configured.",
        )
    
    from app.tools import fetch_page
    curl = f"curl -s '{url}'"
    
    try:
        result = await fetch_page(url, render_js=render_js)
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.BROWSER.value,
            curl=curl,
            request={"url": url, "render_js": render_js},
            response=result,
        )
    except Exception as exc:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.BROWSER.value,
            curl=curl,
            request={"url": url, "render_js": render_js},
            response={},
            error=f"Browser error: {exc}",
        )


async def _handle_search(node: PipelineNode) -> ExecutionStepResult:
    """Perform a web search."""
    import urllib.parse
    config = node.data.config
    query = config.get("query", "")
    count = config.get("count", 5)
    
    if not query:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.SEARCH.value,
            error="No search query configured.",
        )
    
    from app.tools import web_search
    safe_query = urllib.parse.quote_plus(query)
    curl = f"curl -s 'https://duckduckgo.com/?q={safe_query}'"
    
    try:
        result = await web_search(query, count)
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.SEARCH.value,
            curl=curl,
            request={"query": query, "count": count},
            response=result,
        )
    except Exception as exc:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.SEARCH.value,
            curl=curl,
            request={"query": query, "count": count},
            response={},
            error=f"Search error: {exc}",
        )


async def _handle_memory(node: PipelineNode) -> ExecutionStepResult:
    """Handle a memory node: store, retrieve, or list key/value entries."""
    config = node.data.config
    action = config.get("action", "store")
    namespace = config.get("namespace", "default")
    key = config.get("key", "")
    value = config.get("value", "")

    if action == "store":
        if not key:
            return ExecutionStepResult(
                stepId=node.id,
                nodeType=NodeType.MEMORY.value,
                error="No 'key' configured for store action.",
            )
        if namespace not in MEMORY_STORE:
            MEMORY_STORE[namespace] = {}
        MEMORY_STORE[namespace][key] = value
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.MEMORY.value,
            curl=f"# Memory store: namespace={namespace}, key={key}",
            request={"action": "store", "namespace": namespace, "key": key},
            response={"status": "stored", "namespace": namespace, "key": key, "value": value},
        )

    elif action == "retrieve":
        if not key:
            return ExecutionStepResult(
                stepId=node.id,
                nodeType=NodeType.MEMORY.value,
                error="No 'key' configured for retrieve action.",
            )
        ns = MEMORY_STORE.get(namespace, {})
        stored_value = ns.get(key)
        if stored_value is None:
            return ExecutionStepResult(
                stepId=node.id,
                nodeType=NodeType.MEMORY.value,
                error=f"Key '{key}' not found in namespace '{namespace}'.",
            )
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.MEMORY.value,
            curl=f"# Memory retrieve: namespace={namespace}, key={key}",
            request={"action": "retrieve", "namespace": namespace, "key": key},
            response={"key": key, "value": stored_value},
        )

    elif action == "list":
        ns = MEMORY_STORE.get(namespace, {})
        entries = [{"key": k, "value": v} for k, v in ns.items()]
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.MEMORY.value,
            curl=f"# Memory list: namespace={namespace}",
            request={"action": "list", "namespace": namespace},
            response={"namespace": namespace, "entries": entries},
        )

    else:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.MEMORY.value,
            error=f"Unknown memory action: '{action}'. Use 'store', 'retrieve', or 'list'.",
        )


def _handle_context(node: PipelineNode) -> ExecutionStepResult:
    """Handle a context node: return the configured content as a record."""
    config = node.data.config
    content = config.get("content", "")
    enabled = config.get("enabled", True)
    position = config.get("position", "prepend_system")

    if not enabled:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.CONTEXT.value,
            curl="# Context node: disabled",
            request={"enabled": False},
            response={"status": "skipped", "reason": "context_not_enabled"},
        )

    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.CONTEXT.value,
        curl=f"# Context: {content[:60]}{'...' if len(content) > 60 else ''}",
        request={"content": content, "enabled": enabled, "position": position},
        response={
            "status": "context_registered",
            "content": content,
            "position": position,
        },
    )


async def _handle_thread(
    node: PipelineNode,
    edges: list[PipelineEdge],
    node_map: dict[str, PipelineNode],
    previous_results: dict[str, ExecutionStepResult],
) -> ExecutionStepResult:
    """Handle a thread node: execute downstream nodes in parallel or sequential mode."""
    config = node.data.config
    mode = config.get("mode", "sequential")

    # Find immediate downstream nodes
    downstream_ids = [e.target for e in edges if e.source == node.id]
    downstream_nodes = [
        node_map[nid] for nid in downstream_ids if nid in node_map
    ]

    if not downstream_nodes:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.THREAD.value,
            curl=f"# Thread ({mode}): no downstream nodes",
            request={"mode": mode, "downstream": []},
            response={"status": "no_downstream_nodes"},
        )

    downstream_configs = [
        {"id": n.id, "type": n.type.value, "label": n.data.label}
        for n in downstream_nodes
    ]

    if mode == "parallel":
        # Execute all downstream nodes concurrently
        async def _run_downstream(n: PipelineNode) -> tuple[str, ExecutionStepResult]:
            # Simple passthrough: each downstream node will be executed
            # by the main loop. Here we just collect already-executed results
            # that appear in previous_results.
            if n.id in previous_results:
                return n.id, previous_results[n.id]
            return n.id, ExecutionStepResult(
                stepId=n.id,
                nodeType=n.type.value,
                error="Not yet executed (parallel thread collects prior results)",
            )

        tasks = [_run_downstream(n) for n in downstream_nodes]
        collected = await asyncio.gather(*tasks)
        combined = dict(collected)

        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.THREAD.value,
            curl=f"# Thread (parallel): {len(downstream_nodes)} downstream node(s)",
            request={"mode": "parallel", "downstream": downstream_configs},
            response={
                "mode": "parallel",
                "results": {
                    nid: {
                        "stepId": r.stepId,
                        "nodeType": r.nodeType,
                        "response": r.response,
                        "error": r.error,
                    }
                    for nid, r in combined.items()
                },
            },
        )

    else:
        # Sequential mode: process downstream nodes one by one
        sequential_results: dict[str, dict] = {}
        for n in downstream_nodes:
            if n.id in previous_results:
                r = previous_results[n.id]
                sequential_results[n.id] = {
                    "stepId": r.stepId,
                    "nodeType": r.nodeType,
                    "response": r.response,
                    "error": r.error,
                }
            else:
                sequential_results[n.id] = {
                    "stepId": n.id,
                    "nodeType": n.type.value,
                    "error": "Not yet executed (sequential thread collects prior results)",
                }

        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.THREAD.value,
            curl=f"# Thread (sequential): {len(downstream_nodes)} downstream node(s)",
            request={"mode": "sequential", "downstream": downstream_configs},
            response={
                "mode": "sequential",
                "results": sequential_results,
            },
        )  # end of _handle_thread


PRESET_SKILLS = [
    {"id": "shell", "name": "Shell", "description": "Bash/Zsh command-line interface — run scripts, pipe output, file operations", "category": "core"},
    {"id": "git", "name": "Git", "description": "Version control — clone, commit, push, branch, merge", "category": "dev"},
    {"id": "docker", "name": "Docker", "description": "Container management — build, run, compose, exec", "category": "dev"},
    {"id": "python", "name": "Python", "description": "Python 3 runtime with pip — execute .py scripts, install packages", "category": "runtime"},
    {"id": "node", "name": "Node.js", "description": "JavaScript runtime with npm — run .js/.ts, install packages", "category": "runtime"},
    {"id": "curl", "name": "cURL", "description": "HTTP client — GET/POST/PUT/DELETE requests to any URL", "category": "net"},
    {"id": "ssh", "name": "SSH", "description": "Remote access — connect to servers, tunnel ports", "category": "net"},
    {"id": "make", "name": "Make", "description": "Build tool — run Makefile targets for compilation and automation", "category": "dev"},
    {"id": "jq", "name": "jq", "description": "JSON processor — filter, transform, query JSON data from CLI", "category": "tool"},
    {"id": "grep", "name": "grep/rg", "description": "Text search — find patterns across files with ripgrep or grep", "category": "tool"},
]


def _handle_skill(node: PipelineNode) -> ExecutionStepResult:
    """Handle a skill node: return the list of enabled environment skills as context."""
    config = node.data.config
    enabled_skills = config.get("enabledSkills", [s["id"] for s in PRESET_SKILLS])
    selected = [s for s in PRESET_SKILLS if s["id"] in enabled_skills]
    summary = ", ".join(s["name"] for s in selected)
    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.SKILL.value,
        curl=f"# Environment skills ({len(selected)} enabled): {summary}",
        request={"enabledSkills": enabled_skills},
        response={
            "status": "skills_registered",
            "all_skills": PRESET_SKILLS,
            "enabled": selected,
            "count": len(selected),
        },
    )


PRESET_SUBAGENT_ROLES = [
    {
        "name": "Code Writer",
        "systemPrompt": "You are a coding agent. Write clean, well-documented code. You have access to programming tools and can create, read, and modify files. Think step by step before writing code.",
        "maxIterations": 8,
        "allowedMcpTools": [],
        "enabledSkills": ["python", "node", "git", "shell"],
    },
    {
        "name": "Data Analyst",
        "systemPrompt": "You are a data analysis agent. You work with data files, run statistical analysis, and create visualizations. Be thorough and explain your methodology.",
        "maxIterations": 10,
        "allowedMcpTools": [],
        "enabledSkills": ["python", "shell", "jq"],
    },
    {
        "name": "Web Researcher",
        "systemPrompt": "You are a web research agent. You search the web, fetch pages, and synthesize information. Always cite sources and be factual.",
        "maxIterations": 6,
        "allowedMcpTools": [],
        "enabledSkills": ["curl", "shell", "python"],
    },
    {
        "name": "Debugger",
        "systemPrompt": "You are a debugging agent. You analyze error messages, trace through code logic, and identify bugs. Be systematic: reproduce, isolate, identify, fix.",
        "maxIterations": 12,
        "allowedMcpTools": [],
        "enabledSkills": ["python", "node", "shell", "git", "grep"],
    },
    {
        "name": "Shell Operator",
        "systemPrompt": "You are a shell operations agent. You run commands, manipulate files, and manage processes. Be careful with destructive operations and verify before acting.",
        "maxIterations": 8,
        "allowedMcpTools": [],
        "enabledSkills": ["shell", "ssh", "curl", "git", "docker", "make", "jq", "grep"],
    },
]

IN_MEMORY_SUBAGENT_ROLES: dict[str, dict] = {role['name']: role for role in PRESET_SUBAGENT_ROLES}


def _handle_observer(
    node: PipelineNode,
    edges: list[PipelineEdge],
    node_map: dict[str, PipelineNode],
    previous_results: dict[str, ExecutionStepResult],
) -> ExecutionStepResult:
    """
    Observer nodes capture request/response data from their upstream nodes.

    This is a passive node — it collects and annotates data generated by
    nodes that feed into it via graph edges.
    """
    # Find upstream nodes
    upstream_ids = [e.source for e in edges if e.target == node.id]
    captured = []

    for uid in upstream_ids:
        if uid in previous_results:
            prev = previous_results[uid]
            captured.append({
                "nodeId": uid,
                "nodeType": prev.nodeType,
                "request": prev.request,
                "response": prev.response,
                "curl": prev.curl,
                "error": prev.error,
                "label": node_map.get(uid, node_map.get(uid)).data.label
                if node_map.get(uid)
                else uid,
            })

    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.OBSERVER.value,
        curl=f"# Observer captures {len(captured)} step(s)",
        request={"captured": [c["nodeId"] for c in captured]},
        response={"captured": captured},
    )


async def _handle_subagent(
    node: PipelineNode,
    auth_header: Optional[str],
    edges: list[PipelineEdge],
    node_map: dict[str, PipelineNode],
) -> ExecutionStepResult:
    """Handle a subagent node: run an autonomous agent with a specific role."""
    config = node.data.config
    role_name = config.get("roleName", "Code Writer")
    role_override = config.get("customRole", None)
    
    # Resolve role
    if role_override and role_override.get("name"):
        role = role_override
    else:
        role = IN_MEMORY_SUBAGENT_ROLES.get(role_name, PRESET_SUBAGENT_ROLES[0])
    
    system_prompt = role.get("systemPrompt", "You are a helpful AI agent.")
    max_iterations = role.get("maxIterations", 5)
    allowed_tools = role.get("allowedMcpTools", [])
    enabled_skills = role.get("enabledSkills", [])
    
    # Collect task from upstream nodes or config
    task = config.get("task", "")
    if not task:
        task = "Complete the assigned task using your available tools and skills."
    
    # Build skill context
    skill_context = ""
    if enabled_skills:
        skill_context = "You have access to the following environment skills:\n"
        skill_map = {
            "shell": "Shell (bash) — run commands, pipe output, file operations",
            "git": "Git — clone, commit, push, branch, merge",
            "docker": "Docker — build, run, compose, exec",
            "python": "Python 3 — run scripts, pip install",
            "node": "Node.js — run JS/TS, npm install",
            "curl": "cURL — HTTP GET/POST to any URL",
            "ssh": "SSH — remote access, port tunnels",
            "make": "Make — build automation via Makefile",
            "jq": "jq — JSON processor, filter and transform",
            "grep": "grep/ripgrep — pattern search in files",
        }
        for s in enabled_skills:
            desc = skill_map.get(s, s)
            skill_context += f"  - {s}: {desc}\n"
    
    # Determine provider endpoint
    provider = _find_upstream_provider(node.id, edges, node_map, {})
    endpoint = ""
    model = ""
    if provider:
        p_config = provider.data.config
        endpoint = p_config.get("endpoint", "")
        model = p_config.get("model", "gpt-4o")
    
    if not endpoint:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.SUBAGENT.value,
            error="No provider endpoint configured.",
        )
    
    if not _validate_endpoint_url(endpoint):
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.SUBAGENT.value,
            error=f"Blocked endpoint URL: {endpoint}",
        )
    
    url = endpoint.rstrip("/") + "/chat/completions"
    
    # Collect MCP tools (filtered by allowed_tools if specified)
    mcp_nodes = _find_upstream_mcp_nodes(node.id, edges, node_map)
    all_tools = _collect_mcp_tools(mcp_nodes)
    if allowed_tools:
        tools = [t for t in all_tools if t.get("function", {}).get("name") in allowed_tools]
    else:
        tools = all_tools
    
    # Build messages
    messages: list[dict] = []
    
    # Full system prompt with skills
    full_system = system_prompt
    if skill_context:
        full_system += "\n\n## Environment Skills\n" + skill_context
    if tools:
        tool_names = [t["function"]["name"] for t in tools if "function" in t]
        full_system += f"\n## Available MCP Tools\nYou can call these tools: {', '.join(tool_names)}"
    full_system += "\n\nWhen you need to use a tool, call it directly. After receiving the result, continue working toward completing the task."
    
    messages.append({"role": "system", "content": full_system})
    messages.append({"role": "user", "content": task})
    
    temperature = config.get("temperature", 0.7)
    
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    
    if tools:
        body["tools"] = tools
    
    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if auth_header:
        headers["Authorization"] = auth_header
    
    curl = generate_curl("POST", url, headers, body)
    
    tool_call_records: list[dict] = []
    tool_call_count = 0
    response_data = {}
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            response_data = resp.json()
            
            # Tool-calling loop (same pattern as _handle_chat but with role's max_iterations)
            while tool_call_count < max_iterations:
                choice = response_data.get("choices", [{}])[0]
                message = choice.get("message", {})
                tool_calls = message.get("tool_calls")
                
                if not tool_calls:
                    break
                
                record = {
                    "assistant_message": {
                        "role": "assistant",
                        "content": message.get("content"),
                        "tool_calls": tool_calls,
                    },
                    "results": [],
                }
                tool_call_records.append(record)
                
                messages.append({
                    "role": "assistant",
                    "content": message.get("content") or None,
                    "tool_calls": tool_calls,
                })
                
                for tc in tool_calls:
                    func_name = tc["function"]["name"]
                    try:
                        arguments = json.loads(tc["function"]["arguments"])
                    except (json.JSONDecodeError, KeyError):
                        arguments = {}
                    
                    mcp_node = _find_mcp_node_for_tool(mcp_nodes, func_name)
                    
                    if mcp_node is None:
                        result_content = json.dumps({"error": f"Unknown tool: {func_name}"})
                    else:
                        server_url = mcp_node.data.config.get("serverUrl", "")
                        if not server_url:
                            result_content = json.dumps({"error": f"No server URL for tool: {func_name}"})
                        else:
                            try:
                                from app.mcp_client import call_tool
                                tool_result = await call_tool(server_url, func_name, arguments, headers=headers)
                                result_content = json.dumps(tool_result)
                            except Exception as exc:
                                result_content = json.dumps({"error": str(exc)})
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": result_content,
                    })
                    
                    record["results"].append({
                        "tool_call_id": tc["id"],
                        "tool_name": func_name,
                        "arguments": arguments,
                        "result": result_content,
                    })
                
                tool_call_count += 1
                body["messages"] = messages
                
                resp = await client.post(url, json=body, headers=headers)
                resp.raise_for_status()
                response_data = resp.json()
            
    except httpx.HTTPError as exc:
        return ExecutionStepResult(
            stepId=node.id,
            nodeType=NodeType.SUBAGENT.value,
            curl=curl,
            request={"url": url, "role": role_name, "task": task},
            response={"error": str(exc)},
            error=f"Subagent API error: {exc}",
        )
    
    final_content = ""
    if response_data.get("choices"):
        final_content = response_data["choices"][0].get("message", {}).get("content", "") or ""
    
    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.SUBAGENT.value,
        curl=curl,
        request={"role": role_name, "task": task, "maxIterations": max_iterations},
        response={
            "role": role_name,
            "content": final_content,
            "tool_calls_made": len(tool_call_records),
            "tool_call_log": tool_call_records if tool_call_records else None,
            "skills_used": enabled_skills,
        },
        tool_calls=tool_call_records if tool_call_records else None,
    )


def _handle_code_sandbox(node: PipelineNode) -> ExecutionStepResult:
    """Handle a code sandbox node — execution is client-side via Pyodide/Web Worker."""
    config = node.data.config
    files = config.get("files", {})
    active_file = config.get("activeFile", "main.py")
    language = config.get("language", "python")

    file_list = list(files.keys()) if isinstance(files, dict) else []

    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.CODE_SANDBOX.value,
        curl=f"# Code Sandbox: {language} | {len(file_list)} file(s) | active: {active_file}",
        request={"language": language, "files": file_list, "activeFile": active_file},
        response={
            "status": "workspace_ready",
            "language": language,
            "fileCount": len(file_list),
            "activeFile": active_file,
            "note": "Code execution happens in-browser via Pyodide WASM. Run from the frontend.",
        },
    )


def _handle_tts(
    node: PipelineNode,
    previous_results: dict[str, ExecutionStepResult],
    edges: list[PipelineEdge],
) -> ExecutionStepResult:
    """Handle a TTS node — speech synthesis is client-side via Web Speech API.

    The backend passes through the text from the upstream Chat node so the
    frontend can call the Web Speech API to speak it.
    """
    config = node.data.config
    engine = config.get("engine", "webspeech")
    voice = config.get("voice", "default")
    rate = config.get("rate", 1.0)
    pitch = config.get("pitch", 1.0)
    edge_voice = config.get("edgeVoice", "en-US-AriaNeural")
    edge_rate = config.get("edgeRate", 0)
    edge_pitch = config.get("edgePitch", 0)

    # Find upstream Chat node text
    text = ""
    for edge in edges:
        if edge.target == node.id and edge.source in previous_results:
            upstream = previous_results[edge.source]
            if upstream.response:
                if isinstance(upstream.response, dict):
                    resp = upstream.response
                    if "choices" in resp:
                        choices = resp["choices"]
                        if choices and isinstance(choices, list):
                            msg = choices[0].get("message", {})
                            text = msg.get("content", "")
                    elif "content" in resp:
                        text = resp.get("content", "")
                    elif "text" in resp:
                        text = resp.get("text", "")

    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.TTS.value,
        curl=f"# TTS: {voice} @ rate={rate} pitch={pitch}",
        request={
            "voice": voice,
            "rate": rate,
            "pitch": pitch,
            "text": text,
            "config": config,
        },
        response={
            "status": "speech_ready",
            "voice": voice,
            "rate": rate,
            "pitch": pitch,
            "text": text,
            "note": "Speech synthesis runs in-browser via Web Speech API. Frontend handles playback.",
        },
    )


def _handle_local_model(node: PipelineNode) -> ExecutionStepResult:
    """Handle a Local Model node — inference is client-side via WebLLM (WebGPU).

    The backend registers the model config so the frontend can load and run
    inference entirely in the browser.
    """
    config = node.data.config
    model_id = config.get("modelId", "")
    system_prompt = config.get("systemPrompt", "")
    temperature = config.get("temperature", 0.7)
    max_tokens = config.get("maxTokens", 2048)

    return ExecutionStepResult(
        stepId=node.id,
        nodeType=NodeType.LOCAL_MODEL.value,
        curl=f"# Local Model: {model_id} | t={temperature} max_tokens={max_tokens}",
        request={
            "modelId": model_id,
            "systemPrompt": system_prompt,
            "temperature": temperature,
            "maxTokens": max_tokens,
            "config": config,
        },
        response={
            "status": "model_configured",
            "modelId": model_id,
            "note": "Model runs in-browser via WebLLM (WebGPU). Inference is handled by the frontend.",
        },
    )


def _safe_headers(headers: dict[str, str]) -> dict[str, str]:
    """Return headers with the Authorization value masked for logging/display."""
    safe = dict(headers)
    if "Authorization" in safe:
        val = safe["Authorization"]
        if len(val) > 12:
            safe["Authorization"] = val[:8] + "..." + val[-4:]
        else:
            safe["Authorization"] = "***"
    return safe
