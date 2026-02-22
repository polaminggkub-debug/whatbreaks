import type cytoscape from 'cytoscape';
import type { Graph, GraphNode, FileGroup } from '../../types/graph.js';
import { getFileIcon } from './fileIcons.js';
import { DEPTH_LAYER_COLORS } from './constants.js';

/**
 * Options controlling which nodes to include and how to size them.
 */
export interface BuildElementsOptions {
  showTests: boolean;
  showFoundation: boolean;
  sizeMode: 'fanIn' | 'uniform';
  layoutMode: 'dagre' | 'cose';
}

/** Maximum visible descendants before a parent group gets promoted to top-level subgroups. */
const MAX_COMPOUND_SIZE = 15;

function getAllDescendantNodeIds(group: FileGroup, allGroups: FileGroup[]): string[] {
  const ids = [...group.nodeIds];
  const children = allGroups.filter(g => g.parentGroupId === group.id);
  for (const child of children) {
    ids.push(...child.nodeIds);
  }
  return ids;
}

/** Derive dominant layer color from a group's member nodes. */
function getDominantColor(memberIds: string[], graph: Graph): string {
  const colorCounts = new Map<string, number>();
  for (const id of memberIds) {
    const node = graph.nodes.find((n: GraphNode) => n.id === id);
    if (!node) continue;
    const color = DEPTH_LAYER_COLORS[node.layerIndex ?? 0] ?? '#64748b';
    colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
  }
  let best = '#64748b';
  let bestCount = 0;
  for (const [color, count] of colorCounts) {
    if (count > bestCount) { bestCount = count; best = color; }
  }
  return best;
}

/**
 * Converts a Graph into Cytoscape element definitions (nodes + edges).
 * Pure function: graph data in, Cytoscape elements out.
 */
export function buildElements(graph: Graph, options: BuildElementsOptions): cytoscape.ElementDefinition[] {
  const filteredNodes = graph.nodes.filter((n: GraphNode) => {
    if (!options.showTests && n.type === 'test') return false;
    if (!options.showFoundation && n.layerIndex === 0) return false;
    return true;
  });

  const nodeIds = new Set(filteredNodes.map((n: GraphNode) => n.id));

  // Compute in-degree: count of edges targeting each node (how many files depend on it)
  const inDegreeMap = new Map<string, number>();
  for (const e of graph.edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    inDegreeMap.set(e.target, (inDegreeMap.get(e.target) ?? 0) + 1);
  }

  // Create group (compound parent) nodes
  const groupNodes: cytoscape.ElementDefinition[] = [];
  const nodeParentMap = new Map<string, string>();
  const isCose = options.layoutMode === 'cose';

  if (graph.groups?.length) {
    const level0 = graph.groups.filter(g => g.level === 0 || !g.parentGroupId);
    const level1 = graph.groups.filter(g => g.level === 1 && g.parentGroupId);

    // Pre-compute visible descendant counts + colors per level-0 group
    const groupMeta = new Map<string, { visible: number; color: string; hasSubs: boolean }>();
    for (const group of level0) {
      const allDescendantIds = getAllDescendantNodeIds(group, graph.groups);
      const visibleCount = allDescendantIds.filter(id => nodeIds.has(id)).length;
      const color = getDominantColor(allDescendantIds, graph);
      const hasSubs = level1.some(s => s.parentGroupId === group.id);
      groupMeta.set(group.id, { visible: visibleCount, color, hasSubs });
    }

    // Add level-0 group nodes (skip oversized parents that have subgroups)
    const promotedParentIds = new Set<string>();
    for (const group of level0) {
      const meta = groupMeta.get(group.id)!;
      if (meta.visible < 2) continue;
      if (meta.visible > MAX_COMPOUND_SIZE && meta.hasSubs) {
        promotedParentIds.add(group.id);
        continue;
      }
      groupNodes.push({
        data: { id: group.id, label: group.label, type: 'group', level: 0, color: meta.color },
      });
    }

    if (isCose) {
      buildCoseGroups(level0, level1, groupNodes, nodeParentMap, nodeIds, promotedParentIds, groupMeta, graph);
    } else {
      buildDagreGroups(level0, level1, groupNodes, nodeParentMap, nodeIds, promotedParentIds, groupMeta);
    }
  }

  const nodes = filteredNodes.map((n: GraphNode) => ({
    data: {
      id: n.id,
      label: n.label,
      layer: n.layer,
      type: n.type,
      functions: n.functions,
      color: DEPTH_LAYER_COLORS[n.layerIndex ?? 0] ?? '#64748b',
      testLevel: n.testLevel ?? 'unit',
      icon: getFileIcon(n.id, n.type, n.testLevel),
      nodeSize: options.sizeMode === 'uniform' ? 36 : (n.size ?? 36),
      layerIndex: n.layerIndex ?? 0,
      fanIn: n.fanIn ?? 0,
      depth: n.depth ?? 0,
      inDegree: inDegreeMap.get(n.id) ?? 0,
      hubLabel: (inDegreeMap.get(n.id) ?? 0) > 10
        ? `${n.label}\n${inDegreeMap.get(n.id)} deps`
        : n.label,
      parent: nodeParentMap.get(n.id) ?? undefined,
    },
  }));

  const edges = graph.edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e, i) => ({
      data: {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        edgeType: e.type,
      },
    }));

  // Pre-compute aggregate edges between groups (hidden by default, shown on collapse)
  const emittedGroupIds = new Set(groupNodes.map(g => g.data.id as string));
  const aggregateEdges = computeAggregateEdges(graph, nodeIds, emittedGroupIds, groupNodes);

  return [...groupNodes, ...nodes, ...edges, ...aggregateEdges];
}

