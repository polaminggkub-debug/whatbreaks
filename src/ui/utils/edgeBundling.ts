import type cytoscape from 'cytoscape';

/**
 * Hierarchical edge bundling with two convergence nodes per bundle:
 *
 *   sourceNodes ──→ srcConvergence ═══→ tgtConvergence ──→ targetNodes
 *     (src-branch)       (trunk: thick, count label)      (tgt-branch)
 *
 * 3-level abstraction:
 *   L1 Overview      — bundle visuals visible, original edges hidden
 *   L2 Group Focus   — unbundleGroup → originals shown for that group
 *   L3 Investigation — unbundleChain / unbundleImpact → originals shown
 *
 * Visual-only: never modifies graph.json or engine data.
 * Convergence nodes are fully non-interactive.
 */

interface BundleInfo {
  srcConvergenceId: string;
  tgtConvergenceId: string;
  srcBranchIds: string[];
  tgtBranchIds: string[];
  trunkId: string;
  originalEdgeIds: string[];
  count: number;
}

// Module state
let bundleMap = new Map<string, BundleInfo>();
let nodeBundles = new Map<string, Set<string>>();
let levelUnbundled = new Set<string>();

/**
 * Computes centroid position of a collection of nodes.
 */
function centroid(nodes: cytoscape.NodeSingular[]): { x: number; y: number } {
  let x = 0, y = 0;
  for (const n of nodes) {
    const pos = n.position();
    x += pos.x;
    y += pos.y;
  }
  const len = nodes.length || 1;
  return { x: x / len, y: y / len };
}

/**
 * Registers a node as participating in a bundle (for hover lookup).
 */
function registerNodeBundle(nodeId: string, bundleKey: string): void {
  let set = nodeBundles.get(nodeId);
  if (!set) {
    set = new Set();
    nodeBundles.set(nodeId, set);
  }
  set.add(bundleKey);
}

/**
 * Groups cross-group edges into hierarchical bundles post-layout.
 * Always clears previous bundling first (safe rebuild).
 */
