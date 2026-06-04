from pydantic import BaseModel
from typing import Optional
from enum import Enum


class NodeType(str, Enum):
    PROVIDER = "provider"
    CHAT = "chat"
    MCP = "mcp"
    OBSERVER = "observer"
    BROWSER = "browser"
    SEARCH = "search"


class Position(BaseModel):
    x: float
    y: float


class PipelineEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class NodeData(BaseModel):
    label: str
    type: NodeType
    config: dict = {}


class PipelineNode(BaseModel):
    id: str
    type: NodeType
    position: Position
    data: NodeData


class PipelineGraph(BaseModel):
    nodes: list[PipelineNode]
    edges: list[PipelineEdge]


class ExecutionRequest(BaseModel):
    pipeline: PipelineGraph
    providerId: str
    stepIds: list[str] = []


class ExecutionStepResult(BaseModel):
    stepId: str
    nodeType: str
    curl: str = ""
    request: dict = {}
    response: dict = {}
    error: Optional[str] = None
    tool_calls: Optional[list[dict]] = None


class CurlRequest(BaseModel):
    config: dict
