"""JSON Tool Registry with self-modification guardrails."""
import json
import os
import re
from pathlib import Path
from typing import Any, Optional
import shutil
from datetime import datetime

HERE = Path(__file__).resolve().parent
DEFAULT_REGISTRY_PATH = HERE / "registry.json"

REGISTRY_PATH = os.environ.get("TOOL_REGISTRY_PATH", str(DEFAULT_REGISTRY_PATH))
MAX_REGISTRY_SIZE = 50 * 1024  # 50KB
MAX_TOOL_COUNT = 50
REQUIRED_TOOL_FIELDS = {"name", "endpoint"}
VALID_METHODS = {"GET", "POST", "PUT", "DELETE", "PATCH"}
VALID_PARAM_TYPES = {"string", "number", "integer", "boolean", "array", "object"}


def validate_tool(tool: Any, index: int) -> Optional[str]:
    """Validate a single tool definition. Returns error message or None."""
    if not isinstance(tool, dict):
        return f"Tool at index {index} must be a JSON object"

    # Required fields
    for field in REQUIRED_TOOL_FIELDS:
        if field not in tool:
            return f"Tool {index} missing required field: '{field}'"

    # Name validation
    name = tool.get("name", "")
    if not isinstance(name, str) or not name.strip():
        return f"Tool at index {index}: 'name' must be a non-empty string"
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
        return f"Tool '{name}': 'name' must start with a letter/underscore and contain only letters, numbers, underscores"
    if len(name) > 64:
        return f"Tool '{name}': 'name' too long (max 64 chars)"

    # Endpoint validation
    endpoint = tool.get("endpoint", "")
    if not isinstance(endpoint, str) or not endpoint.strip():
        return f"Tool '{name}': 'endpoint' must be a non-empty string"

    # Method validation
    method = tool.get("method", "GET")
    if method not in VALID_METHODS:
        return f"Tool '{name}': invalid method '{method}'. Must be one of: {', '.join(sorted(VALID_METHODS))}"

    # Description
    desc = tool.get("description", "")
    if desc and not isinstance(desc, str):
        return f"Tool '{name}': 'description' must be a string"
    if len(desc) > 500:
        return f"Tool '{name}': 'description' too long (max 500 chars)"

    # write_allowed must be boolean
    write_allowed = tool.get("write_allowed", False)
    if not isinstance(write_allowed, bool):
        return f"Tool '{name}': 'write_allowed' must be true or false"

    # Parameters validation
    params = tool.get("parameters", {})
    if not isinstance(params, dict):
        return f"Tool '{name}': 'parameters' must be an object"
    if not params:
        # Auto-set sensible default for minimal definitions
        tool["parameters"] = {"type": "object", "properties": {}, "required": []}
    elif params.get("type") != "object":
        return f"Tool '{name}': parameters.type must be 'object'"
    props = params.get("properties", {})
    if not isinstance(props, dict):
        return f"Tool '{name}': parameters.properties must be an object"
    for prop_name, prop_schema in props.items():
        if not isinstance(prop_schema, dict):
            return f"Tool '{name}': parameter '{prop_name}' must be an object"
        prop_type = prop_schema.get("type", "")
        if prop_type and prop_type not in VALID_PARAM_TYPES:
            return f"Tool '{name}': parameter '{prop_name}' has invalid type '{prop_type}'"
    required = params.get("required", [])
    if not isinstance(required, list):
        return f"Tool '{name}': parameters.required must be an array"
    for r in required:
        if r not in props:
            return f"Tool '{name}': required parameter '{r}' not defined in properties"

    return None


def validate_registry(data: Any) -> Optional[str]:
    """Full registry validation. Returns error message or None."""
    if not isinstance(data, dict):
        return "Registry must be a JSON object"

    tools = data.get("tools", [])
    if not isinstance(tools, list):
        return "Registry 'tools' must be an array"
    if len(tools) > MAX_TOOL_COUNT:
        return f"Too many tools ({len(tools)}). Maximum is {MAX_TOOL_COUNT}"

    # Validate each tool
    for i, tool in enumerate(tools):
        err = validate_tool(tool, i)
        if err:
            return err

    # Check for duplicate names
    names = [t.get("name") for t in tools if isinstance(t, dict)]
    if len(names) != len(set(names)):
        seen = set()
        dupes = [n for n in names if n in seen or seen.add(n)]
        return f"Duplicate tool names: {', '.join(dupes)}"

    return None


# Capture guard: a tool being used for self-modification can't disable its own write_allowed in the same call
_in_write_transaction: set[str] = set()