/** Flatten groups for force-directed (cose) layout — single-level compounds. */
function buildCoseGroups(
  level0: FileGroup[],
  level1: FileGroup[],
  groupNodes: cytoscape.ElementDefinition[],
  nodeParentMap: Map<string, string>,
  nodeIds: Set<string>,
  promotedParentIds: Set<string>,
  groupMeta: Map<string, { visible: number; color: string; hasSubs: boolean }>,
  graph: Graph,
): void {
  // Flatten: all files go directly into their level-0 parent
  for (const group of level0) {
    if (!groupNodes.find(g => g.data.id === group.id)) continue;
    const allDescendantIds = getAllDescendantNodeIds(group, graph.groups!);
    for (const nid of allDescendantIds) {
      if (nodeIds.has(nid)) nodeParentMap.set(nid, group.id);
    }
  }
  // Promoted parents in cose: subgroups become top-level groups
  for (const sub of level1) {
    if (!promotedParentIds.has(sub.parentGroupId!)) continue;
    const visibleChildren = sub.nodeIds.filter(id => nodeIds.has(id));
    if (visibleChildren.length < 2) continue;
    const parentColor = groupMeta.get(sub.parentGroupId!)?.color ?? '#64748b';
    groupNodes.push({
      data: { id: sub.id, label: sub.label, type: 'group', level: 0, color: parentColor },
    });
    for (const nid of visibleChildren) {
      nodeParentMap.set(nid, sub.id);
    }
  }
}

/** Build nested compound groups for hierarchical (dagre) layout. */
function buildDagreGroups(
  level0: FileGroup[],
  level1: FileGroup[],
  groupNodes: cytoscape.ElementDefinition[],
  nodeParentMap: Map<string, string>,
  nodeIds: Set<string>,
  promotedParentIds: Set<string>,
  groupMeta: Map<string, { visible: number; color: string; hasSubs: boolean }>,
): void {
  for (const sub of level1) {
    const visibleChildren = sub.nodeIds.filter(id => nodeIds.has(id));
    if (visibleChildren.length < 2) continue;

    if (promotedParentIds.has(sub.parentGroupId!)) {
      const parentColor = groupMeta.get(sub.parentGroupId!)?.color ?? '#64748b';
      groupNodes.push({
        data: { id: sub.id, label: sub.label, type: 'group', level: 0, color: parentColor },
      });
    } else {
      const parentNode = groupNodes.find(g => g.data.id === sub.parentGroupId);
      if (!parentNode) continue;
      groupNodes.push({
        data: {
          id: sub.id,
          label: sub.label,
          type: 'group',
          level: sub.level,
          parent: sub.parentGroupId,
          color: parentNode.data.color,
        },
      });
    }
    for (const nid of visibleChildren) {
      nodeParentMap.set(nid, sub.id);
    }
  }

  // Files not claimed by subgroups stay in parent group directly
  for (const group of level0) {
    if (!groupNodes.find(g => g.data.id === group.id)) continue;
    for (const nid of group.nodeIds) {
      if (nodeIds.has(nid) && !nodeParentMap.has(nid)) {
        nodeParentMap.set(nid, group.id);
      }
    }
  }
}

/**
 * Pre-computes aggregate edges between groups.
 * Each aggregate edge represents N real edges crossing a group boundary.
 * Built once, toggled via CSS classes on collapse/expand.
 */
function computeAggregateEdges(
  graph: Graph,
  nodeIds: Set<string>,
  emittedGroupIds: Set<string>,
  groupDefs: cytoscape.ElementDefinition[],
): cytoscape.ElementDefinition[] {
  if (!graph.groups?.length) return [];

  // Map every file to its outermost emitted group.
  // For each top-level emitted group (no emitted parent), recursively collect
  // all descendant nodes through the graph.groups hierarchy.
  // This handles both regular groups AND promoted subgroups (whose parent group
  // was removed due to MAX_COMPOUND_SIZE).
  const nodeToTopGroup = new Map<string, string>();

  for (const gdef of groupDefs) {
    const gid = gdef.data.id as string;
    const parent = gdef.data.parent as string | undefined;
    // Skip subgroups whose parent is also an emitted group — they're nested, not top-level
    if (parent && emittedGroupIds.has(parent)) continue;

    // Top-level group: collect all descendant nodes through graph.groups hierarchy
    const stack = [gid];
    while (stack.length) {
      const current = stack.pop()!;
      const graphGroup = graph.groups!.find(g => g.id === current);
      if (graphGroup) {
        for (const nodeId of graphGroup.nodeIds) {
          if (nodeIds.has(nodeId)) nodeToTopGroup.set(nodeId, gid);
        }
      }
      // Push child groups in the original hierarchy
      for (const g of graph.groups!) {
        if (g.parentGroupId === current) stack.push(g.id);
      }
    }
  }

  // Count cross-boundary edges per (source, target) pair
  const aggCounts = new Map<string, number>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;

    const srcGroup = nodeToTopGroup.get(edge.source);
    const tgtGroup = nodeToTopGroup.get(edge.target);

    // Skip intra-group edges
    if (srcGroup && srcGroup === tgtGroup) continue;
    // Skip if neither end is in a group
    if (!srcGroup && !tgtGroup) continue;

    const aggSrc = srcGroup ?? edge.source;
    const aggTgt = tgtGroup ?? edge.target;
    const key = `${aggSrc}\0${aggTgt}`;
    aggCounts.set(key, (aggCounts.get(key) ?? 0) + 1);
  }

  return Array.from(aggCounts.entries()).map(([key, count]) => {
    const [src, tgt] = key.split('\0');
    return {
      data: {
        id: `agg-${src}-${tgt}`,
        source: src,
        target: tgt,
        edgeType: 'aggregate',
        count,
        label: String(count),
      },
      classes: 'aggregate-edge',
    };
  });
}
