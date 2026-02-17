import { ref, type Ref } from 'vue';
import type {
  Graph,
  FailingResult,
  RefactorResult,
} from '../../types/graph';
import { GraphIndex } from '../../engine/graph-core';
import { analyzeFailingTest } from '../../engine/failing';
import { analyzeRefactorImpact } from '../../engine/refactor';

/**
 * Find the shortest path between two nodes using BFS on all edges (undirected).
 * Returns ordered array of node IDs from `fromId` to `toId`, or empty if no path.
 *
 * This is a UI-only utility (not in the engine layer) used for path visualization.
 */
export function tracePath(graph: Graph, fromId: string, toId: string): string[] {
  if (fromId === toId) return [fromId];

  // Build undirected adjacency from all edges
  const adj = new Map<string, Set<string>>();
  for (const e of graph.edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }

  // BFS from fromId to toId
  const visited = new Set<string>([fromId]);
  const parent = new Map<string, string>();
  const queue = [fromId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) break;

    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  if (!parent.has(toId)) return []; // No path found

  // Reconstruct path from toId back to fromId
  const path: string[] = [];
  let current = toId;
  while (current !== fromId) {
    path.unshift(current);
    const p = parent.get(current);
    if (!p) return [];
    current = p;
  }
  path.unshift(fromId);
  return path;
}

/**
 * Determine the directed relationship label between two adjacent path nodes.
 * UI-only utility for edge label display.
 */
export function getEdgeRelation(graph: Graph, fromId: string, toId: string): string {
  for (const e of graph.edges) {
    if (e.source === fromId && e.target === toId) {
      return e.type === 'test-covers' ? 'tests' : 'imports';
    }
    if (e.source === toId && e.target === fromId) {
      return e.type === 'test-covers' ? 'tested by' : 'imported by';
    }
  }
  return 'connects to';
}

/**
 * Composable providing impact analysis for the UI.
 * Delegates to the shared engine functions (analyzeFailingTest, analyzeRefactorImpact)
 * via GraphIndex, eliminating duplicated BFS logic.
 */
export function useImpact(graph: Ref<Graph | null>) {
  const highlightResult = ref<FailingResult | RefactorResult | null>(null);

  function analyzeFailure(testId: string): FailingResult | null {
    const g = graph.value;
    if (!g) return null;

    const index = new GraphIndex(g);
    const result = analyzeFailingTest(index, testId);

    // Engine returns an empty chain if the node wasn't found; match old behavior
    if (result.chain.length === 0) return null;

    highlightResult.value = result;
    return result;
  }

  function analyzeRefactor(fileId: string): RefactorResult | null {
    const g = graph.value;
    if (!g) return null;

    const index = new GraphIndex(g);
    const result = analyzeRefactorImpact(index, fileId);

    // Engine returns risk_reason 'File not found in graph' if not found
    if (result.risk_reason === 'File not found in graph') return null;

    highlightResult.value = result;
    return result;
  }

  function clearHighlight() {
    highlightResult.value = null;
  }

  return {
    highlightResult,
    analyzeFailure,
    analyzeRefactor,
    clearHighlight,
  };
}

export type UseImpactReturn = ReturnType<typeof useImpact>;
