import {
  HealthReport,
  HotspotFile,
  FragileChain,
  CircularDep,
  RiskLevel,
} from '../types/graph.js';
import { GraphIndex } from './graph.js';

/**
 * Analyze the overall health of the dependency graph.
 *
 * - Hotspots: files with highest fan-in (most importers)
 * - Fragile chains: tests with deepest import chains
 * - Circular dependencies: detected via DFS coloring
 */
export function analyzeRisk(index: GraphIndex): HealthReport {
  const sourceNodes = index.getAllSourceNodes();
  const testNodes = index.getAllTestNodes();

  const hotspots = findHotspots(index, sourceNodes.map((n) => n.id));
  const fragileChains = findFragileChains(index, testNodes.map((n) => n.id));
  const circularDeps = detectCircularDeps(index);

  return {
    sourceFiles: sourceNodes.length,
    testFiles: testNodes.length,
    edges: index.getGraph().edges.length,
    hotspots,
    fragileChains,
    circularDeps,
  };
}

/**
 * Find files with the highest fan-in (most files that import them).
 * Sorted descending by fan-in. Top files = highest blast radius.
 */
function findHotspots(index: GraphIndex, sourceIds: string[]): HotspotFile[] {
  const hotspots: HotspotFile[] = [];

  for (const fileId of sourceIds) {
    const importers = index.getImporters(fileId);
    const fanIn = importers.length;

    if (fanIn === 0) continue;

    const testsAtRisk = index.getTestsCovering(fileId).length;
    const { level, reason } = computeHotspotRisk(fanIn, fileId);

    hotspots.push({
      file: fileId,
      fanIn,
      testsAtRisk,
      riskLevel: level,
      reason,
    });
  }

  // Sort descending by fan-in
  hotspots.sort((a, b) => b.fanIn - a.fanIn);

  return hotspots;
}

function computeHotspotRisk(
  fanIn: number,
  fileId: string,
): { level: RiskLevel; reason: string } {
  if (fanIn >= 20) {
    return {
      level: 'high',
      reason: `${fileId} is imported by ${fanIn} files — extremely high blast radius`,
    };
  }

  if (fanIn >= 5) {
    return {
      level: 'medium',
      reason: `${fileId} is imported by ${fanIn} files — moderate blast radius`,
    };
  }

  return {
    level: 'low',
    reason: `${fileId} is imported by ${fanIn} files`,
  };
}

/**
 * Find tests with the deepest import chains.
 * BFS from each test through its imports to measure chain depth.
 * Deepest chains = most fragile (more points of failure).
 */
function findFragileChains(index: GraphIndex, testIds: string[]): FragileChain[] {
  const chains: FragileChain[] = [];

  for (const testId of testIds) {
    const { maxDepth, deepestNode } = measureChainDepth(index, testId);

    if (maxDepth <= 0) continue;

    const reason =
      maxDepth >= 5
        ? `${testId} has a ${maxDepth}-deep dependency chain — highly fragile`
        : maxDepth >= 3
          ? `${testId} has a ${maxDepth}-deep dependency chain — moderately fragile`
          : `${testId} has a ${maxDepth}-deep dependency chain`;

    chains.push({
      test: testId,
      chainDepth: maxDepth,
      deepestDep: deepestNode,
      reason,
    });
  }

  // Sort descending by chain depth
  chains.sort((a, b) => b.chainDepth - a.chainDepth);

  return chains;
}

/**
 * Measure the maximum depth of the import chain starting from a node.
 */
function measureChainDepth(
  index: GraphIndex,
  startId: string,
): { maxDepth: number; deepestNode: string } {
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [];
  let maxDepth = 0;
  let deepestNode = startId;

  visited.add(startId);
  queue.push({ nodeId: startId, depth: 0 });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const deps = index.getImports(current.nodeId);

    for (const depId of deps) {
      if (visited.has(depId)) continue;
      visited.add(depId);

      const nextDepth = current.depth + 1;
      queue.push({ nodeId: depId, depth: nextDepth });

      if (nextDepth > maxDepth) {
        maxDepth = nextDepth;
        deepestNode = depId;
      }
    }
  }

  return { maxDepth, deepestNode };
}

/**
 * Detect circular dependencies using DFS with three-color marking.
 *
 * Colors:
 * - white (unvisited): not yet processed
 * - gray (in-progress): currently in the DFS stack
 * - black (done): fully processed
 *
 * When we encounter a gray node during DFS, we've found a cycle.
 */
function detectCircularDeps(index: GraphIndex): CircularDep[] {
  const allNodeIds = index.getAllNodeIds();

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>();
  for (const id of allNodeIds) {
    color.set(id, WHITE);
  }

  // Track the DFS path for cycle reconstruction
  const parent = new Map<string, string | null>();
  const cycles: CircularDep[] = [];
  const foundCycles = new Set<string>();

  function dfs(nodeId: string): void {
    color.set(nodeId, GRAY);

    const deps = index.getImports(nodeId);
    for (const depId of deps) {
      const depColor = color.get(depId);

      if (depColor === GRAY) {
        // Found a cycle — reconstruct it
        const cycle = reconstructCycle(nodeId, depId, parent);
        const cycleKey = normalizeCycleKey(cycle);

        if (!foundCycles.has(cycleKey)) {
          foundCycles.add(cycleKey);
          cycles.push({ cycle });
        }
      } else if (depColor === WHITE) {
        parent.set(depId, nodeId);
        dfs(depId);
      }
      // BLACK nodes are fully processed — skip
    }

    color.set(nodeId, BLACK);
  }

  for (const nodeId of allNodeIds) {
    if (color.get(nodeId) === WHITE) {
      parent.set(nodeId, null);
      dfs(nodeId);
    }
  }

  return cycles;
}

/**
 * Reconstruct the cycle path from the DFS parent chain.
 * Starting from `current`, walk back through parent until we reach `cycleStart`.
 */
function reconstructCycle(
  current: string,
  cycleStart: string,
  parent: Map<string, string | null>,
): string[] {
  const cycle: string[] = [cycleStart];
  let node: string | null = current;

  // Walk backward from current to cycleStart
  const path: string[] = [];
  while (node !== null && node !== cycleStart) {
    path.push(node);
    node = parent.get(node) ?? null;
  }

  // Build cycle: cycleStart -> ... -> current -> cycleStart
  path.reverse();
  cycle.push(...path);
  cycle.push(cycleStart); // close the cycle

  return cycle;
}

/**
 * Normalize a cycle key for deduplication.
 * Rotate the cycle so the lexically smallest node is first,
 * then join as a string.
 */
function normalizeCycleKey(cycle: string[]): string {
  // The cycle includes the start node repeated at the end; remove it for normalization
  const nodes = cycle.slice(0, -1);
  if (nodes.length === 0) return '';

  // Find the index of the lexically smallest node
  let minIdx = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i] < nodes[minIdx]) {
      minIdx = i;
    }
  }

  // Rotate so smallest is first
  const rotated = [...nodes.slice(minIdx), ...nodes.slice(0, minIdx)];
  return rotated.join(' -> ');
}
