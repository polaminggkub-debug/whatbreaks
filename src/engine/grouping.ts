import path from 'node:path';
import type { Graph, FileGroup } from '../types/graph.js';

const MIN_FILES_FOR_GROUPING = 8;
const MIN_GROUP_SIZE = 2;
const COUPLING_THRESHOLD = 0.4;

export function computeFileGroups(graph: Graph): FileGroup[] {
  const sourceNodes = graph.nodes.filter(n => n.type !== 'test');
  if (sourceNodes.length < MIN_FILES_FOR_GROUPING) return [];

  // Build adjacency for import edges
  const forwardAdj = new Map<string, Set<string>>();
  const reverseAdj = new Map<string, Set<string>>();
  for (const node of sourceNodes) {
    forwardAdj.set(node.id, new Set());
    reverseAdj.set(node.id, new Set());
  }
  for (const edge of graph.edges) {
    if (edge.type !== 'import') continue;
    forwardAdj.get(edge.source)?.add(edge.target);
    reverseAdj.get(edge.target)?.add(edge.source);
  }

  // ── Pass 1: Directory seeds ─────────────────────────────────────────
  const dirGroups = new Map<string, Set<string>>();
  for (const node of sourceNodes) {
    const dir = path.dirname(node.id);
    if (!dirGroups.has(dir)) dirGroups.set(dir, new Set());
    dirGroups.get(dir)!.add(node.id);
  }

  // Convert to numbered groups.
  // If a single directory contains most source files (flat project), split into
  // individual seeds so Pass 2 can re-cluster them by dependency coupling.
  let groupMap = new Map<number, Set<string>>(); // groupIndex -> nodeIds
  const nodeToGroup = new Map<string, number>();  // nodeId -> groupIndex
  let nextGroupId = 0;
  const flatThreshold = Math.ceil(sourceNodes.length * 0.5);

  for (const [_dir, nodeIds] of dirGroups) {
    if (nodeIds.size >= flatThreshold) {
      // Flat project: each file becomes its own seed for dependency-based merging
      for (const nid of nodeIds) {
        const gId = nextGroupId++;
        groupMap.set(gId, new Set([nid]));
        nodeToGroup.set(nid, gId);
      }
    } else {
      const gId = nextGroupId++;
      groupMap.set(gId, new Set(nodeIds));
      for (const nid of nodeIds) nodeToGroup.set(nid, gId);
    }
  }

  // ── Pass 2: Dependency merge (best-pair-first) ───────────────────────
  let merged = true;
  while (merged) {
    merged = false;
    const groupIds = Array.from(groupMap.keys());

    // Find the pair with the highest coupling
    let bestGA = -1;
    let bestGB = -1;
    let bestCoupling = 0;

    for (let i = 0; i < groupIds.length; i++) {
      for (let j = i + 1; j < groupIds.length; j++) {
        const gA = groupIds[i];
        const gB = groupIds[j];
        const coupling = computeCoupling(groupMap.get(gA)!, groupMap.get(gB)!, forwardAdj);
        if (coupling > bestCoupling) {
          bestCoupling = coupling;
          bestGA = gA;
          bestGB = gB;
        }
      }
    }

    if (bestCoupling >= COUPLING_THRESHOLD) {
      const nodesA = groupMap.get(bestGA)!;
      const nodesB = groupMap.get(bestGB)!;
      for (const nid of nodesB) {
        nodesA.add(nid);
        nodeToGroup.set(nid, bestGA);
      }
      groupMap.delete(bestGB);
      merged = true;
    }
  }

  // Filter singletons and single-group results
  const finalGroups = Array.from(groupMap.values())
    .filter(nodeIds => nodeIds.size >= MIN_GROUP_SIZE);

  if (finalGroups.length <= 1 && finalGroups[0]?.size === sourceNodes.length) {
    return []; // Everything in one group = pointless
  }

  // ── Pass 3: Name resolution ─────────────────────────────────────────
  return finalGroups.map((nodeIds, i) =>
    buildFileGroup(Array.from(nodeIds), graph, i)
  );
}

function computeCoupling(
  nodesA: Set<string>,
  nodesB: Set<string>,
  forwardAdj: Map<string, Set<string>>,
): number {
  let crossEdges = 0;

  for (const nid of nodesA) {
    const targets = forwardAdj.get(nid);
    if (!targets) continue;
    for (const t of targets) {
      if (nodesB.has(t)) crossEdges++;
    }
  }

  for (const nid of nodesB) {
    const targets = forwardAdj.get(nid);
    if (!targets) continue;
    for (const t of targets) {
      if (nodesA.has(t)) crossEdges++;
    }
  }

  if (crossEdges === 0) return 0;

  // Density-based normalization: penalizes large groups to prevent mega-clusters
  return crossEdges / (nodesA.size + nodesB.size);
}

function buildFileGroup(nodeIds: string[], graph: Graph, index: number): FileGroup {
  let centralNodeId = nodeIds[0];
  let maxFanIn = 0;
  for (const id of nodeIds) {
    const node = graph.nodes.find(n => n.id === id);
    if (node && node.fanIn > maxFanIn) {
      maxFanIn = node.fanIn;
      centralNodeId = id;
    }
  }

  const label = resolveGroupName(nodeIds, centralNodeId);
  const id = `group-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return { id, label, nodeIds, centralNodeId };
}

function resolveGroupName(nodeIds: string[], centralNodeId: string): string {
  const suffixes = ['Controller', 'Service', 'Model', 'Repository', 'Handler',
    'Ctrl', 'Svc', 'Repo', 'Helper', 'Utils', 'Util', 'Factory',
    'controller', 'service', 'model', 'repository', 'handler',
    'ctrl', 'svc', 'repo', 'helper', 'utils', 'util', 'factory'];

  const stems = new Map<string, number>();

  for (const id of nodeIds) {
    const base = path.basename(id).replace(/\.[^.]+$/, '');
    let stem = base;
    for (const suffix of suffixes) {
      if (stem.endsWith(suffix) && stem.length > suffix.length) {
        stem = stem.slice(0, -suffix.length);
        break;
      }
    }
    stem = stem.charAt(0).toLowerCase() + stem.slice(1);
    if (stem.length >= 2) {
      stems.set(stem, (stems.get(stem) ?? 0) + 1);
    }
  }

  let bestStem = '';
  let bestCount = 0;
  for (const [stem, count] of stems) {
    if (count > bestCount) {
      bestCount = count;
      bestStem = stem;
    }
  }

  if (bestStem) {
    return bestStem.charAt(0).toUpperCase() + bestStem.slice(1);
  }

  const dir = path.basename(path.dirname(centralNodeId));
  if (dir && dir !== '.' && dir !== 'src') {
    return dir.charAt(0).toUpperCase() + dir.slice(1);
  }

  return path.basename(centralNodeId).replace(/\.[^.]+$/, '');
}
