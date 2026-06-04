"""
Pipeline execution engine.

Walks a PipelineGraph in topological order, executing each node
according to its type and collecting results.
"""
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

    for node in sorted_nodes:
        if selected_ids and node.id not in selected_ids:
            continue

        provider = _find_upstream_provider(
            node.id, pipeline.edges, node_map, provider_cache
        )

        # Skip if upstream dependency has an error
        skip_node = False
        if node.type in (NodeType.CHAT, NodeType.MCP, NodeType.BROWSER, NodeType.SEARCH, NodeType.OBSERVER):
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
            result = await _handle_chat(node, provider, auth_header)
        elif node.type == NodeType.MCP:
            result = await _handle_mcp(node, provider, auth_header, results)
        elif node.type == NodeType.OBSERVER:
            result = _handle_observer(node, pipeline.edges, node_map, results)
        elif node.type == NodeType.BROWSER:
            result = await _handle_browser(node)
        elif node.type == NodeType.SEARCH:
            result = await _handle_search(node)
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
) -> ExecutionStepResult:
    """
    Call the LLM provider for a chat node.

    Builds an OpenAI-compatible chat completions request from the node's
    config and forwards the Authorization header.
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

    # Additional params from config (e.g. tools, response_format)
    for key in ("tools", "tool_choice", "response_format", "stop", "top_p"):
        if key in config:
            body[key] = config[key]

    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if auth_header:
        headers["Authorization"] = auth_header

    curl = generate_curl("POST", url, headers, body)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            response_data = resp.json()
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
