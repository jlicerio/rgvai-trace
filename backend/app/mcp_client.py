"""
MCP (Model Context Protocol) client.

Provides functions to connect to an MCP server over HTTP,
list available tools, and call a specific tool.

Uses httpx for async HTTP calls.
"""
import httpx
from typing import Any, Optional

DEFAULT_TIMEOUT = 30.0


async def list_tools(
    server_url: str,
    headers: Optional[dict] = None,
) -> dict[str, Any]:
    """
    Connect to an MCP server and list its available tools.

    Uses the Streamable HTTP transport for MCP:
      POST <server_url>/list_tools
    or the JSON-RPC endpoint at:
      POST <server_url>/tools/list

    Args:
        server_url: Base URL of the MCP server (e.g. http://localhost:9000)
        headers: Optional extra HTTP headers to include

    Returns:
        Dict with 'tools' key containing a list of tool descriptors.
        Each tool descriptor has 'name', 'description', and 'inputSchema'.

    Raises:
        httpx.HTTPError: If the server is unreachable or returns an error.
        ValueError: If the response format is unexpected.
    """
    merge_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        **(headers or {}),
    }

    # Try JSON-RPC format first (standard MCP over HTTP)
    payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        # Attempt primary endpoint
        url = server_url.rstrip("/")

        for candidate_url in [
            f"{url}/tools/list",
            f"{url}/list_tools",
            url,
        ]:
            try:
                resp = await client.post(
                    candidate_url,
                    json=payload,
                    headers=merge_headers,
                )
                if resp.status_code < 500:
                    break
            except httpx.HTTPError:
                continue
        else:
            raise httpx.HTTPError(
                f"Could not reach MCP server at {server_url}"
            )

        resp.raise_for_status()
        data = resp.json()

        # Handle both JSON-RPC and direct response formats
        if "result" in data:
            tools = data["result"].get("tools", [])
        elif "tools" in data:
            tools = data["tools"]
        else:
            raise ValueError(
                f"Unexpected MCP list_tools response format: {data}"
            )

        return {"tools": tools}


async def call_tool(
    server_url: str,
    tool_name: str,
    args: dict[str, Any],
    headers: Optional[dict] = None,
) -> dict[str, Any]:
    """
    Call a tool on an MCP server.

    Args:
        server_url: Base URL of the MCP server
        tool_name: Name of the tool to invoke
        args: Arguments to pass to the tool
        headers: Optional extra HTTP headers

    Returns:
        Dict with 'content' key containing the tool's response.

    Raises:
        httpx.HTTPError: If the server is unreachable or returns an error.
    """
    merge_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        **(headers or {}),
    }

    payload = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": args,
        },
    }

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        url = server_url.rstrip("/")

        for candidate_url in [
            f"{url}/tools/call",
            f"{url}/call_tool",
            url,
        ]:
            try:
                resp = await client.post(
                    candidate_url,
                    json=payload,
                    headers=merge_headers,
                )
                if resp.status_code < 500:
                    break
            except httpx.HTTPError:
                continue
        else:
            raise httpx.HTTPError(
                f"Could not reach MCP server at {server_url}"
            )

        resp.raise_for_status()
        data = resp.json()

        # Handle both JSON-RPC and direct response formats
        if "result" in data:
            return {"content": data["result"].get("content", data["result"])}
        elif "content" in data:
            return {"content": data["content"]}
        else:
            return {"content": data}
