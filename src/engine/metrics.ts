import type { Graph } from '../types/graph.js';

/**
 * Compute visual metrics for all nodes in the graph.
 * Mutates nodes in-place, adding: depth, layerIndex, fanIn, size.
 */
export function computeVisualMetrics(graph: Graph): void {
  const importAdj = buildImportAdjacency(graph);
  const importedByAdj = buildImportedByAdjacency(graph);

  const fanInMap = computeFanIn(graph, importedByAdj);
  const depthMap = computeDepth(graph, importAdj);

  const maxDepth = Math.max(0, ...Array.from(depthMap.values()));
  const bucketSize = maxDepth > 0 ? Math.ceil(maxDepth / 4) : 1;

  for (const node of graph.nodes) {
    const fanIn = fanInMap.get(node.id) ?? 0;
    const depth = depthMap.get(node.id) ?? 0;

    node.fanIn = fanIn;
    node.depth = depth;
    node.layerIndex = node.type === 'test'
      ? -1
      : Math.min(3, Math.floor(depth / bucketSize));
    node.size = Math.round(30 + Math.log2(fanIn + 1) * 12);
  }
}

function buildImportAdjacency(graph: Graph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) adj.set(node.id, []);
  for (const edge of graph.edges) {
    if (edge.type === 'import') {
      adj.get(edge.source)?.push(edge.target);
    }
  }
  return adj;
}

function buildImportedByAdjacency(graph: Graph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) adj.set(node.id, []);
  for (const edge of graph.edges) {
    if (edge.type === 'import') {
      adj.get(edge.target)?.push(edge.source);
    }
  }
  return adj;
}

function computeFanIn(
  graph: Graph,
  importedBy: Map<string, string[]>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const node of graph.nodes) {
    result.set(node.id, (importedBy.get(node.id) ?? []).length);
  }
  return result;
}

/**
 * Compute depth = longest dependency path for each node.
 * Uses Tarjan's SCC to handle cycles, then longest path on DAG.
 */
function computeDepth(
  graph: Graph,
  importAdj: Map<string, string[]>,
): Map<string, number> {
  const sourceIds = graph.nodes
    .filter(n => n.type !== 'test')
    .map(n => n.id);
  const sourceSet = new Set(sourceIds);

  const sccs = tarjanSCC(sourceIds, importAdj, sourceSet);

  const nodeToScc = new Map<string, number>();
  for (let i = 0; i < sccs.length; i++) {
    for (const nodeId of sccs[i]) {
      nodeToScc.set(nodeId, i);
    }
  }

  const sccAdj = new Map<number, Set<number>>();
  for (let i = 0; i < sccs.length; i++) sccAdj.set(i, new Set());

  for (const nodeId of sourceIds) {
    const sccIdx = nodeToScc.get(nodeId)!;
    for (const dep of (importAdj.get(nodeId) ?? [])) {
      const depScc = nodeToScc.get(dep);
      if (depScc !== undefined && depScc !== sccIdx) {
        sccAdj.get(sccIdx)!.add(depScc);
      }
    }
  }

  const sccDepth = new Map<number, number>();

  function getSccDepth(sccIdx: number): number {
    if (sccDepth.has(sccIdx)) return sccDepth.get(sccIdx)!;
    sccDepth.set(sccIdx, 0); // guard against unexpected recursion
    let maxChildDepth = -1;
    for (const childScc of sccAdj.get(sccIdx) ?? []) {
      maxChildDepth = Math.max(maxChildDepth, getSccDepth(childScc));
    }
    const depth = maxChildDepth + 1;
    sccDepth.set(sccIdx, depth);
    return depth;
  }

  for (let i = 0; i < sccs.length; i++) getSccDepth(i);

  const result = new Map<string, number>();
  for (const node of graph.nodes) {
    if (node.type === 'test') {
      result.set(node.id, 0);
    } else {
      const sccIdx = nodeToScc.get(node.id);
      result.set(node.id, sccIdx !== undefined ? (sccDepth.get(sccIdx) ?? 0) : 0);
    }
  }

  return result;
}

function tarjanSCC(
  nodeIds: string[],
  adj: Map<string, string[]>,
  validNodes: Set<string>,
): string[][] {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const nodeIndex = new Map<string, number>();
  const nodeLowlink = new Map<string, number>();
  const sccs: string[][] = [];

  function strongConnect(v: string): void {
    nodeIndex.set(v, index);
    nodeLowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of (adj.get(v) ?? [])) {
      if (!validNodes.has(w)) continue;

      if (!nodeIndex.has(w)) {
        strongConnect(w);
        nodeLowlink.set(v, Math.min(nodeLowlink.get(v)!, nodeLowlink.get(w)!));
      } else if (onStack.has(w)) {
        nodeLowlink.set(v, Math.min(nodeLowlink.get(v)!, nodeIndex.get(w)!));
      }
    }

    if (nodeLowlink.get(v) === nodeIndex.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const v of nodeIds) {
    if (!nodeIndex.has(v)) {
      strongConnect(v);
    }
  }

  return sccs;
}
