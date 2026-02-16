import { ref, type Ref } from 'vue';
import type {
  Graph,
  GraphEdge,
  FailingResult,
  RefactorResult,
  ImpactNode,
  RiskLevel,
} from '../../types/graph';

/**
 * Find the shortest path between two nodes using BFS on all edges (undirected).
 * Returns ordered array of node IDs from `fromId` to `toId`, or empty if no path.
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

export function useImpact(graph: Ref<Graph | null>) {
  const highlightResult = ref<FailingResult | RefactorResult | null>(null);

  function buildForwardAdj(edges: GraphEdge[]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      const list = adj.get(e.source) ?? [];
      list.push(e.target);
      adj.set(e.source, list);
    }
    return adj;
  }

  function buildReverseAdj(edges: GraphEdge[]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      const list = adj.get(e.target) ?? [];
      list.push(e.source);
      adj.set(e.target, list);
    }
    return adj;
  }

  /**
   * BFS traversal from a starting set of nodes, returning all reachable nodes with depth.
   */
  function bfs(
    startIds: string[],
    adjacency: Map<string, string[]>,
    maxDepth = Infinity
  ): Map<string, number> {
    const visited = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [];

    for (const id of startIds) {
      visited.set(id, 0);
      queue.push({ id, depth: 0 });
    }

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const neighbors = adjacency.get(id) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.set(neighbor, depth + 1);
          queue.push({ id: neighbor, depth: depth + 1 });
        }
      }
    }

    return visited;
  }

  /**
   * Analyze the blast radius of a failing test.
   * The test covers some files (via test-covers edges). Those files may be the root cause.
   * We trace backward through imports to find what the tested files depend on (potential root causes),
   * and forward to find other tests that might also be affected.
   */
  function analyzeFailure(testId: string): FailingResult | null {
    const g = graph.value;
    if (!g) return null;

    const testNode = g.nodes.find(n => n.id === testId);
    if (!testNode) return null;

    // Files directly tested by this test (test-covers edges go FROM test TO source)
    const directlyTests = g.edges
      .filter(e => e.source === testId && e.type === 'test-covers')
      .map(e => e.target);

    // Build import adjacency for backward traversal (who does X import from?)
    const importEdges = g.edges.filter(e => e.type === 'import');
    const forwardImports = buildForwardAdj(importEdges);
    const reverseImports = buildReverseAdj(importEdges);

    // BFS backward from directly tested files through imports to find deep deps
    const depthMap = bfs(directlyTests, forwardImports);

    // Build chain
    const chain: ImpactNode[] = [];
    for (const [nodeId, depth] of depthMap) {
      const node = g.nodes.find(n => n.id === nodeId);
      chain.push({
        nodeId,
        depth: depth + 1, // +1 because direct tests are depth 1
        layer: node?.layer,
      });
    }

    // Sort chain by depth
    chain.sort((a, b) => a.depth - b.depth);

    // Deep dependencies (depth >= 2 in the chain)
    const deepDependencies = chain
      .filter(c => c.depth >= 2)
      .map(c => c.nodeId);

    // Files to investigate (the directly tested files + their direct imports)
    const filesToInvestigate = [...new Set([
      ...directlyTests,
      ...deepDependencies.slice(0, 10),
    ])];

    // Other tests at risk: tests that cover any of the affected files
    const allAffectedFiles = new Set(chain.map(c => c.nodeId));
    const otherTestsAtRisk = g.edges
      .filter(e =>
        e.type === 'test-covers' &&
        e.source !== testId &&
        allAffectedFiles.has(e.target)
      )
      .map(e => e.source);

    const result: FailingResult = {
      test: testId,
      mode: 'failing',
      chain,
      directlyTests,
      deepDependencies,
      filesToInvestigate,
      otherTestsAtRisk: [...new Set(otherTestsAtRisk)],
    };

    highlightResult.value = result;
    return result;
  }

  /**
   * Analyze the blast radius of refactoring a file.
   * BFS forward through reverse imports (who imports this file?) to find all affected files.
   * Then find all tests that cover affected files.
   */
  function analyzeRefactor(fileId: string): RefactorResult | null {
    const g = graph.value;
    if (!g) return null;

    const fileNode = g.nodes.find(n => n.id === fileId);
    if (!fileNode) return null;

    // Build reverse import adjacency: for a given file, who imports it?
    const importEdges = g.edges.filter(e => e.type === 'import');
    const reverseImports = buildReverseAdj(importEdges);

    // BFS forward through reverse imports (who imports the target file, then who imports them, etc.)
    const depthMap = bfs([fileId], reverseImports);
    depthMap.delete(fileId); // Remove the root file itself

    // Direct importers (depth 1)
    const directImporters: string[] = [];
    const transitiveAffected: string[] = [];

    for (const [nodeId, depth] of depthMap) {
      if (depth === 1) {
        directImporters.push(nodeId);
      } else {
        transitiveAffected.push(nodeId);
      }
    }

    // All affected file IDs (including the root)
    const allAffected = new Set([fileId, ...depthMap.keys()]);

    // Tests that cover any affected file
    const testsToRun = g.edges
      .filter(e => e.type === 'test-covers' && allAffected.has(e.target))
      .map(e => e.source);
    const uniqueTests = [...new Set(testsToRun)];

    // Build suggested test command
    const testFileNames = uniqueTests
      .map(t => {
        const node = g.nodes.find(n => n.id === t);
        return node?.label ?? t;
      });
    const suggestedCommand = testFileNames.length > 0
      ? `npx vitest run ${testFileNames.join(' ')}`
      : 'No tests to run';

    // Calculate risk level
    const totalAffected = directImporters.length + transitiveAffected.length;
    let riskLevel: RiskLevel;
    let riskReason: string;

    if (totalAffected >= 10 || uniqueTests.length >= 5) {
      riskLevel = 'high';
      riskReason = `Affects ${totalAffected} files and ${uniqueTests.length} tests — high blast radius`;
    } else if (totalAffected >= 3 || uniqueTests.length >= 2) {
      riskLevel = 'medium';
      riskReason = `Affects ${totalAffected} files and ${uniqueTests.length} tests — moderate blast radius`;
    } else {
      riskLevel = 'low';
      riskReason = `Affects ${totalAffected} files and ${uniqueTests.length} tests — low blast radius`;
    }

    const result: RefactorResult = {
      file: fileId,
      mode: 'refactor',
      affected_files: totalAffected,
      affected_tests: uniqueTests.length,
      direct_importers: directImporters,
      transitive_affected: transitiveAffected,
      tests_to_run: uniqueTests,
      suggested_test_command: suggestedCommand,
      risk_level: riskLevel,
      risk_reason: riskReason,
    };

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