export function applyEdgeBundling(instance: cytoscape.Core): void {
  clearBundling(instance);

  // Build parent lookup: nodeId → parentGroupId
  const nodeParent = new Map<string, string>();
  instance.nodes().not('[type="group"]').not('[type="convergence"]').forEach((n: cytoscape.NodeSingular) => {
    const parent = n.data('parent');
    if (parent) nodeParent.set(n.id(), parent);
  });

  // Bucket edges by (effectiveSrc, effectiveTgt) — cross-group only
  const buckets = new Map<string, cytoscape.EdgeSingular[]>();
  instance.edges().forEach((e: cytoscape.EdgeSingular) => {
    const srcId = e.source().id();
    const tgtId = e.target().id();
    const effectiveSrc = nodeParent.get(srcId) ?? srcId;
    const effectiveTgt = nodeParent.get(tgtId) ?? tgtId;

    if (effectiveSrc === effectiveTgt) return;
    if (!nodeParent.has(srcId) && !nodeParent.has(tgtId)) return;

    const key = `${effectiveSrc}::${effectiveTgt}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(e);
    else buckets.set(key, [e]);
  });

  const newElements: cytoscape.ElementDefinition[] = [];

  for (const [key, edges] of buckets) {
    if (edges.length < 2) continue;

    const count = edges.length;
    const bundleKey = `bundle::${key}`;

    // Collect unique source and target nodes
    const srcNodeMap = new Map<string, cytoscape.NodeSingular>();
    const tgtNodeMap = new Map<string, cytoscape.NodeSingular>();
    for (const e of edges) {
      const src = e.source();
      const tgt = e.target();
      srcNodeMap.set(src.id(), src);
      tgtNodeMap.set(tgt.id(), tgt);
    }

    const srcNodes = [...srcNodeMap.values()];
    const tgtNodes = [...tgtNodeMap.values()];
    const srcCentroid = centroid(srcNodes);
    const tgtCentroid = centroid(tgtNodes);

    // Cluster centroid convergence: convergence at file centroids with small offset.
    // Principle: edges converge where files are, not where group boundaries are.
    const NUDGE = 10;
    const dx = tgtCentroid.x - srcCentroid.x;
    const dy = tgtCentroid.y - srcCentroid.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    const srcConvPos = { x: srcCentroid.x + nx * NUDGE, y: srcCentroid.y + ny * NUDGE };
    const tgtConvPos = { x: tgtCentroid.x - nx * NUDGE, y: tgtCentroid.y - ny * NUDGE };

    // IDs for bundle elements
    const srcConvId = `conv-src::${key}`;
    const tgtConvId = `conv-tgt::${key}`;
    const trunkId = `trunk::${key}`;

    // Source convergence node
    newElements.push({
      group: 'nodes',
      data: {
        id: srcConvId,
        virtual: true,
        type: 'convergence',
        bundleKey,
      },
      position: { ...srcConvPos },
      selectable: false,
      grabbable: false,
      locked: true,
      pannable: false,
    } as cytoscape.ElementDefinition);

    // Target convergence node
    newElements.push({
      group: 'nodes',
      data: {
        id: tgtConvId,
        virtual: true,
        type: 'convergence',
        bundleKey,
      },
      position: { ...tgtConvPos },
      selectable: false,
      grabbable: false,
      locked: true,
      pannable: false,
    } as cytoscape.ElementDefinition);

    // Source branch edges: each unique source → srcConvergence
    const srcBranchIds: string[] = [];
    for (const [nodeId] of srcNodeMap) {
      const branchId = `sbr::${key}::${nodeId}`;
      srcBranchIds.push(branchId);
      newElements.push({
        group: 'edges',
        data: {
          id: branchId,
          source: nodeId,
          target: srcConvId,
          bundleType: 'src-branch',
          bundleKey,
        },
      });
      registerNodeBundle(nodeId, bundleKey);
    }

    // Trunk edge: srcConvergence → tgtConvergence
    const trunkWidth = 1.5 + 1.8 * Math.sqrt(count);
    const trunkOpacity = 0.4 + 0.15 * Math.min(1, Math.sqrt(count) / 5);
    newElements.push({
      group: 'edges',
      data: {
        id: trunkId,
        source: srcConvId,
        target: tgtConvId,
        bundleType: 'trunk',
        bundleKey,
        trunkWidth,
        trunkOpacity,
        label: `${count}`,
      },
    });

    // Target branch edges: tgtConvergence → each unique target
    const tgtBranchIds: string[] = [];
    for (const [nodeId] of tgtNodeMap) {
      const branchId = `tbr::${key}::${nodeId}`;
      tgtBranchIds.push(branchId);
      newElements.push({
        group: 'edges',
        data: {
          id: branchId,
          source: tgtConvId,
          target: nodeId,
          bundleType: 'tgt-branch',
          bundleKey,
        },
      });
      registerNodeBundle(nodeId, bundleKey);
    }

    // Hide original edges
    const originalEdgeIds: string[] = [];
    for (const e of edges) {
      e.data('bundleKey', bundleKey);
      e.addClass('bundle-hidden');
      originalEdgeIds.push(e.id());
    }

    // Store bundle info
    bundleMap.set(bundleKey, {
      srcConvergenceId: srcConvId,
      tgtConvergenceId: tgtConvId,
      srcBranchIds,
      tgtBranchIds,
      trunkId,
      originalEdgeIds,
      count,
    });
  }

  if (newElements.length > 0) {
    instance.add(newElements);
  }
}

/** Removes all bundling state — convergence nodes, bundle edges, classes. */
export function clearBundling(instance: cytoscape.Core): void {
  instance.nodes('[type="convergence"]').remove();
  instance.edges('[bundleType]').remove();
  instance.edges().removeClass('bundle-hidden');
  instance.edges().removeData('bundleKey');
  bundleMap = new Map();
  nodeBundles = new Map();
  levelUnbundled = new Set();
}

/** Hides bundle visuals and shows originals for one bundle key. */
function unbundleByKey(instance: cytoscape.Core, key: string): void {
  const info = bundleMap.get(key);
  if (!info) return;

  // Hide convergence nodes + bundle edges
  const ids = [info.srcConvergenceId, info.tgtConvergenceId, info.trunkId, ...info.srcBranchIds, ...info.tgtBranchIds];
  for (const id of ids) {
    const el = instance.getElementById(id);
    if (el.length) el.addClass('bundle-visual-hidden');
  }

  // Show original edges
  for (const id of info.originalEdgeIds) {
    const el = instance.getElementById(id);
    if (el.length) el.removeClass('bundle-hidden');
  }
}

/** Shows bundle visuals and hides originals for one bundle key. */
function rebundleByKey(instance: cytoscape.Core, key: string): void {
  const info = bundleMap.get(key);
  if (!info) return;

  // Show convergence nodes + bundle edges
  const ids = [info.srcConvergenceId, info.tgtConvergenceId, info.trunkId, ...info.srcBranchIds, ...info.tgtBranchIds];
  for (const id of ids) {
    const el = instance.getElementById(id);
    if (el.length) el.removeClass('bundle-visual-hidden');
  }

  // Hide original edges
  for (const id of info.originalEdgeIds) {
    const el = instance.getElementById(id);
    if (el.length) el.addClass('bundle-hidden');
  }
}

/** L1: Re-show all bundle visuals, re-hide originals. Clears levelUnbundled. */
export function restoreOverview(instance: cytoscape.Core): void {
  for (const key of bundleMap.keys()) {
    rebundleByKey(instance, key);
  }
  levelUnbundled.clear();
}

/** L2: Unbundle all bundles involving a specific group. */
export function unbundleGroup(instance: cytoscape.Core, groupId: string): void {
  for (const [key, info] of bundleMap) {
    // Check if this bundle connects from/to groupId
    const parts = key.replace('bundle::', '').split('::');
    if (parts[0] === groupId || parts[1] === groupId) {
      unbundleByKey(instance, key);
      levelUnbundled.add(key);
    }
  }
}

/** L3: Unbundle bundles whose original edges overlap the chain. */
export function unbundleChain(instance: cytoscape.Core, chainEdgeIds: Set<string>): void {
  for (const [key, info] of bundleMap) {
    const hasChainMember = info.originalEdgeIds.some(id => chainEdgeIds.has(id));
    if (hasChainMember) {
      unbundleByKey(instance, key);
      levelUnbundled.add(key);
    }
  }
}

/** L3: Unbundle bundles whose original edges are in the impact path. */
export function unbundleImpact(instance: cytoscape.Core): void {
  for (const [key, info] of bundleMap) {
    const hasImpactMember = info.originalEdgeIds.some(id => {
      const e = instance.getElementById(id);
      return e.length > 0 && (e.hasClass('impact-path') || e.hasClass('impact-path-indirect'));
    });
    if (hasImpactMember) {
      unbundleByKey(instance, key);
      levelUnbundled.add(key);
    }
  }
}

/** Hover: Temporarily unbundle all bundles involving this node. */
export function unbundleNode(instance: cytoscape.Core, nodeId: string): void {
  const keys = nodeBundles.get(nodeId);
  if (!keys) return;
  for (const key of keys) {
    if (!levelUnbundled.has(key)) {
      unbundleByKey(instance, key);
    }
  }
}

/** Hover end: Rebundle bundles for this node (unless L2/L3 unbundled). */
export function rebundleNode(instance: cytoscape.Core, nodeId: string): void {
  const keys = nodeBundles.get(nodeId);
  if (!keys) return;
  for (const key of keys) {
    if (!levelUnbundled.has(key)) {
      rebundleByKey(instance, key);
    }
  }
}