def load_registry() -> dict[str, Any]:
    """Load the tool registry from disk with safety checks."""
    path = Path(REGISTRY_PATH)
    if not path.exists():
        return {"$schema-version": "1.0.0", "meta": {"name": "Default", "description": ""}, "tools": []}
    if path.stat().st_size > MAX_REGISTRY_SIZE:
        raise ValueError(f"Registry file exceeds size limit ({MAX_REGISTRY_SIZE} bytes)")
    try:
        with open(path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid registry JSON: {e}")
    return data


def save_registry(data: dict[str, Any], transaction_tool: Optional[str] = None) -> dict[str, Any]:
    """Validate and save the tool registry. Returns the saved data."""
    # Schema version check
    if "$schema-version" not in data:
        data["$schema-version"] = "1.0.0"
    if "meta" not in data:
        data["meta"] = {"name": "Custom", "description": ""}

    # Full validation
    err = validate_registry(data)
    if err:
        raise ValueError(err)

    # If this is a self-modification transaction, prevent the tool from disabling its own write_allowed
    if transaction_tool:
        for tool in data["tools"]:
            if tool.get("name") == transaction_tool and tool.get("write_allowed") is False:
                raise ValueError(
                    f"Cannot disable write_allowed on '{transaction_tool}' via self-modification."
                    f" Remove the flag manually from the JSON file."
                )

    # Atomic write
    tmp = f"{REGISTRY_PATH}.tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, REGISTRY_PATH)
    return data


def discover_tools() -> list[dict[str, Any]]:
    """Return all tools from the registry formatted for MCP discovery."""
    registry = load_registry()
    return registry.get("tools", [])


def call_registry_tool(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Execute a registered tool by delegating to its endpoint or handling built-in tools."""
    registry = load_registry()
    tools = registry.get("tools", [])

    # Handle the __write_registry__ built-in tool for self-modification
    if tool_name == "__write_registry__":
        return _handle_registry_write(args, registry, tools)

    # Find the tool
    tool_def = None
    for t in tools:
        if t["name"] == tool_name:
            tool_def = t
            break

    if not tool_def:
        raise ValueError(f"Unknown tool: {tool_name}")

    # Return tool metadata for the caller to decide how to use it
    return {
        "tool": tool_name,
        "status": "discovered",
        "endpoint": tool_def.get("endpoint"),
        "method": tool_def.get("method", "GET"),
        "parameters": tool_def.get("parameters", {}),
        "write_allowed": tool_def.get("write_allowed", False),
    }


def _handle_registry_write(args: dict[str, Any], registry: dict, tools: list) -> dict[str, Any]:
    """Handle self-modification: write changes back to the registry.

    Guardrails enforced:
    - Only tools with write_allowed=true can trigger modifications
    - A tool cannot disable its own write_allowed flag during self-modification
    - All changes are schema-validated before saving
    - Old registry is preserved in a backup file
    """
    tool_name = args.get("tool", "")
    if not tool_name:
        return {"status": "denied", "error": "No tool specified for registry write"}

    # Find the tool requesting the write
    source_tool = None
    for t in tools:
        if t["name"] == tool_name:
            source_tool = t
            break

    if not source_tool:
        return {"status": "denied", "error": f"Tool '{tool_name}' not found in registry"}

    if not source_tool.get("write_allowed"):
        return {"status": "denied", "error": f"Tool '{tool_name}' does not have write_allowed=true"}

    # What kind of modification?
    action = args.get("action", "")
    target_tool_name = args.get("target", "")

    # Create a backup
    backup_path = f"{REGISTRY_PATH}.bak"
    try:
        shutil.copy2(REGISTRY_PATH, backup_path)
    except Exception:
        pass  # Backup is best-effort

    try:
        if action == "update":
            # Update an existing tool's fields
            updates = args.get("updates", {})
            if not isinstance(updates, dict):
                return {"status": "error", "error": "'updates' must be an object"}

            found = False
            for t in tools:
                if t["name"] == target_tool_name:
                    # Guard: can't disable write_allowed on the calling tool
                    if target_tool_name == tool_name and "write_allowed" in updates:
                        return {
                            "status": "denied",
                            "error": f"Cannot modify write_allowed on '{tool_name}' via self-modification",
                        }

                    # Apply updates
                    for key, value in updates.items():
                        t[key] = value
                    found = True
                    break

            if not found:
                return {"status": "error", "error": f"Target tool '{target_tool_name}' not found"}

            # Re-validate the entire registry
            err = validate_registry(registry)
            if err:
                # Restore from backup
                try:
                    shutil.copy2(backup_path, REGISTRY_PATH)
                except Exception:
                    pass
                return {"status": "error", "error": f"Validation failed after update: {err}"}

            # Save with transaction guard
            save_registry(registry, transaction_tool=tool_name)
            return {"status": "ok", "modified_tool": target_tool_name, "changes": list(updates.keys())}

        elif action == "add":
            # Add a new tool
            new_tool = args.get("tool_definition", {})
            err = validate_tool(new_tool, len(tools))
            if err:
                return {"status": "error", "error": err}

            # Check for duplicate name
            if any(t["name"] == new_tool["name"] for t in tools):
                return {"status": "error", "error": f"Tool '{new_tool['name']}' already exists"}

            tools.append(new_tool)
            registry["tools"] = tools
            save_registry(registry, transaction_tool=tool_name)
            return {"status": "ok", "action": "added", "tool": new_tool["name"]}

        elif action == "remove":
            # Remove a tool (can't remove the calling tool)
            if target_tool_name == tool_name:
                return {"status": "denied", "error": "Cannot remove the tool that is performing the modification"}

            before = len(tools)
            registry["tools"] = [t for t in tools if t["name"] != target_tool_name]
            if len(registry["tools"]) == before:
                return {"status": "error", "error": f"Tool '{target_tool_name}' not found"}

            # Can't remove all tools
            if len(registry["tools"]) == 0:
                return {"status": "denied", "error": "Cannot remove the last tool"}

            save_registry(registry, transaction_tool=tool_name)
            return {"status": "ok", "action": "removed", "tool": target_tool_name}

        else:
            return {"status": "error", "error": f"Unknown action '{action}'. Use 'update', 'add', or 'remove'"}

    except ValueError as e:
        # Validation error during save
        return {"status": "error", "error": str(e)}
    except Exception as e:
        # Restore from backup on unexpected errors
        try:
            shutil.copy2(backup_path, REGISTRY_PATH)
        except Exception:
            pass
        return {"status": "error", "error": f"Unexpected error: {e}"}
