"""
Curl command generator.

Given a dict describing an HTTP request (method, url, headers, body),
produces a human-readable curl command string.
Also provides step-config-to-curl mapping for pipeline nodes.
"""
import json
import shlex
from typing import Optional


def generate_curl(
    method: str,
    url: str,
    headers: Optional[dict] = None,
    body: Optional[dict] = None,
) -> str:
    """
    Build a pretty-printed curl command from method, URL, headers, and body.

    Args:
        method: HTTP method (GET, POST, PUT, DELETE, etc.)
        url: Request URL
        headers: Optional dict of header key-value pairs
        body: Optional dict that will be serialised as JSON body

    Returns:
        A string containing the curl command, ready to copy-paste.
    """
    parts = ["curl", "-s", "-X", method.upper()]

    if headers:
        for key, value in headers.items():
            parts.extend(["-H", f"{key}: {value}"])

    if body is not None:
        body_str = json.dumps(body, indent=2, ensure_ascii=False)
        parts.extend(["-d", body_str])

    parts.append(url)
    return shlex.join(parts)


def generate_curl_from_config(config: dict) -> str:
    """
    Generate a curl command from a step/node config dict.

    The config dict is expected to contain at minimum:
      - method: str
      - url: str
    And optionally:
      - headers: dict
      - body: dict

    This maps a step configuration (e.g. from a Chat or MCP node)
    to the equivalent curl command for reproduction/debugging.

    If the config does not contain 'url' or 'method', the function
    attempts to derive them from known node type patterns:

      * Chat node configs (with endpoint + model) → POST to LLM endpoint
      * MCP node configs (with serverUrl) → POST to MCP tool endpoint

    Returns:
        A curl command string.
    """
    method = config.get("method", "POST").upper()
    url = config.get("url", "")
    headers = config.get("headers", {})
    body = config.get("body", None)

    # If no explicit URL is given, try to derive from node-type hints
    if not url:
        endpoint = config.get("endpoint", config.get("serverUrl", ""))
        if endpoint:
            if config.get("type") in ("chat", None):
                url = endpoint.rstrip("/") + "/chat/completions"
            elif config.get("type") == "mcp" or "serverUrl" in config:
                url = endpoint.rstrip("/") + "/tools/call"
            else:
                url = endpoint

    return generate_curl(method, url, headers, body)
