import { useCallback, useState } from 'react';
import type {
  PipelineGraph,
  ExecutionRequest,
  ExecutionStepResult,
} from '../types/pipeline';
import type { Node, Edge } from 'reactflow';

function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    const targets = adj.get(e.source);
    if (targets) targets.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const neighbor of adj.get(id) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return sorted;
}

export interface UsePipelineExecutorReturn {
  execute: () => Promise<ExecutionStepResult[] | null>;
  loading: boolean;
  error: string | null;
  results: ExecutionStepResult[];
  clearResults: () => void;
}

export function usePipelineExecutor(
  nodes: Node[],
  edges: Edge[]
): UsePipelineExecutorReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExecutionStepResult[]>([]);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const providerNode = nodes.find((n) => n.data?.type === 'provider');
      if (!providerNode) {
        throw new Error('Pipeline must have a Provider node');
      }

      const sorted = topologicalSort(nodes, edges);
      const stepIds = sorted.filter((id) => id !== providerNode.id);

      if (stepIds.length === 0) {
        throw new Error('Pipeline has no steps to execute after the provider');
      }

      // Cast to our domain types — the pipeline data is always structured correctly
      const graph: PipelineGraph = {
        nodes: nodes as unknown as PipelineGraph['nodes'],
        edges: edges as unknown as PipelineGraph['edges'],
      };

      const body: ExecutionRequest = {
        pipeline: graph,
        providerId: providerNode.id,
        stepIds,
      };

      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Execution failed (${res.status}): ${errText}`);
      }

      const data: ExecutionStepResult[] = await res.json();
      setResults(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [nodes, edges]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { execute, loading, error, results, clearResults };
}
