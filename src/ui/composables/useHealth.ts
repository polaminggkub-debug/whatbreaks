import { computed, type Ref } from 'vue';
import type { Graph, HotspotFile, FragileChain, CircularDep, HealthReport } from '../../types/graph';

export function useHealth(graph: Ref<Graph | null>) {
  const healthReport = computed<HealthReport | null>(() => {
    const g = graph.value;
    if (!g) return null;

    const sourceNodes = g.nodes.filter(n => n.type === 'source');
    const testNodes = g.nodes.filter(n => n.type === 'test');
    const importEdges = g.edges.filter(e => e.type === 'import');
    const testEdges = g.edges.filter(e => e.type === 'test-covers');

    // --- Hotspots (top 10 by fan-in) ---
    const hotspots = computeHotspots(sourceNodes, importEdges, testEdges);

    // --- Fragile chains (top 5 by chain depth) ---
    const fragileChains = computeFragileChains(testNodes, testEdges, importEdges, g);

    // --- Circular dependencies ---
    const circularDeps = computeCircularDeps(g.nodes.map(n => n.id), importEdges);

    return {
      sourceFiles: sourceNodes.length,
      testFiles: testNodes.length,
      edges: g.edges.length,
      hotspots,
      fragileChains,
      circularDeps,
    };
  });

  return { healthReport };
}

interface SimpleEdge { source: string; target: string; }

function computeHotspots(
  sourceNodes: { id: string; fanIn: number }[],
  importEdges: SimpleEdge[],
  testEdges: SimpleEdge[],
): HotspotFile[] {
  const fanInMap = new Map<string, number>();
  for (const e of importEdges) {
    fanInMap.set(e.target, (fanInMap.get(e.target) ?? 0) + 1);
  }

  const testRiskMap = new Map<string, number>();
  for (const e of testEdges) {
    testRiskMap.set(e.target, (testRiskMap.get(e.target) ?? 0) + 1);
  }

  return sourceNodes
    .map(n => {
      const fanIn = fanInMap.get(n.id) ?? 0;
      const testsAtRisk = testRiskMap.get(n.id) ?? 0;
      const riskLevel = fanIn >= 8 ? 'high' : fanIn >= 4 ? 'medium' : 'low';
      const reason =
        riskLevel === 'high' ? `${fanIn} files depend on this — high blast radius`
        : riskLevel === 'medium' ? `${fanIn} files depend on this — moderate risk`
        : 'Low dependency count';
      return { file: n.id, fanIn, testsAtRisk, riskLevel, reason } as HotspotFile;
    })
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 10);
}

function computeFragileChains(
  testNodes: { id: string }[],
  testEdges: SimpleEdge[],
  importEdges: SimpleEdge[],
  g: Graph,
): FragileChain[] {
  // Build adjacency list for forward BFS (source -> targets it imports)
  const adj = new Map<string, string[]>();
  for (const e of importEdges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }

  // For each test, find files it covers, then BFS forward from those files
  const testCoversMap = new Map<string, string[]>();
  for (const e of testEdges) {
    if (!testCoversMap.has(e.source)) testCoversMap.set(e.source, []);
    testCoversMap.get(e.source)!.push(e.target);
  }

  const chains: FragileChain[] = [];

  for (const test of testNodes) {
    const coveredFiles = testCoversMap.get(test.id) ?? [];
    if (coveredFiles.length === 0) continue;

    let maxDepth = 0;
    let deepestDep = coveredFiles[0] ?? test.id;

    // BFS from each covered file
    for (const startFile of coveredFiles) {
      const visited = new Set<string>([startFile]);
      const queue: Array<{ id: string; depth: number }> = [{ id: startFile, depth: 1 }];

      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        if (depth > maxDepth) {
          maxDepth = depth;
          deepestDep = id;
        }
        for (const neighbor of adj.get(id) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({ id: neighbor, depth: depth + 1 });
          }
        }
      }
    }

    if (maxDepth > 1) {
      const node = g.nodes.find(n => n.id === deepestDep);
      const depLabel = node?.label ?? deepestDep.split('/').pop() ?? deepestDep;
      chains.push({
        test: test.id,
        chainDepth: maxDepth,
        deepestDep,
        reason: `Chain depth ${maxDepth} — deepest dependency: ${depLabel}`,
      });
    }
  }

  return chains.sort((a, b) => b.chainDepth - a.chainDepth).slice(0, 5);
}

function computeCircularDeps(nodeIds: string[], importEdges: SimpleEdge[]): CircularDep[] {
  const adj = new Map<string, string[]>();
  for (const e of importEdges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of nodeIds) color.set(id, WHITE);

  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];
  const seen = new Set<string>();

  function dfs(node: string) {
    color.set(node, GRAY);
    for (const neighbor of adj.get(node) ?? []) {
      const c = color.get(neighbor) ?? BLACK;
      if (c === GRAY) {
        // Extract cycle
        const cycle: string[] = [neighbor];
        let cur = node;
        while (cur !== neighbor) {
          cycle.push(cur);
          cur = parent.get(cur) ?? neighbor;
        }
        cycle.reverse();
        // Normalize: rotate to smallest element
        const minIdx = cycle.indexOf(cycle.reduce((a, b) => (a < b ? a : b)));
        const normalized = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
        const key = normalized.join('|');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(normalized);
        }
      } else if (c === WHITE) {
        parent.set(neighbor, node);
        dfs(neighbor);
      }
    }
    color.set(node, BLACK);
  }

  for (const id of nodeIds) {
    if (color.get(id) === WHITE) {
      parent.set(id, null);
      dfs(id);
    }
  }

  return cycles.map(cycle => ({ cycle }));
}
